import type { Request, Response } from "express";
import { IConfirmEmailBodyInputsDto, ISignupBodyInputsDto, ILoginBodyInputsDto, IGmail, IForgotPasswordCodeInputsDto, IVerifyForgotPasswordCodeInputsDto, IResetForgotPasswordCodeInputsDto } from "./auth.dto";
import { ProviderEnum, UserModel } from "../../DB/model/User.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { BadRequestException, ConflictException, NotFoundException } from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/event/email.event";
import { generateNumberOtp } from "../../utils/security/otp";
import { createLoginCrendentials } from "../../utils/security/token.security";
import { OAuth2Client, TokenPayload } from "google-auth-library";
// import * as validators from "./auth.validation"
// import { BadRequestException } from "../../utils/response/error.response";


class AuthenticationService {
    private userModel = new UserRepository(UserModel);
    constructor() { }

    private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
        const client = new OAuth2Client();
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
        });
        const payload = ticket.getPayload();
        if (!payload?.email_verified) {
            throw new BadRequestException("fail to verify this google account");
        }
        return payload;
    }

    signup = async (req: Request, res: Response): Promise<Response> => {

        // const validationResult = validators.signup.body.safeParse(req.body)

        // if (!validationResult.success) {
        //     throw new BadRequestException("validation Error", {
        //         issues: JSON.parse(validationResult.error as unknown as string),
        //     });
        // }

        let { username, email, password }: ISignupBodyInputsDto = req.body;
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
            throw new ConflictException("Email Exists")
        }

        const otp = generateNumberOtp();

        const user = await this.userModel.createUser({
            data: [{ username, email, password: await generateHash(password), confirmEmailOtp: await generateHash(String(otp)) }],
        })

        emailEvent.emit("confirmEmail", { to: email, otp });
        console.log(email)

        return res.status(201).json({ message: "Done", data: { user } });
    };

    signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IGmail = req.body;
        const { email, family_name, given_name, picture } = await this.verifyGmailAccount(idToken);

        const user = await this.userModel.findOne({
            filter: {
                email,
            },
        });

        if (user) {
            if (user.provider === ProviderEnum.GOOGLE) {
                return await this.loginWithGmail(req, res);
            }
            throw new ConflictException(`Email exists with another provider ::: ${user.provider}`)
        }

        const [newUser] =
            (await this.userModel.create({
                data: [
                    {
                        firstName: given_name as string,
                        lastName: family_name as string,
                        email: email as string,
                        profileImage: picture as string,
                        confirmedAt: new Date(),
                        provider: ProviderEnum.GOOGLE,
                    }
                ]
            })) || []

        if (!newUser) {

            throw new BadRequestException("Fail to signup with gmail please try again later")
        }

        const credentials = await createLoginCrendentials(newUser);

        return res.status(201).json({ message: "Done", data: { credentials } })

    }

    loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
        const { idToken }: IGmail = req.body;
        const { email } = await this.verifyGmailAccount(idToken);

        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.GOOGLE
            },
        });

        if (!user) {
            throw new NotFoundException("Not register account or registered with another provider")
        }

        const credentials = await createLoginCrendentials(user);

        return res.json({ message: "Done", data: { credentials } })

    }

    login = async (req: Request, res: Response): Promise<Response> => {

        const { email, password }: ILoginBodyInputsDto = req.body;
        const user = await this.userModel.findOne({
            filter: { email, provider: ProviderEnum.SYSTEM },
        });

        if (!user) {
            throw new NotFoundException("Invalid Login Data")
        }

        if (!user.confirmedAt) {
            throw new BadRequestException("Verify Account First")
        }

        if (!(await compareHash(password, user.password))) {
            throw new NotFoundException("Invalid Login Data")
        }

        const credentials = await createLoginCrendentials(user);

        return res.json({ message: "Done", data: { credentials } });
    };

    confirmEmail = async (req: Request, res: Response): Promise<Response> => {
        const { email, otp }: IConfirmEmailBodyInputsDto = req.body;

        const user = await this.userModel.findOne({
            filter: {
                email,
                confirmEmailOtp: { $exists: true },
                confirmedAt: { $exists: false },
            },
        });
        if (!user) {
            throw new NotFoundException("Invalid Account")
        }

        if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
            throw new ConflictException("Invalid Confirmation Code");
        }
        await this.userModel.updateOne({
            filter: { email },
            update: {
                confirmedAt: new Date(),
                $unset: { confirmEmailOtp: 1 },
            },
        });
        return res.json({ message: "Done" });
    }

    sendForgotPasswordCode = async (req: Request, res: Response): Promise<Response> => {

        const { email }: IForgotPasswordCodeInputsDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                confirmedAt: { $exists: true },
            },
        });

        if (!user) {
            throw new NotFoundException("Invalid Account due to not registered yet or invalid provider or not confirmed yet")
        }

        const otp = generateNumberOtp();

        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                resetPasswordOtp: await generateHash(String(otp)),
            }
        });

        if (!result.matchedCount) {
            throw new BadRequestException("fail to send reset code ")
        }

        emailEvent.emit("resetPassword", { to: email, otp })

        return res.json({ message: "Done" });
    };

    verifyForgotPassword = async (req: Request, res: Response): Promise<Response> => {

        const { email, otp }: IVerifyForgotPasswordCodeInputsDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });

        if (!user) {
            throw new NotFoundException("Invalid Account due to not registered yet or invalid provider or not confirmed yet or missing password otp ")
        }

        if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
            throw new ConflictException("invalid otp");
        }

        return res.json({ message: "Done" });
    };

    resetForgotPassword = async (req: Request, res: Response): Promise<Response> => {

        const { email, otp, password }: IResetForgotPasswordCodeInputsDto = req.body;
        const user = await this.userModel.findOne({
            filter: {
                email,
                provider: ProviderEnum.SYSTEM,
                resetPasswordOtp: { $exists: true },
            },
        });

        if (!user) {
            throw new NotFoundException("Invalid Account due to not registered yet or invalid provider or not confirmed yet or missing password otp ")
        }

        if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
            throw new ConflictException("invalid otp");
        }

        const result = await this.userModel.updateOne({
            filter: { email },
            update: {
                password: await generateHash(password),
                changeCredentialsTime: new Date(),
                $unset: { resetPasswordOtp: 1 },
            }
        });

        if (!result.matchedCount) {
            throw new BadRequestException("fail to reset account password ")
        }

        return res.json({ message: "Done" });
    };

}

export default new AuthenticationService();