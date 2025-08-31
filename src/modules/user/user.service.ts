import { Request, Response } from "express";
import { UserRepository } from "../../DB/repository/user.repository";
import { HUserDocument, UserModel } from "../../DB/model/User.model";
import { ILogoutDto } from "./user.dto";
import { UpdateQuery } from "mongoose";
import { IUser } from "../../DB/model/User.model";
import { createLoginCrendentials, createRevokeToken, LogoutEnum } from "../../utils/security/token.security";
import { JwtPayload } from "jsonwebtoken";

class UserService {
    private userModel = new UserRepository(UserModel);
    constructor() { }

    profile = async (req: Request, res: Response): Promise<Response> => {
        return res.json({
            message: "Done",
            data: {
                user: req.user?._id,
                decoded: req.decoded?._iat,
            },
        });
    };

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

        return res.status(statusCode).json({
            message: "Done",
        });

    };

    refreshToken = async (req: Request, res: Response): Promise<Response> => {

        const credentials = await createLoginCrendentials(req.user as HUserDocument);

        await createRevokeToken(req.decoded as JwtPayload);

        return res.status(201).json({ message: "Done", data: { credentials } });

    };

}

export default new UserService();