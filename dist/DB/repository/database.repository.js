"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseRespository = void 0;
class DatabaseRespository {
    model;
    constructor(model) {
        this.model = model;
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
}
exports.DatabaseRespository = DatabaseRespository;
