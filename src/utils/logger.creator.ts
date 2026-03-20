import { DailyRotateFileTransportOptions } from "winston-daily-rotate-file";
import { ConsoleTransportOptions } from "winston/lib/winston/transports/index.js";
import { createLogger, format, Logform, Logger, transport, transports } from "winston";
import { Writable } from "stream";
import { EventEmitter } from "events";
import type { Response, Request, NextFunction } from "express";
import { IncomingHttpHeaders, OutgoingHttpHeaders } from "http";
import { stringify } from "../helpers/stringify.js";

export type CustomLogEntry<IncludeRequestBody extends boolean, IncludeResponseBody extends boolean, IncludeHeaders extends boolean> = {
    level: string;
    message: RequestLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>;
    timestamp: string;
}

export type RequestLogLocation<IncludeRequestBody extends boolean, IncludeResponseBody extends boolean, IncludeHeaders extends boolean> =
    ({ type: "file" } & DailyRotateFileTransportOptions) |
    ({ type: "console" } & ConsoleTransportOptions) |
    ({ type: "custom", logFunction: (logEntry: CustomLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>) => void, level?: string });

export type TrackedLogger = Console | Logger;

export type RequestLoggerOptions<IncludeRequestBody extends boolean, IncludeResponseBody extends boolean, IncludeHeaders extends boolean> = {
    logRequestBody?: IncludeRequestBody; // Whether to log the request body (default: false)
    logResponseBody?: IncludeResponseBody; // Whether to log the response body (default: false)
    logHeaders?: IncludeHeaders; // Whether to log request and response headers (default: true)
    logLocations?: RequestLogLocation<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>[]; // Default no location
    trackedLoggers?: TrackedLogger[];
    loggingPreCondition?: (req: Request) => boolean; // Function to determine whether to log a particular request (default: log all requests)
    loggingPostCondition?: (entry: RequestLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>) => boolean; // Function to determine whether to log a particular request after it has completed (default: log all completed requests)
}

export type RequestLogEntry<IncludeRequestBody extends boolean, IncludeResponseBody extends boolean, IncludeHeaders extends boolean> = {
    clientIP: string;
    requestCompleted: boolean;
    logEntries: Logform.TransformableInfo[];
    request: {
        method: string;
        url: string;
        headers: IncludeHeaders extends true ? IncomingHttpHeaders : undefined;
        body: IncludeRequestBody extends true ? unknown : undefined;
        time: Date;
    };
    response: {
        statusCode: number;
        headersSent: boolean;
        headers: IncludeHeaders extends true ? OutgoingHttpHeaders : undefined;
        body: IncludeResponseBody extends true ? undefined | string : undefined;
        time: Date;
    }
};

export class RequestLogger<IncludeRequestBody extends boolean = false, IncludeResponseBody extends boolean = false, IncludeHeaders extends boolean = true> {
    private logRequestBody: IncludeRequestBody;
    private logResponseBody: IncludeResponseBody;
    private logHeaders: IncludeHeaders;
    private winstonLogger: Logger;
    private trackedEmitter: EventEmitter<{ data: [log: Logform.TransformableInfo] }>;
    private loggingPreCondition?: (req: Request) => boolean;
    private loggingPostCondition?: (entry: RequestLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>) => boolean;

    private createWinstonTransport(location: RequestLogLocation<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>): transport {
        const { type, ...options } = location;
        if (type === "file") {
            const fileOptions: DailyRotateFileTransportOptions = options as DailyRotateFileTransportOptions;
            if (fileOptions.format === undefined) {
                fileOptions.format = format.combine(
                    format.timestamp(),
                    format.json()
                );
            }
            return new transports.DailyRotateFile(fileOptions)
        } else if (type === "console") {
            const consoleOptions: ConsoleTransportOptions = options as ConsoleTransportOptions;
            if (consoleOptions.format === undefined) {
                consoleOptions.format = format.combine(
                    format.colorize(),
                    format.simple(),
                    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
                    format.printf(({ timestamp, level, message }) => {
                        const logEntry = message as RequestLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>;
                        return `[${timestamp}] REQUEST ${level}: [${logEntry.clientIP}] ${logEntry.request.method} ${logEntry.request.url} - ${logEntry.requestCompleted ? `${logEntry.response.statusCode} ${logEntry.response.headers ? `Content-Length:${logEntry.response.headers['content-length'] ?? 0}` : ''}` : "Failed"} Time:${logEntry.response.time.getTime() - logEntry.request.time.getTime()}ms`;
                    })
                )
            }
            return new transports.Console(consoleOptions);
        } else if (type === "custom") {
            const { logFunction, level } = options as { logFunction: (logEntry: CustomLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>) => void; level?: string };
            return new transports.Stream({
                level,
                format: format.combine(
                    format.timestamp(),
                    format.json()
                ),
                stream: new Writable({
                    objectMode: true,
                    write(log: CustomLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>, _, callback) {
                        logFunction(log);
                        callback();
                    }
                })
            })
        }
        throw new Error(`Unsupported log location type: ${type}`);
    }

    private hookTrackedLoggers(trackedLoggers: TrackedLogger[]) {
        const logEmitter = new EventEmitter<{ data: [log: Logform.TransformableInfo] }>();
        for (const trackedLogger of trackedLoggers) {
            if (trackedLogger instanceof Logger) {
                trackedLogger.on("data", (logEntry: Logform.TransformableInfo) => {
                    const transformedEntry = trackedLogger.format.transform(logEntry, trackedLogger.format.options);
                    if (!transformedEntry || transformedEntry === true) return;
                    logEmitter.emit("data", transformedEntry);
                });
            } else {
                const originalLog = trackedLogger.log;
                const originalError = trackedLogger.error;
                const originalWarn = trackedLogger.warn;
                trackedLogger.log = (...args) => {
                    logEmitter.emit("data", { level: "info", message: args, timestamp: new Date().toISOString() });
                    return originalLog.apply(trackedLogger, args);
                };
                trackedLogger.error = (...args) => {
                    logEmitter.emit("data", { level: "error", message: args, timestamp: new Date().toISOString() });
                    return originalError.apply(trackedLogger, args);
                };
                trackedLogger.warn = (...args) => {
                    logEmitter.emit("data", { level: "warn", message: args, timestamp: new Date().toISOString() });
                    return originalWarn.apply(trackedLogger, args);
                };
            }
        }
        return logEmitter;
    }

    public constructor(options: RequestLoggerOptions<IncludeRequestBody, IncludeResponseBody, IncludeHeaders>) {
        const {
            logRequestBody = false,
            logResponseBody = false,
            logHeaders = true,
            logLocations = []
        } = options;

        this.logRequestBody = logRequestBody as IncludeRequestBody;
        this.logResponseBody = logResponseBody as IncludeResponseBody;
        this.logHeaders = logHeaders as IncludeHeaders;
        this.trackedEmitter = this.hookTrackedLoggers(options.trackedLoggers ?? []);
        this.loggingPreCondition = options.loggingPreCondition;
        this.loggingPostCondition = options.loggingPostCondition;

        const winstonTransports = logLocations.map(loc => this.createWinstonTransport(loc));
        this.winstonLogger = createLogger({
            transports: winstonTransports
        })

        process.on("SIGTERM", () => {
            this.winstonLogger.close();
            process.exit(0);
        });
    }

    public loggingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
        if (this.loggingPreCondition && !this.loggingPreCondition(req)) {
            return next();
        }
        let respBody: undefined | string = undefined;
        if (this.logResponseBody) {
            const oldSend = res.send;
            res.send = (body: unknown) => {
                if (respBody === undefined) {
                    respBody = stringify(body);
                } else {
                    respBody += stringify(body);
                }
                return oldSend.call(res, body);
            }
        }
        const clientIP = req.ip || "unknown";
        const requestTime = new Date();
        const logEntries: Logform.TransformableInfo[] = [];
        this.trackedEmitter.on("data", (logEntry) => {
            logEntries.push(logEntry);
        });
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
        this.trackedEmitter.removeAllListeners("data");
        const log: RequestLogEntry<IncludeRequestBody, IncludeResponseBody, IncludeHeaders> = {
            clientIP,
            requestCompleted,
            logEntries,
            request: {
                method: req.method,
                url: req.originalUrl || req.url,
                headers: (this.logHeaders ? req.headers : undefined) as (IncludeHeaders extends true ? IncomingHttpHeaders : undefined),
                body: this.logRequestBody ? req.body : undefined,
                time: requestTime
            },
            response: {
                statusCode: res.statusCode,
                headersSent: res.headersSent,
                headers: (this.logHeaders ? res.getHeaders() : undefined) as (IncludeHeaders extends true ? OutgoingHttpHeaders : undefined),
                body: respBody,
                time: new Date()
            }
        };
        if (this.loggingPostCondition && !this.loggingPostCondition(log)) {
            return;
        }
        if (!requestCompleted) {
            this.winstonLogger.warn(log);
        } else {
            this.winstonLogger.info(log);
        }
    }
}