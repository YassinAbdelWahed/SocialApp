import type { NextFunction, Request, Response } from "express";
import { type ZodError, type ZodType } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { z } from "zod"
import { Types } from "mongoose";


type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;

type validationErrorsType = Array<{
    key: KeyReqType;
    issues: Array<{
        message: string;
        path: (string | number | symbol | undefined)[];
    }>;
}>;

export const validation = (schema: SchemaType) => {
    return (req: Request, res: Response, next: NextFunction): NextFunction => {
        const validationErrors: validationErrorsType = [];

        for (const key of Object.keys(schema) as KeyReqType[]) {
            if (!schema[key]) continue;

            if (req.file) {
                req.body.attachment = req.file;
            }

            if (req.files) {
                // console.log(req.files)
                req.body.attachments = req.files;
            }

            const validationResult = schema[key].safeParse(req[key]);

            if (!validationResult.success) {
                const errors = validationResult.error as ZodError;


                validationErrors.push({
                    key,
                    issues: errors.issues.map((issue) => {
                        return { message: issue.message, path: issue.path };
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
    confirmPassword: z.string(),
    file: function (mimetype: string[]) {
        return z
            .strictObject({
                fieldname: z.string(),
                originalname: z.string(),
                encoding: z.string(),
                mimetype: z.enum(mimetype),
                buffer: z.any().optional(),
                path: z.string().optional(),
                size: z.number(),
                destination: z.string().optional(),
                filename: z.string().optional(),
            })
            .refine(
                (data) => {
                    return data.buffer || data.path;
                },
                { error: "nither path or buffer is available ", path: ["file"] }
            );
    },
    id: z.string().refine(
        (data) => {
            return Types.ObjectId.isValid(data);
        },
        { error: "invalid objectId format" }
    )
};