"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.friendRequestRepository = void 0;
const database_repository_1 = require("./database.repository");
class friendRequestRepository extends database_repository_1.DatabaseRespository {
    model;
    constructor(model) {
        super(model);
        this.model = model;
    }
}
exports.friendRequestRepository = friendRequestRepository;
