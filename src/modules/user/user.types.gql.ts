import { GraphQLEnumType, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLObjectType, GraphQLString } from "graphql";
import { GenderEnum, HUserDocument, ProviderEnum, RoleEnum } from "../../DB/model";
import { GraphQlUniformResponse } from "../graphql";

export const GraphQlGenderEnum = new GraphQLEnumType({
    name: "GraphQlGenderEnum",
    values: {
        male: {
            value: GenderEnum.male
        },
        female: {
            value: GenderEnum.female
        },
    },
});
export const GraphQlProviderEnum = new GraphQLEnumType({
    name: "GraphQlProviderEnum",
    values: {
        GOOGLE: {
            value: ProviderEnum.GOOGLE
        },
        SYSTEM: {
            value: ProviderEnum.SYSTEM
        },
    },
});

export const GraphQlRoleEnum = new GraphQLEnumType({
    name: "GraphQlRoleEnum",
    values: {
        superAdmin: {
            value: RoleEnum.superAdmin
        },
        admin: {
            value: RoleEnum.admin
        },
        user: {
            value: RoleEnum.user
        },
    },
});


export const GraphQlOneUserResponse = new GraphQLObjectType({
    name: "OneUserResponse",
    fields: {
       _id:{type:GraphQLID},
       
           firstName:{type:GraphQLString},
           lastName:{type:GraphQLString},
           username:{type:GraphQLString,resolve:(parent:HUserDocument)=>
           {
            return parent.gender === GenderEnum.male? `Mr. ${parent.username}` : `Miss. ${parent.username}`
           }
            
           },
           slug:{type:GraphQLString},
       
           email:{type:GraphQLString},
           confirmEmailOtp:{type:GraphQLString},
           confirmedAt:{type:GraphQLString},
       
           password:{type:GraphQLString},
           resetPasswordOtp:{type:GraphQLString},
           changeCredentialsTime:{type:GraphQLString},
       
           phone:{type:GraphQLString},
           address:{type:GraphQLString},
       
           profileImage:{type:GraphQLString},
           tempProfileImage:{type:GraphQLString},
           coverImage:{type:new GraphQLList(GraphQLString)},
           
           gender:{type:GraphQlGenderEnum},
           role:{type:GraphQlRoleEnum},
           provider:{type:GraphQlProviderEnum},
           
       
           freezedAt:{type:GraphQLString},
           freezedBy:{type:GraphQLID},
           restoredAt:{type:GraphQLString},
           restoredBy:{type:GraphQLString},
           friends:{type:new GraphQLList(GraphQLID)},
           blockList:{type:new GraphQLList(GraphQLID)},
           
           createdAt:{type:GraphQLString},
           updatedAt:{type:GraphQLString},
    }
})

export const welcome = new GraphQLNonNull(GraphQLString)

export const allUsers = new GraphQLList(GraphQlOneUserResponse)

export const search = GraphQlUniformResponse({ name: "SearchUser", data: new GraphQLNonNull(GraphQlOneUserResponse) })

export const addFollower = new GraphQLList(GraphQlOneUserResponse)