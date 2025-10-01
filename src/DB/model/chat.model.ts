import { HydratedDocument, model, models, Schema, Types } from "mongoose";

export interface IMessage {

    content: string;
    createdBy: Types.ObjectId;

    createdAt?: Date;
    updatedAt?: Date;
}

export type HMessageDocument = HydratedDocument<IMessage>;

export interface IChat {

    participants: Types.ObjectId[];
    messages: IMessage[];

    group?: string;
    group_image?: string;
    roomId?: string;

    createdBy: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
}

export type HChatDocument = HydratedDocument<IChat>;

const messageSchema = new Schema<IMessage>(
    {

        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true, minLength: 2, maxLength: 25 },
    },
    {
        timestamps: true,
    }
)

const chatSchema = new Schema<IChat>(
    {

        participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
        createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        group: { type: String },
        group_image: { type: String },
        messages: [messageSchema],
        roomId: {
            type: String,
            required: function () {
                return this.roomId;
            }
        }


    },
    {
        timestamps: true,
    }
)

export const ChatModel = models.Chat || model<IChat>("Chat", chatSchema)