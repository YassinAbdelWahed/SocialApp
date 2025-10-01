import { Server } from "socket.io";
import { IAuthSocket } from "../gateway";
import { createChattingGroup, getChat, getChattingGroup } from "./chat.validation";
import z from "zod";

export type IGetChatParamsDTO = z.infer<typeof getChat.params>;

export type IGetChattingGroupParamsDTO = z.infer<typeof getChattingGroup.params>;

export type IGetChatQueryParamsDTO = z.infer<typeof getChat.query>;

export type ICreateChattingGroupParamsDTO = z.infer<typeof createChattingGroup.body>;

export interface IMainDTo {
    socket: IAuthSocket;
    callback?: any;
    io?: Server;
}
export interface ISayHiDTo extends IMainDTo {
    message: string;
}
export interface ISendMessageDTo extends IMainDTo {
    content: string;
    sendTo: string;
}
export interface ISendGroupMessageDTo extends IMainDTo {
    content: string;
    groupId: string;
}
export interface IJoinRoomDTo extends IMainDTo {
    roomId: string;
}

