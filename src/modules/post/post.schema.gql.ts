import { PostResolver } from "./post.resolver";
import * as gqlArgs from './post.args.gql'
import * as gqlTypes from './posts.types.gql'

class PostGqlSchema{
    private postResolver:PostResolver=new PostResolver()
    constructor(){}

    registerQuery=()=>
    {
        return {
            allPosts:{
                type:gqlTypes.allPosts,
                args:gqlArgs.allPosts,
                resolve:this.postResolver.allPosts,
            }
        }
    }

    registerMutation=()=>
    {
        return{
            likePost:{
                type:gqlTypes.GraphQLOnePostResponse,
                args:gqlArgs.likePosts,
                resolve:this.postResolver.likePosts,
            }
        }
    }
}
export default new PostGqlSchema()