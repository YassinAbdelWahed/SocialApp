import { Types } from "mongoose";
import { ChatModel, UserModel } from "../../DB/model";
import { ChatRepository, UserRepository } from "../../DB/repository";
import { BadRequestException, NotFoundException } from "../../utils/response/error.response";
import { successResponse } from "../../utils/response/success.response";
import { ICreateChattingGroupParamsDTO, IGetChatParamsDTO, IGetChatQueryParamsDTO, IGetChattingGroupParamsDTO, IJoinRoomDTo, ISayHiDTo, ISendGroupMessageDTo, ISendMessageDTo } from "./chat.dtos";
import { IGetChatResponse } from "./chat.entities";
import { Request, Response } from "express";
import { connectedSockets } from "../gateway";
import { uuid } from "zod";
import { deleteFile, uploadFile } from "../../utils/multer/s3.config";

export class ChatService {
    private userModel: UserRepository = new UserRepository(UserModel)
    private chatModel: ChatRepository = new ChatRepository(ChatModel)
    constructor() { }

    getChat = async (req: Request, res: Response): Promise<Response> => {
        const { userId } = req.params as IGetChatParamsDTO;
        const { page, size }: IGetChatQueryParamsDTO = req.query;
        console.log(userId);
        const chat = await this.chatModel.findOneChat({
            filter: {
                participants: {
                    $all: [
                        req.user?._id as Types.ObjectId,
                        Types.ObjectId.createFromHexString(userId)
                    ]
                },
                group: { $exists: false },
            },
            options: {
                populate: [
                    {
                        path: "participants",
                        select: "firstName lastName email gender profileImage",
                    },
                ],
            },
            page,
            size,
        });

        if (!chat) {
            throw new BadRequestException("Fail to find matching chatting instance");
        }
        return successResponse<IGetChatResponse>({ res, data: { chat } });
    };

    getChattingGroup = async (req: Request, res: Response): Promise<Response> => {
        const { groupId } = req.params as IGetChattingGroupParamsDTO;
        const { page, size }: IGetChatQueryParamsDTO = req.query;
        const chat = await this.chatModel.findOneChat({
            filter: {
                _id: Types.ObjectId.createFromHexString(groupId),
                participants: { $in: req.user?._id as Types.ObjectId },
                group: { $exists: false },
            },
            options: {
                populate: [
                    {
                        path: "messages.createdBy",
                        select: "firstName lastName email gender profileImage",
                    },
                ],
            },
            page,
            size,
        });

        if (!chat) {
            throw new BadRequestException("Fail to find matching chatting instance");
        }
        return successResponse<IGetChatResponse>({ res, data: { chat } });
    };

    createChattingGroup = async (req: Request, res: Response): Promise<Response> => {

        const { group, participants }: ICreateChattingGroupParamsDTO = req.body;
        const dbparticipants = participants.map((participant: string) => {
            return Types.ObjectId.createFromHexString(participant)
        });
        const users = await this.userModel.find({
            filter: {
                _id: { $in: dbparticipants },
                friends: { $in: req.user?._id as Types.ObjectId },
            },
        });
        if (participants.length != users.length) {
            throw new NotFoundException("some or all recipient all invalid");
        }
        let group_image: string | undefined = undefined;
        const roomId = group.replaceAll(/\s+/g, "_") + "_" + uuid();
        if (req.file) {
            group_image = await uploadFile({
                file: req.file as Express.Multer.File,
                path: `chat/${roomId}`,
            })
        }
        dbparticipants.push(req.user?._id as Types.ObjectId);
        const [chat] = (await this.chatModel.create({
            data: [
                {
                    createdBy: req.user?._id as Types.ObjectId,
                    group,
                    roomId,
                    group_image: group_image as string,
                    messages: [],
                    participants: dbparticipants
                },
            ],
        })) || [];
        if (!chat) {
            if (group_image) {
                await deleteFile({ Key: group_image })
            }
            throw new BadRequestException("fail to generate this group")
        }
        return successResponse<IGetChatResponse>({ res, statusCode: 201, data: { chat } })
    };

    sayHi = ({ message, socket, callback, io }: ISayHiDTo) => {
        try {
            console.log({ message });
            throw new BadRequestException("some error");
            callback ? callback("Hello BE to FE") : undefined;
        } catch (error) {
            return socket.emit("custom_error", error);
        }
    }

    sendMessage = async ({ content, socket, sendTo, io }: ISendMessageDTo) => {
        try {
            const createdBy = socket.credentials?.user._id as Types.ObjectId;
            console.log({ content, sendTo, createdBy })
            const user = await this.userModel.findOne({
                filter: {
                    _id: Types.ObjectId.createFromHexString(sendTo),
                    friends: { $in: createdBy }
                }
            })
            if (!user) {
                throw new NotFoundException("invalid recipient friend");
            }
            const chat = await this.chatModel.findOneAndUpdate({
                filter: {
                    participants: {
                        $all: [
                            createdBy as Types.ObjectId,
                            Types.ObjectId.createFromHexString(sendTo)
                        ]
                    },
                    group: { $exists: false },
                },
                update: {
                    $addToSet: { messages: { content, createdBy } }
                },
            })
            if (!chat) {
                const [newChat] = (await this.chatModel.create({
                    data: [
                        {
                            createdBy,
                            messages: [{ content, createdBy }],
                            participants: [
                                createdBy as Types.ObjectId,
                                Types.ObjectId.createFromHexString(sendTo)
                            ],

                        }
                    ]
                })) || [];
                if (!newChat) {
                    throw new BadRequestException("fail to create this chat instance")
                }
            }

            io?.to(
                connectedSockets.get(createdBy.toString() as string) as unknown as string[]
            ).emit("successMessage", { content });

            io?.to(
                connectedSockets.get(sendTo) as unknown as string[]
            ).emit("newMessage", { content, from: socket.credentials?.user });


        } catch (error) {
            socket.emit("custom_error", error);
        }
    }

    joinRoom = async ({ roomId, socket, io }: IJoinRoomDTo) => {
        try {
            const chat = await this.chatModel.findOne({
                filter: {
                    roomId,
                    group: { $exists: true },
                    participants: { $in: socket.credentials?.user._id },
                }
            })
            if (!chat) {
                throw new NotFoundException("fail to find matching room ")
            }
            console.log({ Join: roomId })

            socket.join(chat.roomId as string)

        } catch (error) {
            socket.emit("custom_error", error);
        }
    }

    sendGroupMessage = async ({ content, socket, groupId, io }: ISendGroupMessageDTo) => {
        try {
            const createdBy = socket.credentials?.user._id as Types.ObjectId;

            const chat = await this.chatModel.findOneAndUpdate({
                filter: {
                    _id: Types.ObjectId.createFromHexString(groupId),
                    group: { $exists: true },
                    participants: { $in: createdBy as Types.ObjectId },
                },
                update: {
                    $addToSet: { messages: { content, createdBy } }
                },
            })
            if (!chat) {

                throw new BadRequestException("fail to find matching room")

            }

            io?.to(
                connectedSockets.get(createdBy.toString() as string) as unknown as string[]
            ).emit("successMessage", { content });

            io?.to(
                chat.roomId as string
            ).emit("newMessage", { content, from: socket.credentials?.user, groupId });


        } catch (error) {
            socket.emit("custom_error", error);
        }
    }

}