import * as winston from "winston";
import { RequestLogEntry } from "../middleware/loggingMiddleware.js";

export const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: "logs/error.log", level: "error" }),
        new winston.transports.File({ filename: "logs/combined.log" }),
    ]
});

export const requestLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: "logs/requests.log" }),
    ]
});

if (process.env.NODE_ENV !== "production") {
    const consoleFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level}: ${message}`;
        })
    )
    logger.add(new winston.transports.Console({
        format: consoleFormat
    }));

    requestLogger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
            winston.format.printf(({ timestamp, level, message }) => {
                const logEntry: RequestLogEntry = message as RequestLogEntry;
                return `[${timestamp}] REQUEST ${level}: [${logEntry.clientIP}] ${logEntry.request.method} ${logEntry.request.url} - ${logEntry.requestCompleted ? `${logEntry.response.statusCode} Content-Length:${logEntry.response.headers['content-length'] ?? 0}` : "Failed"} Time:${logEntry.response.time.getTime() - logEntry.request.time.getTime()}ms`;
            })
        )
    }));
}