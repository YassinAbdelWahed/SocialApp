import { DatabaseRespository } from "./database.repository";
import { IToken as TDocument } from "../model/token.model"
import { Model } from "mongoose"

export class TokenRepository extends DatabaseRespository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }
}