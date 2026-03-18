import * as winston from "winston";
import "winston-daily-rotate-file";
import { RequestLogEntry } from "../middleware/loggingMiddleware.js";

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        if ("stack" in meta) {
            return `[${timestamp}] ${level}: ${message} - ${meta.stack}`;
        }
        return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
    })
)

const requestTransport = new winston.transports.DailyRotateFile({
    filename: "requests-%DATE%",
    extension: ".log",
    dirname: "logs",
    datePattern: "YYYY-MM-DD",
    maxSize: "20m",
    maxFiles: "30d",
    zippedArchive: true,
    auditFile: "logs/request-audit.json",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    )
})



export const logger = winston.createLogger({
    level: "info",
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === "production" ? "error" : undefined,
            format: consoleFormat
        }),
    ]
});

export const requestLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        requestTransport,
    ]
});

if (process.env.NODE_ENV !== "production") {
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