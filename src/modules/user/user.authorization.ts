import { RoleEnum } from "../../DB/model/User.model";

export const endpoint = {
    profile: [RoleEnum.user],
    restoreAccount: [RoleEnum.admin],
    hardDelete: [RoleEnum.admin]
}