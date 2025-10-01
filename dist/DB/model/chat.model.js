"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatModel = void 0;
const mongoose_1 = require("mongoose");
const messageSchema = new mongoose_1.Schema({
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, minLength: 2, maxLength: 25 },
}, {
    timestamps: true,
});
const chatSchema = new mongoose_1.Schema({
    participants: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    group: { type: String },
    group_image: { type: String },
    messages: [messageSchema],
    roomId: {
        type: String,
        required: function () {
            return this.roomId;
        }
    }
}, {
    timestamps: true,
});
exports.ChatModel = mongoose_1.models.Chat || (0, mongoose_1.model)("Chat", chatSchema);
