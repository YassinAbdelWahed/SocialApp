"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandling = exports.ConflictException = exports.ForbiddenException = exports.UnauthorizedException = exports.NotFoundException = exports.BadRequestException = exports.ApplicationExecption = void 0;
class ApplicationExecption extends Error {
    statusCode;
    constructor(message, statusCode = 400, cause) {
        super(message, { cause });
        this.statusCode = statusCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApplicationExecption = ApplicationExecption;
class BadRequestException extends ApplicationExecption {
    constructor(message, cause) {
        super(message, 400, cause);
    }
}
exports.BadRequestException = BadRequestException;
class NotFoundException extends ApplicationExecption {
    constructor(message, cause) {
        super(message, 404, cause);
    }
}
exports.NotFoundException = NotFoundException;
class UnauthorizedException extends ApplicationExecption {
    constructor(message, cause) {
        super(message, 401, cause);
    }
}
exports.UnauthorizedException = UnauthorizedException;
class ForbiddenException extends ApplicationExecption {
    constructor(message, cause) {
        super(message, 403, cause);
    }
}
exports.ForbiddenException = ForbiddenException;
class ConflictException extends ApplicationExecption {
    constructor(message, cause) {
        super(message, 409, cause);
    }
}
exports.ConflictException = ConflictException;
const globalErrorHandling = (error, req, res, next) => {
    return res.status(error.statusCode || 500).json({
        err_message: error.message || "Somthing Went Wrong !!",
        stack: process.env.MOOD === "dev" ? error.stack : undefined,
        cause: error.cause,
        error
    });
};
exports.globalErrorHandling = globalErrorHandling;
class Parent {
    name;
    constructor(name) {
        this.name = name;
    }
    getName() {
        return this.name;
    }
}
class Child extends Parent {
    name;
    constructor(name) {
        super();
        this.name = name;
    }
}
const c = new Child("Yassin");
console.log(c.getName());
