"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRespository = void 0;
class DatabaseRespository {
    model;
    constructor(model) {
        this.model = model;
    }
    async find({ filter, select, options, }) {
        const doc = this.model.find(filter || {}).select(select || "");
        if (options?.populate) {
            doc.populate(options.populate);
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
    async findOne({ filter, select, options, }) {
        const doc = this.model.findOne(filter).select(select || "");
        if (options?.lean) {
            doc.lean(options.lean);
        }
        return await doc.exec();
    }
    async create({ data, options, }) {
        return await this.model.create(data, options);
    }
    async updateOne({ filter, update, options, }) {
        return await this.model.updateOne(filter, {
            ...update,
            $inc: { __v: 1 },
        }, options);
    }
    async findByIdAndUpdate({ id, update, options = { new: true }, }) {
        return this.model.findByIdAndUpdate(id, {
            ...update,
            $inc: { __v: 1 },
        }, options);
    }
    async findOneAndUpdate({ filter, update, options = { new: true }, }) {
        return this.model.findOneAndUpdate(filter, {
            ...update,
            $inc: { __v: 1 },
        }, options);
    }
    async deleteOne({ filter, }) {
        return this.model.deleteOne(filter);
    }
}
exports.DatabaseRespository = DatabaseRespository;
