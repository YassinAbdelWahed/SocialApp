import {
    GraphQLObjectType,
    GraphQLSchema,
} from "graphql";
import userSchemaGql from "../user/user.schema.gql";
import postSchemaGql from "../post/post.schema.gql";
import { PostGqlSchema } from "../post";

const query = new GraphQLObjectType({
    name: "RootSchemaQuery",
    description: "optional text",
    fields: {
        ...userSchemaGql.registerQuery(),
        ...postSchemaGql.registerQuery(),
    }
});
const mutation = new GraphQLObjectType({
    name: "RootSchemaMutation",
    description: "hold all RootSchemaMutation fields",
    fields: {
        ...userSchemaGql.registerMutation(),
        ...PostGqlSchema.registerMutation(),
    }
});

export const schema = new GraphQLSchema({
    query,
    mutation,
})