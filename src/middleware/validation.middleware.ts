import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { ZodError, ZodType } from "zod";
import { BadRequestException } from "../utils/response/error.response";
import { Types } from "mongoose";
import { GraphQLError } from "graphql";

type KeyReqType = keyof Request;
type SchemaType = Partial<Record<KeyReqType, ZodType>>;
type ValidationErrorType = Array<{
  key: KeyReqType;
  issues: Array<{
    message: string;
    path: (string | number | symbol | undefined)[];
  }>;
}>;

export const validation = (schema: SchemaType) => {
  return (req: Request, res: Response, next: NextFunction): NextFunction => {
    const validationError: ValidationErrorType = [];
    for (const key of Object.keys(schema) as KeyReqType[]) {
      if (!schema[key]) continue;
      if (req.file) {
        req.body.attachment = req.file;
      }

      if (req.files) {
        req.body.attachments = req.files;
      }

      const validationResult = schema[key].safeParse(req[key]);
      if (!validationResult.success) {
        const errors = validationResult.error as ZodError;
        validationError.push({
          key,
          issues: errors.issues.map((issues) => {
            return { message: issues.message, path: issues.path };
          }),
        });
      }
    }

    if (validationError.length) {
      throw new BadRequestException("validation Error", validationError);
    }

    return next() as unknown as NextFunction;
  };
};

export const graphValidation = async <T = any>(schema: ZodType, args: T) => {
  const validationResult = await schema.safeParseAsync(args);
  if (!validationResult.success) {
    const errors = validationResult.error as ZodError;
    throw new GraphQLError("Validation Error", {
      extensions: {
        statusCode: 400,
        issues: {
          Key: "args",
          issues: errors.issues.map((issue) => {
            return { path: issue.path, message: issue.message };
          }),
        },
      },
    });
  }
};

export const generalFields = {
  username: z.string().min(2).max(20),
  email: z.email(),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,16}$/
    ),
  confirmPassword: z.string(),
  otp: z.string().regex(/^\d{6}$/),
  idToken: z.string(),
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
      })
      .refine(
        (data) => {
          return data.buffer || data.path;
        },
        { error: "Neither Path Or Buffer Is Available", path: ["file"] }
      );
  },
  id: z.string().refine(
    (data) => {
      return Types.ObjectId.isValid(data);
    },
    { error: "Invalid ObjectId Format" }
  ),
};