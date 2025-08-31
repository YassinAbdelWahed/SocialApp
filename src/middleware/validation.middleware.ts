import type { NextFunction, Request, Response } from "express";
import { type ZodError, type ZodType } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { z } from "zod"


type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;

type validationErrorsType = Array<{
    key: KeyReqType;
    issues: Array<{
        message: string;
        path: string | number | symbol | undefined;
    }>;
}>;

export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction): NextFunction => {
        const validationErrors: validationErrorsType = [];

        for (const key of Object.keys(schema) as KeyReqType[]) {
            if (!schema[key]) continue;

            const validationResult = schema[key].safeParse(req[key]);

            if (!validationResult.success) {
                const errors = validationResult.error as ZodError;


                validationErrors.push({
                    key,
                    issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path[0] };
                    })
                })
            }
        }

        if (validationErrors.length) {
            throw new BadRequestException("Validation Error", {
                validationErrors,
            });
        }

        return next() as unknown as NextFunction;

    };
};

export const generalFields = {
    username: z.string({
        error: "username is required",
    }).min(
        2,
        { error: "min length is 2 char" }
    ).max(
        20,
        { error: "min length is 20 char" }
    ),
    email: z.email({ error: "valid email must be like to example@domain.com" }),
    otp: z.string().regex(/^\d{6}$/),
    password: z.string().regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
    confirmPassword: z.string()
}