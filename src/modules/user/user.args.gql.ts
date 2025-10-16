import { GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import { GraphQlGenderEnum } from "./user.types.gql";


export const allUsers = {
    gender: { type: GraphQlGenderEnum }
}

export const searchUser = {
    email: {
        type: new GraphQLNonNull(GraphQLString),
        description: "this email used to find unique account",
    },
}

export const addFollower = {
    friendId: { type: new GraphQLNonNull(GraphQLInt) },
    myId: { type: new GraphQLNonNull(GraphQLInt) },
}                