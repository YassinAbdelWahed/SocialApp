import { NextFunction, Request, Response } from "express";

export interface IError extends Error {
    statusCode: number;
}

export class ApplicationExecption extends Error {
    constructor(
        message: string,
        public statusCode: Number = 400,
        cause?: unknown
    ) {
        super(message, { cause });
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor)
    }
}

export class BadRequestException extends ApplicationExecption {
    constructor(message: string, cause?: unknown) {
        super(message, 400, cause)
    }
}

export class NotFoundException extends ApplicationExecption {
    constructor(message: string, cause?: unknown) {
        super(message, 404, cause)
    }
}

export class UnauthorizedException extends ApplicationExecption {
    constructor(message: string, cause?: unknown) {
        super(message, 401, cause)
    }
}

export class ForbiddenException extends ApplicationExecption {
    constructor(message: string, cause?: unknown) {
        super(message, 403, cause)
    }
}

export class ConflictException extends ApplicationExecption {
    constructor(message: string, cause?: unknown) {
        super(message, 409, cause);
    }
}

export const globalErrorHandling = (
    error: IError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    return res.status(error.statusCode || 500).json({
        err_message: error.message || "Somthing Went Wrong !!",
        stack: process.env.MOOD === "dev" ? error.stack : undefined,
        cause: error.cause,
        error
    })
}

class Parent {
    constructor(public name?: string) { }
    getName() {
        return this.name;
    }
}
class Child extends Parent {
    constructor(public override name: string) {
        super();
    }
}

const c = new Child("Yassin");
console.log(c.getName());