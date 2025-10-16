import { GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLNonNull } from "graphql";
import { LikeActionEnum } from "../../DB/model";

export const allPosts={
    page:{type:new GraphQLNonNull(GraphQLInt)},
    size:{type:new GraphQLNonNull(GraphQLInt)},
}

export const likePosts={
    postId:{type:new GraphQLNonNull(GraphQLID)},
    action:{type:new GraphQLNonNull(new GraphQLEnumType({
        name:"LikeActionEnum",
        values:{
            like:{value:LikeActionEnum.like},
            unlike:{value:LikeActionEnum.unlike},
        }
    }))},
}