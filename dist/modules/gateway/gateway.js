"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIo = exports.initializeTo = exports.connectedSockets = void 0;
const socket_io_1 = require("socket.io");
const token_security_1 = require("../../utils/security/token.security");
const chat_1 = require("../chat");
const error_response_1 = require("../../utils/response/error.response");
exports.connectedSockets = new Map();
let io = undefined;
const initializeTo = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: "*",
        },
    });
    io.use(async (socket, next) => {
        try {
            const { user, decoded } = await (0, token_security_1.decodeToken)({
                authorization: socket.handshake?.auth.authorization || "",
                tokenType: token_security_1.TokenEnum.access,
            });
            exports.connectedSockets.set(user._id.toString(), socket.id);
            socket.credentials = { user, decoded };
            next();
        }
        catch (error) {
            next(error);
        }
    });
    function disconnection(socket) {
        return socket.on("disconnect", () => {
            const userId = socket.credentials?.user._id?.toString();
            exports.connectedSockets.delete(userId);
            (0, exports.getIo)().emit("offline_user", userId);
            console.log(`Logout from ::: ${socket.id}`);
            console.log({ after_Disconnect: exports.connectedSockets });
        });
    }
    const chatGateway = new chat_1.ChatGateway();
    io.on("connection", (socket) => {
        chatGateway.register(socket);
        disconnection(socket);
    });
};
exports.initializeTo = initializeTo;
const getIo = () => {
    if (!io) {
        throw new error_response_1.BadRequestException("fail to stablish server socket io");
    }
    return io;
};
exports.getIo = getIo;
