import { DatabaseRespository } from "./database.repository";
import { IPost as TDocument } from "../model/post.model"
import { Model } from "mongoose"

export class PostRepository extends DatabaseRespository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }
}