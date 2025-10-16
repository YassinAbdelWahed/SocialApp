"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFollower = exports.search = exports.allUsers = exports.welcome = exports.GraphQlOneUserResponse = exports.GraphQlGenderEnum = void 0;
const graphql_1 = require("graphql");
const model_1 = require("../../DB/model");
const types_gql_1 = require("../graphql/types.gql");
exports.GraphQlGenderEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQlGenderEnum",
    values: {
        male: {
            value: model_1.GenderEnum.male
        },
        female: {
            value: model_1.GenderEnum.female
        },
    },
});
exports.GraphQlOneUserResponse = new graphql_1.GraphQLObjectType({
    name: "OneUserResponse",
    fields: {
        id: { type: graphql_1.GraphQLID },
        name: {
            type: new graphql_1.GraphQLNonNull(graphql_1.GraphQLString),
            description: "userName",
        },
        email: { type: graphql_1.GraphQLString },
        gender: { type: exports.GraphQlGenderEnum },
        followers: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) }
    }
});
exports.welcome = new graphql_1.GraphQLNonNull(graphql_1.GraphQLString);
exports.allUsers = new graphql_1.GraphQLList(exports.GraphQlOneUserResponse);
exports.search = (0, types_gql_1.GraphQlUniformResponse)({ name: "SearchUser", data: new graphql_1.GraphQLNonNull(exports.GraphQlOneUserResponse) });
exports.addFollower = new graphql_1.GraphQLList(exports.GraphQlOneUserResponse);
