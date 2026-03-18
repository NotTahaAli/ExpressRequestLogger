import { Response, NextFunction } from "express";
import { RequestWithIP } from "./ipWhitelist.js";
import { logger, requestLogger } from "../utils/logger.util.js";
import { LogEntry } from "winston";
import { OutgoingHttpHeaders } from "http";

export type RequestLogEntry = {
    clientIP: string;
    requestCompleted: boolean;
    logEntries: LogEntry[];
    request: {
        method: string;
        url: string;
        headers: Record<string, string | string[] | undefined>;
        body: unknown;
        time: Date;
    };
    response: {
        statusCode: number;
        headersSent: boolean;
        headers: OutgoingHttpHeaders;
        body: undefined | string;
        time: Date;
    }
};

function getString(input: unknown): string {
    if (typeof input === "string") {
        return input;
    }
    if (Buffer.isBuffer(input)) {
        return input.toString("utf-8");
    }
    return JSON.stringify(input);
}

export async function loggingMiddleware(req: RequestWithIP, res: Response, next: NextFunction) {
    let respBody: undefined | string = undefined;
    const oldSend = res.send;
    res.send = function (body: unknown) {
        if (respBody === undefined) {
            respBody = getString(body);
        } else {
            respBody += getString(body);
        }
        return oldSend.call(this, body);
    }
    const clientIP = req.clientIP || req.ip || "unknown";
    const body = req.body ?? JSON.stringify(req.body);
    const reqHeaders = req.headers;
    const requestTime = new Date();
    const logEntries: LogEntry[] = [];
    const logListener = (logEntry: LogEntry) => {
        logEntries.push(logEntry);
    }
    logger.addListener("data", logListener);
    const responseEnded = new Promise<boolean>((resolve) => {
        res.on("finish", () => {
            resolve(true);
        });
        res.on("close", () => {
            resolve(false);
        });
    });
    next();
    const requestCompleted = await responseEnded;
    logger.removeListener("data", logListener);
    const responseTime = new Date();
    const respHeaders = res.getHeaders();

    const logEntry: RequestLogEntry = {
        clientIP,
        requestCompleted,
        logEntries,
        request: {
            method: req.method,
            url: req.originalUrl || req.url,
            headers: reqHeaders,
            body,
            time: requestTime,
        },
        response: {
            statusCode: res.statusCode,
            headersSent: res.headersSent,
            headers: respHeaders,
            body: respBody,
            time: responseTime,
        },
    };
    if (!requestCompleted) {
        requestLogger.warn(logEntry);
    } else {
        requestLogger.info(logEntry);
    }
}