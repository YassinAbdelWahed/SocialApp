"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDelete = exports.restoreAccount = exports.freezeAccount = exports.acceptFriendRequest = exports.sendFriendRequest = exports.changeRole = exports.logout = void 0;
const zod_1 = require("zod");
const token_security_1 = require("../../utils/security/token.security");
const mongoose_1 = require("mongoose");
const validation_middleware_1 = require("../../middleware/validation.middleware");
const model_1 = require("../../DB/model");
exports.logout = {
    body: zod_1.z.strictObject({
        flag: zod_1.z.enum(token_security_1.LogoutEnum).default(token_security_1.LogoutEnum.only)
    }),
};
exports.changeRole = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id
    }),
    body: zod_1.z.strictObject({
        role: zod_1.z.enum(model_1.RoleEnum),
    })
};
exports.sendFriendRequest = {
    params: zod_1.z.strictObject({
        userId: validation_middleware_1.generalFields.id,
    })
};
exports.acceptFriendRequest = {
    params: zod_1.z.strictObject({
        requestId: validation_middleware_1.generalFields.id,
    })
};
exports.freezeAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string().optional(),
    }).optional().refine((data) => {
        return data?.userId ? mongoose_1.Types.ObjectId.isValid(data.userId) : true;
    }, {
        error: "invalid objectId format",
        path: ["userId"],
    }),
};
exports.restoreAccount = {
    params: zod_1.z.object({
        userId: zod_1.z.string(),
    }).refine((data) => {
        return mongoose_1.Types.ObjectId.isValid(data.userId);
    }, {
        error: "invalid objectId format",
        path: ["userId"],
    }),
};
exports.hardDelete = exports.restoreAccount;
