import { RoleEnum } from "../../DB/model";

export const endpoint = {
    profile: [RoleEnum.user],
    welcome: [RoleEnum.user,RoleEnum.admin],
    restoreAccount: [RoleEnum.admin],
    hardDelete: [RoleEnum.admin],
    dashboard: [RoleEnum.admin, RoleEnum.superAdmin]
}