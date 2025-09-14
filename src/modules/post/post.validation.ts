import z from "zod";
import { generalFields } from "../../middleware/validation.middleware";
import { fileValidation } from "../../utils/multer/cloud.multer";
import { AllowCommentsEnum, AvailabilityEnum, LikeActionEnum } from "../../DB/model/post.model";


export const createPost = {
    body: z
        .strictObject({

            content: z.string().min(2).max(500000).optional(),
            attachments: z
                .array(generalFields.file(fileValidation.image))
                .max(2)
                .optional(),
            availability: z.enum(AvailabilityEnum).default(AvailabilityEnum.public),
            allowComments: z.enum(AllowCommentsEnum).default(AllowCommentsEnum.allow),

            tags: z.array(generalFields.id).max(10).optional(),

        })
        .superRefine((data, ctx) => {
            if (!data.attachments?.length && !data.content) {
                ctx.addIssue({
                    code: "custom",
                    path: ["content"],
                    message: "sorry we cannot make post without content and attachments"
                })
            }
            if (data.tags?.length && data.tags.length !== [...new Set(data.tags)].length) {
                ctx.addIssue({
                    code: "custom",
                    path: ["tags"],
                    message: "Duplicated tagged users"
                })
            }
        })
}

export const likePost = {
    params: z.strictObject({
        postId: generalFields.id,
    }),
    query: z.strictObject({
        action: z.enum(LikeActionEnum).default(LikeActionEnum.like),
    })
}