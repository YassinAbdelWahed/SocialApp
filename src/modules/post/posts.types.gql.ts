import { GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";
import { AllowCommentsEnum, AvailabilityEnum } from "../../DB/model";
import { GraphQlOneUserResponse } from "../user/user.types.gql";

export const GraphQLAllowCommentsEnum=new GraphQLEnumType({
    name:'AllowCommentsEnum',
    values:{
        allow:{value:AllowCommentsEnum.allow},
        deny:{value:AllowCommentsEnum.deny}

        
    }
})

export const GraphQLAvailabilityEnum=new GraphQLEnumType({
    name:"AvailabilityEnum",
    values:{
        private:{value:AvailabilityEnum.friends},
        
        onlyMe:{value:AvailabilityEnum.onlyMe},
        
        public:{value:AvailabilityEnum.public},

    }
})

export const GraphQLOnePostResponse=new GraphQLObjectType({
    name:"OnePostResponse",
    fields:{
            _id:{type:GraphQLID},
            createdBy:{type:GraphQlOneUserResponse},

            content:{type:GraphQLString},
            attachments:{type:new GraphQLList(GraphQLString)},
            assetsFolderId:{type:GraphQLString},
        
            availability:{type:GraphQLAvailabilityEnum},
            allowComments:{type:GraphQLAllowCommentsEnum},
        
            likes:{type:new GraphQLList(GraphQLID)},
            tags:{type:new GraphQLList(GraphQLID)},
        
        
            freezedAt:{type:GraphQLString},
            freezedBy:{type:GraphQLID},
        
            restoredAt:{type:GraphQLString},
            restoredBy:{type:GraphQLID},
        
            createdAt:{type:GraphQLString},
            updatedAt:{type:GraphQLString},
    }
})

export const allPosts=new GraphQLObjectType({
    name:"allPosts",
    fields:{
        docsCount:{type:GraphQLInt},
        limit:{type:GraphQLInt},
        pages:{type:GraphQLInt},
        currentPages:{type:GraphQLInt},
        result:{type:new GraphQLList(GraphQLOnePostResponse)},
    }
})
