"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.s3Event = void 0;
const stream_1 = require("stream");
const User_model_1 = require("../../DB/model/User.model");
const user_repository_1 = require("../../DB/repository/user.repository");
const s3_config_1 = require("./s3.config");
exports.s3Event = new stream_1.EventEmitter({});
exports.s3Event.on("trackProfileImageUpload", (data) => {
    console.log({ data });
    setTimeout(async () => {
        const userModel = new user_repository_1.UserRepository(User_model_1.UserModel);
        try {
            await (0, s3_config_1.getFile)({ Key: data.key });
            await userModel.updateOne({
                filter: { _id: data.userId },
                update: {
                    $unset: { temProfileImage: 1 },
                }
            });
            await (0, s3_config_1.deleteFile)({ Key: data.oldKey });
            console.log("Done");
        }
        catch (error) {
            console.log(error);
            if (error.Code === "NoSuchKey") {
                await userModel.updateOne({
                    filter: { _id: data.userId },
                    update: {
                        profileImage: data.oldKey,
                        $unset: { temProfileImage: 1 },
                    }
                });
            }
        }
    }, Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS) * 1000);
});
