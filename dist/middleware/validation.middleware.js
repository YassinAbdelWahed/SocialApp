"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalFields = exports.graphValidation = exports.validation = void 0;
const zod_1 = require("zod");
const error_response_1 = require("../utils/response/error.response");
const mongoose_1 = require("mongoose");
const graphql_1 = require("graphql");
const validation = (schema) => {
    return (req, res, next) => {
        const validationError = [];
        for (const key of Object.keys(schema)) {
            if (!schema[key])
                continue;
            if (req.file) {
                req.body.attachment = req.file;
            }
            if (req.files) {
                req.body.attachments = req.files;
            }
            const validationResult = schema[key].safeParse(req[key]);
            if (!validationResult.success) {
                const errors = validationResult.error;
                validationError.push({
                    key,
                    issues: errors.issues.map((issues) => {
                        return { message: issues.message, path: issues.path };
                    }),
                });
            }
        }
        if (validationError.length) {
            throw new error_response_1.BadRequestException("validation Error", validationError);
        }
        return next();
    };
};
exports.validation = validation;
const graphValidation = async (schema, args) => {
    const validationResult = await schema.safeParseAsync(args);
    if (!validationResult.success) {
        const errors = validationResult.error;
        throw new graphql_1.GraphQLError("Validation Error", {
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
exports.graphValidation = graphValidation;
exports.generalFields = {
    username: zod_1.z.string().min(2).max(20),
    email: zod_1.z.email(),
    password: zod_1.z
        .string()
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&._-])[A-Za-z\d@$!%*?&._-]{8,16}$/),
    confirmPassword: zod_1.z.string(),
    otp: zod_1.z.string().regex(/^\d{6}$/),
    idToken: zod_1.z.string(),
    file: function (mimetype) {
        return zod_1.z
            .strictObject({
            fieldname: zod_1.z.string(),
            originalname: zod_1.z.string(),
            encoding: zod_1.z.string(),
            mimetype: zod_1.z.enum(mimetype),
            buffer: zod_1.z.any().optional(),
            path: zod_1.z.string().optional(),
            size: zod_1.z.number(),
        })
            .refine((data) => {
            return data.buffer || data.path;
        }, { error: "Neither Path Or Buffer Is Available", path: ["file"] });
    },
    id: zod_1.z.string().refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data);
    }, { error: "Invalid ObjectId Format" }),
};
