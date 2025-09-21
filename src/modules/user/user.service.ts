import { Request, Response } from "express";
import { UserRepository } from "../../DB/repository/user.repository";
import { HUserDocument, RoleEnum, UserModel } from "../../DB/model/User.model";
import { IFreezeAccountDto, IHardDeleteAccountDto, ILogoutDto, IRestoreAccountDto } from "./user.dto";
import { Types, UpdateQuery } from "mongoose";
import { IUser } from "../../DB/model/User.model";
import { createLoginCrendentials, createRevokeToken, LogoutEnum } from "../../utils/security/token.security";
import { JwtPayload } from "jsonwebtoken";
import { uploadFiles, createPreSignedUploadLink, deleteFiles, deleteFolderByPrefix } from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.event";
import { successResponse } from "../../utils/response/success.response";
import { IProfileImageResponse, IUserResponse } from "./user.entities";
import { ILoginResponse } from "../auth/auth.entities";
import { friendRequestRepository, PostRepository } from "../../DB/repository";
import { FriendRequestModel, PostModel } from "../../DB/model";

class UserService {
    private userModel = new UserRepository(UserModel);
    private postModel = new PostRepository(PostModel);
    private friendRequestModel = new friendRequestRepository(FriendRequestModel);

    constructor() { }

    profileImage = async (req: Request, res: Response): Promise<Response> => {

        const {
            ContentType,
            Originalname,
        }: { ContentType: string; Originalname: string } = req.body;
        const { url, key } = await createPreSignedUploadLink({
            ContentType,
            Originalname,
            path: `users/${req.decoded?._id}`,
        });

        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: {
                profileImage: key,
                temprofileImage: req.user?.profileImage,
            }
        });

        if (!user) {
            throw new BadRequestException("Fail to update user Profile Image");
        }

        s3Event.emit("trackProfileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            key,
            expiresIn: 30000
        });

        return successResponse<IProfileImageResponse>({ res, data: { url } })
    };

    profileCoverImage = async (req: Request, res: Response): Promise<Response> => {

        const urls = await uploadFiles({
            storageApproach: StorageEnum.disk,
            files: req.files as Express.Multer.File[],
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        })

        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id as Types.ObjectId,
            update: {
                profileImage: urls,
            }
        });

        if (!user) {
            throw new BadRequestException("Fail to update user Profile Image");
        }

        if (req.user?.coverImage) {
            await deleteFiles({ urls: req.user.coverImage });
        }

        return successResponse<IUserResponse>({ res, data: { user } })
    };

    profile = async (req: Request, res: Response): Promise<Response> => {
        const profile = await this.userModel.findById({
            id: req.user?._id as Types.ObjectId,
            options: {
                populate: [
                    {
                        path: "friends",
                        select: "firstName lastName email gender profileImage",
                    }
                ]
            }
        })

        if (!profile) {
            throw new NotFoundException("fail to find your user profile")
        }

        return successResponse<IUserResponse>({ res, data: { user: profile } });
    };

    dashboard = async (req: Request, res: Response): Promise<Response> => {
        const results = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} })
        ])
        return successResponse({
            res,
            data: { results }
        });
    };

    changeRole = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const { role }: { role: RoleEnum } = req.body;
        const denyRoles: RoleEnum[] = [role, RoleEnum.superAdmin];
        if (req.user?.role === RoleEnum.admin) {
            denyRoles.push(RoleEnum.admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId as Types.ObjectId,
                role: { $nin: denyRoles },
            },
            update: {
                role,
            }
        })

        if (!user) {
            throw new NotFoundException("fail to find matching result")
        }

        return successResponse({
            res,
        });
    };

    sendFriendRequest = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as unknown as { userId: Types.ObjectId };
        const checkFriendRequestExist = await this.friendRequestModel.findOne({
            filter: {
                createdBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            },
        });
        if (checkFriendRequestExist) {
            throw new ConflictException("friend request already sent");
        }
        const user = await this.userModel.findOne({ filter: { _id: userId } })
        if (!user) {
            throw new NotFoundException("invalid recipient")
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [{
                createdBy: req.user?._id as Types.ObjectId,
                sendTo: userId,
            },
            ],
        })) || [];

        if (!friendRequest) {
            throw new BadRequestException("something went wrong")
        }

        return successResponse({
            res,
            statusCode: 201
        });
    };

    acceptFriendRequest = async (req: Request, res: Response): Promise<Response> => {
        const { requestId } = req.params as unknown as { requestId: Types.ObjectId };
        const friendRequest = await this.friendRequestModel.findOneAndUpdate({
            filter: {
                _id: requestId,
                acceptedAt: { $exists: false },
                sendTo: req.user?._id,
            },
            update: {
                acceptedAt: new Date(),
            }
        });
        if (!friendRequest) {
            throw new NotFoundException("fail to find matching result");
        }

        await Promise.all([
            await this.userModel.updateOne({
                filter: { _id: friendRequest.createdBy },
                update: {
                    $addToSet: { friends: friendRequest.sendTo },
                },
            }),

            await this.userModel.updateOne({
                filter: { _id: friendRequest.sendTo },
                update: {
                    $addToSet: { friends: friendRequest.createdBy },
                },
            }),

        ]);

        return successResponse({
            res,
        });
    };

    freezeAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = (req.params as IFreezeAccountDto) || {};
        if (userId && req.user?.role !== RoleEnum.admin) {
            throw new ForbiddenException("not authorized user");
        }

        const user = await this.userModel.updateOne({

            filter: {
                _id: userId || req.user?._id,
                freezedAt: { $exists: false },
            },
            update: {
                freezedAt: new Date(),
                freezedBy: req.user?._id,
                changeCredentialsTime: new Date(),
                $unset: {
                    restoredAt: 1,
                    restoredBy: 1,
                },
            },

        });
        if (!user.matchedCount) {
            throw new ForbiddenException("user not found or fail to delete this resource");
        }

        return successResponse({ res });

    }

    restoreAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IRestoreAccountDto;

        const user = await this.userModel.updateOne({

            filter: {
                _id: userId,
                freezedBy: { $ne: userId },
            },
            update: {
                restoredAt: new Date(),
                restoredBy: req.user?._id,
                $unset: {
                    freezedAt: 1,
                    freezedBy: 1,
                },
            },

        });
        if (!user.matchedCount) {
            throw new ForbiddenException("user not found or fail to restore this resource");
        }

        return successResponse({ res })

    }

    hardDeleteAccount = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IHardDeleteAccountDto;

        const user = await this.userModel.deleteOne({

            filter: {
                _id: userId,
                freezedBy: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new NotFoundException("user not found or fail to hard delete this resource");
        }

        await deleteFolderByPrefix({ path: `users/${userId}` });

        return successResponse({ res })

    }

    logout = async (req: Request, res: Response): Promise<Response> => {
        const { flag }: ILogoutDto = req.body;
        let statusCode: number = 200;
        const update: UpdateQuery<IUser> = {};

        switch (flag) {
            case LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;

            default:
                await createRevokeToken(req.decoded as JwtPayload);
                statusCode = 201;
                break;
        }

        await this.userModel.updateOne({
            filter: { _id: req.decoded?._id },
            update,
        });

        return successResponse({ res })

    };

    refreshToken = async (req: Request, res: Response): Promise<Response> => {

        const credentials = await createLoginCrendentials(req.user as HUserDocument);

        await createRevokeToken(req.decoded as JwtPayload);

        return successResponse<ILoginResponse>({ res, data: { credentials } });

    };

}

export default new UserService();