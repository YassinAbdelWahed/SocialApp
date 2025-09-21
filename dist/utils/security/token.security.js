"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRevokeToken = exports.decodeToken = exports.createLoginCrendentials = exports.getSignatures = exports.detectSignaturesLevel = exports.verifyToken = exports.generateToken = exports.LogoutEnum = exports.TokenEnum = exports.SignatureLevelEnum = void 0;
const uuid_1 = require("uuid");
const jsonwebtoken_1 = require("jsonwebtoken");
const User_model_1 = require("../../DB/model/User.model");
const repository_1 = require("../../DB/repository");
const error_response_1 = require("../response/error.response");
const User_model_2 = require("../../DB/model/User.model");
const repository_2 = require("../../DB/repository");
const Token_model_1 = require("../../DB/model/Token.model");
var SignatureLevelEnum;
(function (SignatureLevelEnum) {
    SignatureLevelEnum["bearer"] = "Bearer";
    SignatureLevelEnum["system"] = "System";
})(SignatureLevelEnum || (exports.SignatureLevelEnum = SignatureLevelEnum = {}));
var TokenEnum;
(function (TokenEnum) {
    TokenEnum["access"] = "access";
    TokenEnum["refresh"] = "refresh";
})(TokenEnum || (exports.TokenEnum = TokenEnum = {}));
var LogoutEnum;
(function (LogoutEnum) {
    LogoutEnum["only"] = "only";
    LogoutEnum["all"] = "all";
})(LogoutEnum || (exports.LogoutEnum = LogoutEnum = {}));
const generateToken = async ({ payload, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, options = { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) }, }) => {
    return (0, jsonwebtoken_1.sign)(payload, secret, options);
};
exports.generateToken = generateToken;
const verifyToken = async ({ token, secret = process.env.ACCESS_USER_TOKEN_SIGNATURE, }) => {
    return (0, jsonwebtoken_1.verify)(token, secret);
};
exports.verifyToken = verifyToken;
const detectSignaturesLevel = async (role = User_model_1.RoleEnum.user) => {
    let SignatureLevel = SignatureLevelEnum.bearer;
    switch (role) {
        case User_model_1.RoleEnum.admin:
        case User_model_1.RoleEnum.superAdmin:
            SignatureLevel = SignatureLevelEnum.system;
            break;
        default:
            SignatureLevel = SignatureLevelEnum.bearer;
            break;
    }
    return SignatureLevel;
};
exports.detectSignaturesLevel = detectSignaturesLevel;
const getSignatures = async (SignatureLevel = SignatureLevelEnum.bearer) => {
    let Signatures = {
        access_signature: "",
        refresh_signature: "",
    };
    switch (SignatureLevel) {
        case SignatureLevelEnum.system:
            Signatures.access_signature = process.env.ACCESS_SYSTEM_TOKEN_SIGNATURE;
            Signatures.refresh_signature = process.env.REFRESH_SYSTEM_TOKEN_SIGNATURE;
            break;
        default:
            Signatures.access_signature = process.env.ACCESS_USER_TOKEN_SIGNATURE;
            Signatures.refresh_signature = process.env.REFRESH_USER_TOKEN_SIGNATURE;
            break;
    }
    return Signatures;
};
exports.getSignatures = getSignatures;
const createLoginCrendentials = async (user) => {
    const SignatureLevel = await (0, exports.detectSignaturesLevel)(user.role);
    const Signatures = await (0, exports.getSignatures)(SignatureLevel);
    console.log(Signatures);
    const jwtid = (0, uuid_1.v4)();
    const access_token = await (0, exports.generateToken)({
        payload: { _id: user._id },
        secret: Signatures.access_signature,
        options: { expiresIn: Number(process.env.ACCESS_TOKEN_EXPIRES_IN), jwtid },
    });
    const refresh_token = await (0, exports.generateToken)({
        payload: { _id: user._id },
        secret: Signatures.refresh_signature,
        options: { expiresIn: Number(process.env.REFRESH_TOKEN_EXPIRES_IN), jwtid },
    });
    return { access_token, refresh_token };
};
exports.createLoginCrendentials = createLoginCrendentials;
const decodeToken = async ({ authorization, tokenType = TokenEnum.access, }) => {
    const userModel = new repository_1.UserRepository(User_model_2.UserModel);
    const tokenModel = new repository_2.TokenRepository(Token_model_1.TokenModel);
    const [bearerKey, token] = authorization.split(" ");
    if (!bearerKey || !token) {
        throw new error_response_1.UnauthorizedException("missing token parts");
    }
    const Signatures = await (0, exports.getSignatures)(bearerKey);
    const decoded = await (0, exports.verifyToken)({
        token,
        secret: tokenType === TokenEnum.refresh ? Signatures.refresh_signature : Signatures.access_signature,
    });
    if (!decoded?._id || !decoded?.iat) {
        throw new error_response_1.BadRequestException("Invalid token payload");
    }
    if (await tokenModel.findOne({ filter: { jti: decoded.jti } })) {
        throw new error_response_1.BadRequestException("Invalid or old login credentials");
    }
    const user = await userModel.findOne({ filter: { _id: decoded._id } });
    if (!user) {
        throw new error_response_1.BadRequestException("not register account");
    }
    if ((user.changeCredentialsTime?.getTime() || 0) > decoded.iat * 1000) {
        throw new error_response_1.UnauthorizedException("Invalid or old login credentials");
    }
    return { user, decoded };
};
exports.decodeToken = decodeToken;
const createRevokeToken = async (decoded) => {
    const tokenModel = new repository_2.TokenRepository(Token_model_1.TokenModel);
    const [result] = (await tokenModel.create({
        data: [
            {
                jti: decoded?.jti,
                expiresIn: decoded?.iat +
                    Number(process.env.REFRESH_TOKEN_EXPIRES_IN),
                userId: decoded?._id,
            },
        ],
    })) || [];
    if (!result) {
        throw new error_response_1.BadRequestException("fail to revoke this token");
    }
    return result;
};
exports.createRevokeToken = createRevokeToken;
