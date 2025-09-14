import {
    CreateOptions, FlattenMaps, HydratedDocument,
    Model, ProjectionType, QueryOptions, UpdateQuery,
    MongooseUpdateQueryOptions, UpdateWriteOpResult, RootFilterQuery,
    Types, DeleteResult,
    PopulateOptions
} from "mongoose";

export type Lean<T> = HydratedDocument<FlattenMaps<T>>

export abstract class DatabaseRespository<TDocument> {
    constructor(protected readonly model: Model<TDocument>) { }

    async find({
        filter,
        select,
        options,
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument>[] | [] | Lean<TDocument>[]> {
        const doc = this.model.find(filter || {}).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate as PopulateOptions[]);
        }
        if (options?.skip) {
            doc.skip(options.skip);
        }
        if (options?.limit) {
            doc.limit(options.limit);
        }
        if (options?.lean) {
            doc.lean();
        }

        return await doc.exec();
    }

    async findOne({
        filter,
        select,
        options,
    }: {
        filter?: RootFilterQuery<TDocument>;
        select?: ProjectionType<TDocument> | null;
        options?: QueryOptions<TDocument> | null;
    }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
        const doc = this.model.findOne(filter).select(select || "");
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }

    async create({
        data,
        options,
    }: {
        data: Partial<TDocument>[];
        options?: CreateOptions | undefined;
    }): Promise<HydratedDocument<TDocument>[] | undefined> {
        return await this.model.create(data, options);
    }


    async updateOne({
        filter,
        update,
        options,
    }: {
        filter: RootFilterQuery<TDocument>;
        update: UpdateQuery<TDocument>;
        options?: MongooseUpdateQueryOptions<TDocument> | null;
    }): Promise<UpdateWriteOpResult> {
        return await this.model.updateOne(
            filter,
            {
                ...update,
                $inc: { __v: 1 },
            },
            options
        );
    }

    async findByIdAndUpdate({
        id,
        update,
        options = { new: true },
    }: {
        id: Types.ObjectId;
        update: UpdateQuery<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return this.model.findByIdAndUpdate(
            id,
            {
                ...update,
                $inc: { __v: 1 },
            },
            options
        );
    }

    async findOneAndUpdate({
        filter,
        update,
        options = { new: true },
    }: {
        filter?: RootFilterQuery<TDocument>;
        update: UpdateQuery<TDocument>;
        options?: QueryOptions<TDocument> | null;
    }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
        return this.model.findOneAndUpdate(
            filter,
            {
                ...update,
                $inc: { __v: 1 },
            },
            options
        );
    }

    async deleteOne({
        filter,

    }: {
        filter: RootFilterQuery<TDocument>;
    }): Promise<DeleteResult> {
        return this.model.deleteOne(filter);
    }

}