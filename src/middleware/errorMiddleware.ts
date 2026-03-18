import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.util.js";

export class AppError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}

export async function errorMiddleware(err: unknown, req: Request, res: Response, next: NextFunction) {
    if (!(err instanceof AppError)) {
        let errorMessage: string;
        if (err instanceof Error) {
            errorMessage = err.stack || err.message;
        } else if (typeof err === "string") {
            errorMessage = err;
        } else {
            errorMessage = JSON.stringify(err);
        }
        logger.error(errorMessage);
    }
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    const message = err instanceof Error ?
        err.message:
        typeof err === "string" ? err : "An unexpected error occurred";
    if (res.headersSent) {
        return next(err);
    }
    res.status(statusCode).json({
        message: message,
    });
}