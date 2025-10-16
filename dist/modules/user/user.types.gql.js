"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addFollower = exports.search = exports.allUsers = exports.welcome = exports.GraphQlOneUserResponse = exports.GraphQlRoleEnum = exports.GraphQlProviderEnum = exports.GraphQlGenderEnum = void 0;
const graphql_1 = require("graphql");
const model_1 = require("../../DB/model");
const graphql_2 = require("../graphql");
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
exports.GraphQlProviderEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQlProviderEnum",
    values: {
        GOOGLE: {
            value: model_1.ProviderEnum.GOOGLE
        },
        SYSTEM: {
            value: model_1.ProviderEnum.SYSTEM
        },
    },
});
exports.GraphQlRoleEnum = new graphql_1.GraphQLEnumType({
    name: "GraphQlRoleEnum",
    values: {
        superAdmin: {
            value: model_1.RoleEnum.superAdmin
        },
        admin: {
            value: model_1.RoleEnum.admin
        },
        user: {
            value: model_1.RoleEnum.user
        },
    },
});
exports.GraphQlOneUserResponse = new graphql_1.GraphQLObjectType({
    name: "OneUserResponse",
    fields: {
        _id: { type: graphql_1.GraphQLID },
        firstName: { type: graphql_1.GraphQLString },
        lastName: { type: graphql_1.GraphQLString },
        username: { type: graphql_1.GraphQLString, resolve: (parent) => {
                return parent.gender === model_1.GenderEnum.male ? `Mr. ${parent.username}` : `Miss. ${parent.username}`;
            }
        },
        slug: { type: graphql_1.GraphQLString },
        email: { type: graphql_1.GraphQLString },
        confirmEmailOtp: { type: graphql_1.GraphQLString },
        confirmedAt: { type: graphql_1.GraphQLString },
        password: { type: graphql_1.GraphQLString },
        resetPasswordOtp: { type: graphql_1.GraphQLString },
        changeCredentialsTime: { type: graphql_1.GraphQLString },
        phone: { type: graphql_1.GraphQLString },
        address: { type: graphql_1.GraphQLString },
        profileImage: { type: graphql_1.GraphQLString },
        tempProfileImage: { type: graphql_1.GraphQLString },
        coverImage: { type: new graphql_1.GraphQLList(graphql_1.GraphQLString) },
        gender: { type: exports.GraphQlGenderEnum },
        role: { type: exports.GraphQlRoleEnum },
        provider: { type: exports.GraphQlProviderEnum },
        freezedAt: { type: graphql_1.GraphQLString },
        freezedBy: { type: graphql_1.GraphQLID },
        restoredAt: { type: graphql_1.GraphQLString },
        restoredBy: { type: graphql_1.GraphQLString },
        friends: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        blockList: { type: new graphql_1.GraphQLList(graphql_1.GraphQLID) },
        createdAt: { type: graphql_1.GraphQLString },
        updatedAt: { type: graphql_1.GraphQLString },
    }
});
exports.welcome = new graphql_1.GraphQLNonNull(graphql_1.GraphQLString);
exports.allUsers = new graphql_1.GraphQLList(exports.GraphQlOneUserResponse);
exports.search = (0, graphql_2.GraphQlUniformResponse)({ name: "SearchUser", data: new graphql_1.GraphQLNonNull(exports.GraphQlOneUserResponse) });
exports.addFollower = new graphql_1.GraphQLList(exports.GraphQlOneUserResponse);
