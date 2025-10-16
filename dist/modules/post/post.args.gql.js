"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.likePosts = exports.allPosts = void 0;
const graphql_1 = require("graphql");
const model_1 = require("../../DB/model");
exports.allPosts = {
    page: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
    size: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLInt) },
};
exports.likePosts = {
    postId: { type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLID) },
    action: { type: new graphql_1.GraphQLNonNull(new graphql_1.GraphQLEnumType({
            name: "LikeActionEnum",
            values: {
                like: { value: model_1.LikeActionEnum.like },
                unlike: { value: model_1.LikeActionEnum.unlike },
            }
        })) },
};
