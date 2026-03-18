import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import { appConfig } from "../configs/app.config.js";
import { createIPWhitelistMiddleware } from "../middleware/ipWhitelist.js";
import { AppError } from "../middleware/errorMiddleware.js";
import { gzipSync } from "zlib";

export const logsViewerRouter = Router();

if (appConfig.ipWhitelistEnabled) {
    logsViewerRouter.use(createIPWhitelistMiddleware(appConfig.allowedIPs, appConfig.nodeEnv));
}

// API endpoint to get all log file names
logsViewerRouter.get("/api/logs", (req, res) => {
    try {
        const logsDir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(logsDir)) {
            throw new AppError("Logs directory not found", 404);
        }
        const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith(".log") || file.endsWith(".log.gz"));
        res.json({ logs: logFiles.map(file => file.replace(/\.log(\.gz)?$/, "")) });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(`Failed to read logs ${String(error)}`, 500);
    }
});

// API endpoint to get the content of a specific log file
logsViewerRouter.get("/api/logs/:logName", (req, res) => {
    try {
        const logName = req.params.logName;
        const logsDir = path.join(process.cwd(), "logs");
        const logFilePath = path.join(logsDir, `${logName}.log`);
        const logFileGzPath = `${logFilePath}.gz`;
        if (fs.existsSync(logFilePath)) {
            const logContent = fs.readFileSync(logFilePath, "utf-8");
            const gzippedContent = gzipSync(logContent);
            res.type("application/gzip").send(gzippedContent);
        } else if (fs.existsSync(logFileGzPath)) {
            const logContent = fs.readFileSync(logFileGzPath);
            res.type("application/gzip").send(logContent);
        } else {
            throw new AppError("Log file not found", 404);
        }
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError(`Failed to read log file ${String(error)}`, 500);
    }
});