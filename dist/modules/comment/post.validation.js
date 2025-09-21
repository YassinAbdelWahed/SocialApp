"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.likePost = exports.updatePost = exports.createPost = void 0;
const zod_1 = __importDefault(require("zod"));
const validation_middleware_1 = require("../../middleware/validation.middleware");
const cloud_multer_1 = require("../../utils/multer/cloud.multer");
const post_model_1 = require("../../DB/model/post.model");
exports.createPost = {
    body: zod_1.default
        .strictObject({
        content: zod_1.default.string().min(2).max(500000).optional(),
        attachments: zod_1.default
            .array(validation_middleware_1.generalFields.file(cloud_multer_1.fileValidation.image))
            .max(2)
            .optional(),
        availability: zod_1.default.enum(post_model_1.AvailabilityEnum).default(post_model_1.AvailabilityEnum.public),
        allowComments: zod_1.default.enum(post_model_1.AllowCommentsEnum).default(post_model_1.AllowCommentsEnum.allow),
        tags: zod_1.default.array(validation_middleware_1.generalFields.id).max(10).optional(),
    })
        .superRefine((data, ctx) => {
        if (!data.attachments?.length && !data.content) {
            ctx.addIssue({
                code: "custom",
                path: ["content"],
                message: "sorry we cannot make post without content and attachments"
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "Duplicated tagged users"
            });
        }
    })
};
exports.updatePost = {
    params: zod_1.default.strictObject({
        postId: validation_middleware_1.generalFields.id,
    }),
    body: zod_1.default
        .strictObject({
        content: zod_1.default.string().min(2).max(500000).optional(),
        attachments: zod_1.default
            .array(validation_middleware_1.generalFields.file(cloud_multer_1.fileValidation.image))
            .max(2)
            .optional(),
        availability: zod_1.default.enum(post_model_1.AvailabilityEnum).optional(),
        allowComments: zod_1.default.enum(post_model_1.AllowCommentsEnum).optional(),
        tags: zod_1.default.array(validation_middleware_1.generalFields.id).max(10).optional(),
        removedTags: zod_1.default.array(validation_middleware_1.generalFields.id).max(10).optional(),
        removedAttachments: zod_1.default
            .array(zod_1.default.string())
            .max(2)
            .optional(),
    })
        .superRefine((data, ctx) => {
        if (!Object.values(data)?.length) {
            ctx.addIssue({
                code: "custom",
                message: "all fields are empty"
            });
        }
        if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["tags"],
                message: "some of tagged users are Duplicated"
            });
        }
        if (data.removedTags?.length && data.removedTags.length !== [...new Set(data.removedTags)].length) {
            ctx.addIssue({
                code: "custom",
                path: ["removedTags"],
                message: "some of tagged users are Duplicated"
            });
        }
    })
};
exports.likePost = {
    params: zod_1.default.strictObject({
        postId: validation_middleware_1.generalFields.id,
    }),
    query: zod_1.default.strictObject({
        action: zod_1.default.enum(post_model_1.LikeActionEnum).default(post_model_1.LikeActionEnum.like),
    })
};
