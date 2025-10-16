"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const user_repository_1 = require("../../DB/repository/user.repository");
const model_1 = require("../../DB/model");
const token_security_1 = require("../../utils/security/token.security");
const s3_config_1 = require("../../utils/multer/s3.config");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const error_response_1 = require("../../utils/response/error.response");
const s3_event_1 = require("../../utils/multer/s3.event");
const success_response_1 = require("../../utils/response/success.response");
const repository_1 = require("../../DB/repository");
const model_2 = require("../../DB/model");
const graphql_1 = require("graphql");
let users = [
    {
        id: 1,
        name: "yassin",
        email: "yassin@gmail.com",
        gender: model_1.GenderEnum.male,
        password: "12345",
        followers: [],
    },
    {
        id: 2,
        name: "mohammed",
        email: "mohammed@gmail.com",
        gender: model_1.GenderEnum.male,
        password: "12345",
        followers: [],
    },
    {
        id: 3,
        name: "sara",
        email: "sara@gmail.com",
        gender: model_1.GenderEnum.female,
        password: "12345",
        followers: [],
    },
    {
        id: 4,
        name: "haya",
        email: "haya@gmail.com",
        gender: model_1.GenderEnum.female,
        password: "12345",
        followers: [],
    },
];
class UserService {
    chatmodel = new repository_1.ChatRepository(model_2.ChatModel);
    userModel = new user_repository_1.UserRepository(model_1.UserModel);
    postModel = new repository_1.PostRepository(model_2.PostModel);
    friendRequestModel = new repository_1.friendRequestRepository(model_2.FriendRequestModel);
    constructor() { }
    profileImage = async (req, res) => {
        const { ContentType, Originalname, } = req.body;
        const { url, key } = await (0, s3_config_1.createPreSignedUploadLink)({
            ContentType,
            Originalname,
            path: `users/${req.decoded?._id}`,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                profileImage: key,
                temprofileImage: req.user?.profileImage,
            }
        });
        if (!user) {
            throw new error_response_1.BadRequestException("Fail to update user Profile Image");
        }
        s3_event_1.s3Event.emit("trackProfileImageUpload", {
            userId: req.user?._id,
            oldKey: req.user?.profileImage,
            key,
            expiresIn: 30000
        });
        return (0, success_response_1.successResponse)({ res, data: { url } });
    };
    profileCoverImage = async (req, res) => {
        const urls = await (0, s3_config_1.uploadFiles)({
            storageApproach: cloud_multer_1.StorageEnum.disk,
            files: req.files,
            path: `users/${req.decoded?._id}/cover`,
            useLarge: true,
        });
        const user = await this.userModel.findByIdAndUpdate({
            id: req.user?._id,
            update: {
                profileImage: urls,
            }
        });
        if (!user) {
            throw new error_response_1.BadRequestException("Fail to update user Profile Image");
        }
        if (req.user?.coverImage) {
            await (0, s3_config_1.deleteFiles)({ urls: req.user.coverImage || [] });
        }
        return (0, success_response_1.successResponse)({
            res, data: {
                user,
            }
        });
    };
    profile = async (req, res) => {
        const user = await this.userModel.findById({
            id: req.user?._id,
            options: {
                populate: [
                    {
                        path: "friends",
                        select: "firstName lastName email gender profileImage",
                    }
                ]
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("fail to find your user profile");
        }
        const groups = await this.chatmodel.find({
            filter: {
                participants: {
                    $in: req.user?._id
                },
                group: {
                    $exists: true
                },
            }
        });
        return (0, success_response_1.successResponse)({ res, data: { user, groups } });
    };
    dashboard = async (req, res) => {
        const results = await Promise.allSettled([
            this.userModel.find({ filter: {} }),
            this.postModel.find({ filter: {} })
        ]);
        return (0, success_response_1.successResponse)({
            res,
            data: { results }
        });
    };
    changeRole = async (req, res) => {
        const { userId } = req.params;
        const { role } = req.body;
        const denyRoles = [role, model_1.RoleEnum.superAdmin];
        if (req.user?.role === model_1.RoleEnum.admin) {
            denyRoles.push(model_1.RoleEnum.admin);
        }
        const user = await this.userModel.findOneAndUpdate({
            filter: {
                _id: userId,
                role: { $nin: denyRoles },
            },
            update: {
                role,
            }
        });
        if (!user) {
            throw new error_response_1.NotFoundException("fail to find matching result");
        }
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    sendFriendRequest = async (req, res) => {
        const { userId } = req.params;
        const checkFriendRequestExist = await this.friendRequestModel.findOne({
            filter: {
                createdBy: { $in: [req.user?._id, userId] },
                sendTo: { $in: [req.user?._id, userId] },
            },
        });
        if (checkFriendRequestExist) {
            throw new error_response_1.ConflictException("friend request already sent");
        }
        const user = await this.userModel.findOne({ filter: { _id: userId } });
        if (!user) {
            throw new error_response_1.NotFoundException("invalid recipient");
        }
        const [friendRequest] = (await this.friendRequestModel.create({
            data: [{
                    createdBy: req.user?._id,
                    sendTo: userId,
                },
            ],
        })) || [];
        if (!friendRequest) {
            throw new error_response_1.BadRequestException("something went wrong");
        }
        return (0, success_response_1.successResponse)({
            res,
            statusCode: 201
        });
    };
    acceptFriendRequest = async (req, res) => {
        const { requestId } = req.params;
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
            throw new error_response_1.NotFoundException("fail to find matching result");
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
        return (0, success_response_1.successResponse)({
            res,
        });
    };
    freezeAccount = async (req, res) => {
        const { userId } = req.params || {};
        if (userId && req.user?.role !== model_1.RoleEnum.admin) {
            throw new error_response_1.ForbiddenException("not authorized user");
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
            throw new error_response_1.ForbiddenException("user not found or fail to delete this resource");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    restoreAccount = async (req, res) => {
        const { userId } = req.params;
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
            throw new error_response_1.ForbiddenException("user not found or fail to restore this resource");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    hardDeleteAccount = async (req, res) => {
        const { userId } = req.params;
        const user = await this.userModel.deleteOne({
            filter: {
                _id: userId,
                freezedBy: { $exists: true },
            },
        });
        if (!user.deletedCount) {
            throw new error_response_1.NotFoundException("user not found or fail to hard delete this resource");
        }
        await (0, s3_config_1.deleteFolderByPrefix)({ path: `users/${userId}` });
        return (0, success_response_1.successResponse)({ res });
    };
    logout = async (req, res) => {
        const { flag } = req.body;
        let statusCode = 200;
        const update = {};
        switch (flag) {
            case token_security_1.LogoutEnum.all:
                update.changeCredentialsTime = new Date();
                break;
            default:
                await (0, token_security_1.createRevokeToken)(req.decoded);
                statusCode = 201;
                break;
        }
        await this.userModel.updateOne({
            filter: { _id: req.decoded?._id },
            update,
        });
        return (0, success_response_1.successResponse)({ res });
    };
    refreshToken = async (req, res) => {
        const credentials = await (0, token_security_1.createLoginCrendentials)(req.user);
        await (0, token_security_1.createRevokeToken)(req.decoded);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    welcome = (user) => {
        console.log({ s: user });
        return "Hello";
    };
    allUsers = async (args, authUser) => {
        return await this.userModel.find({
            filter: { _id: { $ne: authUser._id }, gender: args.gender }
        });
    };
    searchUsers = (args) => {
        const user = users.find((ele) => ele.email === args.email);
        if (!user) {
            throw new graphql_1.GraphQLError("fail to find matching result", {
                extensions: { statusCode: 404 }
            });
        }
        return { message: "Done", statusCode: 200, data: user };
    };
    addFollower = (args) => {
        users = users.map((ele) => {
            if (ele.id === args.friendId) {
                ele.followers.push(args.myId);
            }
            return ele;
        });
        return users;
    };
}
exports.UserService = UserService;
exports.default = new UserService();
