"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const gqlTypes = __importStar(require("./user.types.gql"));
const gqlArgs = __importStar(require("./user.args.gql"));
class UserGQLSchema {
    constructor() { }
    registerQuery = () => {
        return {
            sayHi: {
                type: gqlTypes.welcome,
                description: "this field return our server welcome message !!!",
                resolve: (parent, args) => {
                    return "Hello graphl";
                }
            },
            allUsers: {
                type: gqlTypes.allUsers,
                args: gqlArgs.allUsers,
                resolve: (parent, args) => {
                    console.log(args);
                    return users.filter((ele) => ele.name === args.name && ele.gender === args.gender);
                }
            },
            searchUser: {
                type: gqlTypes.search,
                args: gqlArgs.searchUser,
                resolve: (parent, args) => {
                    const user = users.find((ele) => ele.email === args.email);
                    if (!user) {
                        throw new graphql_1.GraphQLError("fail to find matching result", {
                            extensions: { statusCode: 404 }
                        });
                    }
                    return { message: "Done", statusCode: 200, data: user };
                }
            }
        };
    };
    registerMutation = () => {
        return {
            addFollower: {
                type: gqlTypes.addFollower,
                args: gqlArgs.addFollower,
                resolve: (parent, args) => {
                    users = users.map((ele) => {
                        if (ele.id === args.friendId) {
                            ele.followers.push(args.myId);
                        }
                        return ele;
                    });
                    return users;
                }
            }
        };
    };
}
exports.default = new UserGQLSchema();
