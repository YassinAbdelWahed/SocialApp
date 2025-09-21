import { EventEmitter } from "stream";
import { HUserDocument, UserModel } from "../../DB/model/User.model";
import { UserRepository } from "../../DB/repository/user.repository";
import { deleteFile, getFile } from "./s3.config";
import { UpdateQuery } from "mongoose";
export const s3Event = new EventEmitter({});

s3Event.on("trackProfileImageUpload", (data) => {
    console.log({ data });

    setTimeout(async () => {
        const userModel = new UserRepository(UserModel);
        try {
            await getFile({ Key: data.key });
            await userModel.updateOne({
                filter: { _id: data.userId },
                update: {
                    $unset: { temProfileImage: 1 },
                }
            })

            await deleteFile({ Key: data.oldKey });
            console.log("Done")

        } catch (error: any) {
            console.log(error);
            if (error.Code === "NoSuchKey") {

                let unsetData: UpdateQuery<HUserDocument> = { temprofileImage: 1 };
                if (!data.oldKey) {
                    unsetData = { temprofileImage: 1, profileImage: 1 };
                }

                await userModel.updateOne({
                    filter: { _id: data.userId },
                    update: {
                        profileImage: data.oldKey,
                        $unset: unsetData,
                    }
                })
            }
        }
    }, Number(process.env.AWS_PRE_SIGNED_URL_EXPIRES_IN_SECONDS) * 1000)

})