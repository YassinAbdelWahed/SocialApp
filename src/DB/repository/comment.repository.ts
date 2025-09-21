import { DatabaseRespository } from "./database.repository";
import { IComment as TDocument } from "../model"
import { Model } from "mongoose"

export class CommentRepository extends DatabaseRespository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }
}