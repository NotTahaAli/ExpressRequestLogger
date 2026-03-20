import { appConfig } from "../configs/app.config.js"
import { RequestLogger, RequestLogLocation } from "../utils/logger.creator.js"
import { logger } from "../utils/logger.util.js"

const logLocations: RequestLogLocation<true, true, true>[] = [
    {
        type: "file",
        filename: "requests-%DATE%",
        dirname: "logs",
        extension: ".log",
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: "30m",
        maxFiles: "14d",
        level: "info",
        auditFile: "logs/requests-audit.log",
        json: true
    }
]
if (appConfig.nodeEnv === "development") {
    logLocations.push({ type: "console" })
}

const reqLogger = new RequestLogger({
    logHeaders: true,
    logRequestBody: true,
    logResponseBody: true,
    logLocations: logLocations,
    trackedLoggers: [console, logger],
    loggingPreCondition: (req) => {
        if (req.path.endsWith("/health")) return false;
        return true;
    }
})

export const loggingMiddleware = reqLogger.loggingMiddleware