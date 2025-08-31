// export interface ISignupBodyInputsDto {
//     username: string;
//     email: string;
//     password: string;
// }

import * as validators from "./auth.validation";
import { z } from "zod"

export type ISignupBodyInputsDto = z.infer<typeof validators.signup.body>;
export type IConfirmEmailBodyInputsDto = z.infer<typeof validators.confirmEmail.body>;
export type ILoginBodyInputsDto = z.infer<typeof validators.login.body>;
export type IGmail = z.infer<typeof validators.signupWithGmail.body>;
export type IForgotPasswordCodeInputsDto = z.infer<typeof validators.sendForgotPasswordCode.body>;
export type IVerifyForgotPasswordCodeInputsDto = z.infer<typeof validators.verifyForgotPassword.body>;
export type IResetForgotPasswordCodeInputsDto = z.infer<typeof validators.resetForgotPassword.body>;