import { DatabaseRespository} from "./database.repository";
import { IFriendRequest as TDocument } from "../model/friendRequest.model"
import { Model } from "mongoose"

export class friendRequestRepository extends DatabaseRespository<TDocument> {

    constructor(protected override readonly model: Model<TDocument>) {
        super(model)
    }

}