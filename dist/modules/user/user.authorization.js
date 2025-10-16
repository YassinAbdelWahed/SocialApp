"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endpoint = void 0;
const model_1 = require("../../DB/model");
exports.endpoint = {
    profile: [model_1.RoleEnum.user],
    welcome: [model_1.RoleEnum.user, model_1.RoleEnum.admin],
    restoreAccount: [model_1.RoleEnum.admin],
    hardDelete: [model_1.RoleEnum.admin],
    dashboard: [model_1.RoleEnum.admin, model_1.RoleEnum.superAdmin]
};
