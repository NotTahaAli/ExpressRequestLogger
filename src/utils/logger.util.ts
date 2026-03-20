import * as winston from "winston";
import "winston-daily-rotate-file";

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

export const logger = winston.createLogger({
    level: "info",
    transports: [
        new winston.transports.Console({
            level: process.env.NODE_ENV === "production" ? "error" : undefined,
            format: consoleFormat
        }),
    ]
});