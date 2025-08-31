import { CreateOptions, HydratedDocument, Model } from "mongoose";
import { IUser as TDocument } from "../model/User.model";
import { DatabaseRespository } from "./database.repository";
import { BadRequestException } from "../../utils/response/error.response";

export class UserRepository extends DatabaseRespository<TDocument> {
    constructor(protected override readonly model: Model<TDocument>) {
        super(model);
    }

    async createUser({
        data,
        options,
    }: {
        data: Partial<TDocument>[];
        options?: CreateOptions;
    }): Promise<HydratedDocument<TDocument>> {
        const [user] = (await this.create({ data, options })) || [];
        if (!user) {
            throw new BadRequestException("fail to create this user");
        }
        return user;
    }

}