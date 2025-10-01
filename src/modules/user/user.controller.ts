import { Router } from "express";
import userService from "./user.service";
import { authentication, authorization } from "../../middleware/authentication.middleware";
import * as validators from "./user.validation"
import { validation } from "../../middleware/validation.middleware";
import { TokenEnum } from "../../utils/security/token.security";
import { cloudFileUpload, fileValidation, StorageEnum } from "../../utils/multer/cloud.multer";
import { endpoint } from "./user.authorization";
import { chatRouter } from "../chat";
const router = Router();

router.use("/:userId/chat", chatRouter)

router.get("/", authentication(), userService.profile)

router.get("/dashboard", authorization(endpoint.dashboard), userService.dashboard)

router.patch("/profile-image", authentication(),
    // cloudFileUpload({ validation: fileValidation.image, storageApproach: StorageEnum.disk }).single("image"),
    userService.profileImage)

router.patch("/profile-cover-image", authentication(), cloudFileUpload({ validation: fileValidation.image, storageApproach: StorageEnum.disk }).array("images", 2), userService.profileCoverImage)

router.post("/refresh-token", authentication(TokenEnum.refresh), userService.refreshToken)

router.post("/:userId/send-friend-request", authentication(), validation(validators.sendFriendRequest), userService.sendFriendRequest)

router.patch("/accept-friend-request/:requestId", authentication(), validation(validators.acceptFriendRequest), userService.acceptFriendRequest)

router.patch("/:userId/change-role", authorization(endpoint.dashboard), validation(validators.changeRole), userService.changeRole)

router.delete("{/:userId}/freeze-account", authentication(), validation(validators.freezeAccount), userService.freezeAccount);

router.patch("/:userId/restore-account", authorization(endpoint.restoreAccount), validation(validators.restoreAccount), userService.restoreAccount);

router.delete("/:userId/hard-delete-account", authorization(endpoint.hardDelete), validation(validators.hardDelete), userService.hardDeleteAccount);

router.post("/logout", authentication(), validation(validators.logout), userService.logout)

export default router