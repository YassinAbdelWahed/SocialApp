import { v4 as uuid } from 'uuid'
import type { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { sign, verify } from "jsonwebtoken";
import { RoleEnum, HUserDocument } from "../../DB/model/User.model";
import { UserRepository } from "../../DB/repository";
import { BadRequestException, UnauthorizedException } from "../response/error.response";
import { UserModel } from "../../DB/model/User.model";
import { TokenRepository } from '../../DB/repository';
import { HTokenDocument, TokenModel } from '../../DB/model/Token.model';

export enum SignatureLevelEnum {
    bearer = "Bearer",
    system = "System"

}

export enum TokenEnum {
    access = "access",
    refresh = "refresh"

}

export enum LogoutEnum {
    only = "only",
    all = "all"

}

export const generateToken = async ({
    payload,
    secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
    options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) },
}: {
    payload: object;
    secret?: Secret;
    options?: SignOptions;
}): Promise<string> => {
    return sign(payload, secret, options);
};

export const verifyToken = async ({
    token,
    secret = process.env.ACCESS_USER_TOKEN_SIGNATURE as string,
}: {
    token: string;
    secret?: Secret;
}): Promise<JwtPayload> => {
    return verify(token, secret) as JwtPayload;
}

export const detectSignaturesLevel = async (
    role: RoleEnum = RoleEnum.user
): Promise<SignatureLevelEnum> => {
    let SignatureLevel: SignatureLevelEnum = SignatureLevelEnum.bearer;

    switch (role) {
        case RoleEnum.admin:
        case RoleEnum.superAdmin:
            SignatureLevel = SignatureLevelEnum.system;
            break;

        default:
            SignatureLevel = SignatureLevelEnum.bearer;
            break;
    }

    return SignatureLevel
}

export const getSignatures = async (
    SignatureLevel: SignatureLevelEnum = SignatureLevelEnum.bearer
): Promise<{ access_signature: string; refresh_signature: string }> => {
    let Signatures: { access_signature: string; refresh_signature: string } = {
        access_signature: "",
        refresh_signature: "",
    };

    switch (SignatureLevel) {
        case SignatureLevelEnum.system:
            Signatures.access_signature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE as string;
            Signatures.refresh_signature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE as string;
            break;

        default:
            Signatures.access_signature = process.env.ACCESS_USER_TOKEN_SIGNATURE as string;
            Signatures.refresh_signature = process.env.REFRESH_USER_TOKEN_SIGNATURE as string;
            break;
    }

    return Signatures;

}

export const createLoginCrendentials = async (user: HUserDocument) => {
    const SignatureLevel = await detectSignaturesLevel(user.role);
    const Signatures = await getSignatures(SignatureLevel);
    console.log(Signatures);

    const jwtid = uuid();

    const access_token = await generateToken({
        payload: { _id: user._id },
        secret: Signatures.access_signature,
        options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid },
    });

    const refresh_token = await generateToken({
        payload: { _id: user._id },
        secret: Signatures.refresh_signature,
        options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid },
    });

    return { access_token, refresh_token };
}

export const decodeToken = async ({
    authorization,
    tokenType = TokenEnum.access,
}: {
    authorization: string;
    tokenType?: TokenEnum;
}) => {
    const userModel = new UserRepository(UserModel);
    const tokenModel = new TokenRepository(TokenModel);
    const [bearerKey, token] = authorization.split(" ");
    if (!bearerKey || !token) {
        throw new UnauthorizedException("missing token parts")
    }

    const Signatures = await getSignatures(bearerKey as SignatureLevelEnum);
    const decoded = await verifyToken({
        token,
        secret:
            tokenType === TokenEnum.refresh ? Signatures.refresh_signature : Signatures.access_signature,
    });

    if (!decoded?._id || !decoded?.iat) {
        throw new BadRequestException("Invalid token payload")
    }

    if (await tokenModel.findOne({ filter: { jti: decoded.jti } })) {
        throw new BadRequestException("Invalid or old login credentials");
    }

    const user = await userModel.findOne({ filter: { _id: decoded._id } });

    if (!user) {
        throw new BadRequestException("not register account")
    }

    if ((user.changeCredentialsTime?.getTime() || 0) > decoded.iat * 1000) {
        throw new UnauthorizedException("Invalid or old login credentials")
    }

    return { user, decoded };
};

export const createRevokeToken = async (
    decoded: JwtPayload
): Promise<HTokenDocument> => {
    const tokenModel = new TokenRepository(TokenModel);

    const [result] =
        (await tokenModel.create({
            data: [
                {
                    jti: decoded?.jti as string,
                    expiresIn:
                        (decoded?.iat as number) +
                        Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                    userId: decoded?._id,
                },
            ],
        })) || [];

    if (!result) {
        throw new BadRequestException("fail to revoke this token");
    }

    return result;

}