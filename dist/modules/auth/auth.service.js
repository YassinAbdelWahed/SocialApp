"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const User_model_1 = require("../../DB/model/User.model");
const repository_1 = require("../../DB/repository");
const error_response_1 = require("../../utils/response/error.response");
const hash_security_1 = require("../../utils/security/hash.security");
const email_event_1 = require("../../utils/event/email.event");
const otp_1 = require("../../utils/security/otp");
const token_security_1 = require("../../utils/security/token.security");
const google_auth_library_1 = require("google-auth-library");
const success_response_1 = require("../../utils/response/success.response");
class AuthenticationService {
    userModel = new repository_1.UserRepository(User_model_1.UserModel);
    constructor() { }
    async verifyGmailAccount(idToken) {
        const client = new google_auth_library_1.OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new error_response_1.BadRequestException("fail to verify this google account");
        }
        return payload;
    }
    signup = async (req, res) => {
        let { username, email, password } = req.body;
        console.log({ username, email, password });
        const checkUserExist = await this.userModel.findOne({
            filter: { email },
            select: "email",
            options: {
                lean: true,
            },
        });
        console.log({ checkUserExist });
        if (checkUserExist) {
            throw new error_response_1.ConflictException("Email Exists");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        await this.userModel.createUser({
            data: [{ username, email, password, confirmEmailOtp: `${otp}` }], options: { validateBeforeSave: true },
        });
        return (0, success_response_1.successResponse)({ res, statusCode: 201 });
    };
    signupWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
            },
        });
        if (user) {
            if (user.provider === User_model_1.ProviderEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new error_response_1.ConflictException(`Email exists with another provider ::: ${user.provider}`);
        }
        const [newUser] = (await this.userModel.create({
            data: [
                {
                    firstName: given_name,
                    lastName: family_name,
                    email: email,
                    profileImage: picture,
                    confirmedAt: new Date(),
                    provider: User_model_1.ProviderEnum.GOOGLE,
                }
            ]
        })) || [];
        if (!newUser) {
            throw new error_response_1.BadRequestException("Fail to signup with gmail please try again later");
        }
        const credentials = await (0, token_security_1.createLoginCrendentials)(newUser);
        return (0, success_response_1.successResponse)({ res, statusCode: 201, data: { credentials } });
    };
    loginWithGmail = async (req, res) => {
        const { idToken } = req.body;
        const { email } = await this.verifyGmailAccount(idToken);
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.GOOGLE
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Not register account or registered with another provider");
        }
        const credentials = await (0, token_security_1.createLoginCrendentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    login = async (req, res) => {
        const { email, password } = req.body;
        const user = await this.userModel.findOne({
            filter: { email, provider: User_model_1.ProviderEnum.SYSTEM },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid Login Data");
        }
        if (!user.confirmedAt) {
            throw new error_response_1.BadRequestException("Verify Account First");
        }
        if (!(await (0, hash_security_1.compareHash)(password, user.password))) {
            throw new error_response_1.NotFoundException("Invalid Login Data");
        }
        const credentials = await (0, token_security_1.createLoginCrendentials)(user);
        return (0, success_response_1.successResponse)({ res, data: { credentials } });
    };
    confirmEmail = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid Account");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.confirmEmailOtp))) {
            throw new error_response_1.ConflictException("Invalid Confirmation Code");
        }
        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmedAt: new Date(),
                $unset: { confirmEmailOtp: 1 },
            },
        });
        return (0, success_response_1.successResponse)({ res });
    };
    sendForgotPasswordCode = async (req, res) => {
        const { email } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid Account due to not registered yet or invalid provider or not confirmed yet");
        }
        const otp = (0, otp_1.generateNumberOtp)();
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                resetPasswordOtp: await (0, hash_security_1.generateHash)(String(otp)),
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("fail to send reset code ");
        }
        email_event_1.emailEvent.emit("resetPassword", { to: email, otp });
        return (0, success_response_1.successResponse)({ res });
    };
    verifyForgotPassword = async (req, res) => {
        const { email, otp } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid Account due to not registered yet or invalid provider or not confirmed yet or missing password otp ");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("invalid otp");
        }
        return (0, success_response_1.successResponse)({ res });
    };
    resetForgotPassword = async (req, res) => {
        const { email, otp, password } = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: User_model_1.ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });
        if (!user) {
            throw new error_response_1.NotFoundException("Invalid Account due to not registered yet or invalid provider or not confirmed yet or missing password otp ");
        }
        if (!(await (0, hash_security_1.compareHash)(otp, user.resetPasswordOtp))) {
            throw new error_response_1.ConflictException("invalid otp");
        }
        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await (0, hash_security_1.generateHash)(password),
                changeCredentialsTime: new Date(),
                $unset: { resetPasswordOtp: 1 },
            }
        });
        if (!result.matchedCount) {
            throw new error_response_1.BadRequestException("fail to reset account password ");
        }
        return (0, success_response_1.successResponse)({ res });
    };
}
exports.default = new AuthenticationService();
