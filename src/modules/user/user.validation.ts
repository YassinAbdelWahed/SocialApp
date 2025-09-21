import { z } from "zod";
import { LogoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";
import { generalFields } from "../../middleware/validation.middleware";
import { RoleEnum } from "../../DB/model";

export const logout = {
    body: z.strictObject({
        flag: z.enum(LogoutEnum).default(LogoutEnum.only)
    }),
};

export const changeRole = {
    params: z.strictObject({
        userId: generalFields.id
    }),
    body: z.strictObject({
        role: z.enum(RoleEnum),
    })
};

export const sendFriendRequest = {
    params: z.strictObject({
        userId: generalFields.id,
    })
}

export const acceptFriendRequest = {
    params: z.strictObject({
        requestId: generalFields.id,
    })
}

export const freezeAccount = {
    params: z.object({
        userId: z.string().optional(),
    }).optional().refine(
        (data) => {
            return data?.userId ? Types.ObjectId.isValid(data.userId) : true;
        },
        {
            error: "invalid objectId format",
            path: ["userId"],
        }
    ),
};

export const restoreAccount = {
    params: z.object({
        userId: z.string(),
    }).refine(
        (data) => {
            return Types.ObjectId.isValid(data.userId);
        },
        {
            error: "invalid objectId format",
            path: ["userId"],
        }
    ),
};

export const hardDelete = restoreAccount;