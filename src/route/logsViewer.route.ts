import { Router } from "express";
import * as fs from "fs";
import * as path from "path";
import { appConfig } from "../configs/app.config.js";
import { createIPWhitelistMiddleware } from "../middleware/ipWhitelist.js";

export const logsViewerRouter = Router();

if (appConfig.ipWhitelistEnabled) {
    logsViewerRouter.use(createIPWhitelistMiddleware(appConfig.allowedIPs, appConfig.nodeEnv));
}

// API endpoint to get all logs
logsViewerRouter.get("/api/logs", (req, res) => {
    try {
        const logsPath = path.join(process.cwd(), "logs", "requests.log");
        
        if (!fs.existsSync(logsPath)) {
            return res.json({ logs: [], error: "No logs file found" });
        }

        const fileContent = fs.readFileSync(logsPath, "utf-8");
        const lines = fileContent.split("\n").filter(line => line.trim());
        
        const logs = lines.map((line, index) => {
            try {
                const parsed = JSON.parse(line);
                return { ...parsed, id: index };
            } catch {
                return { raw: line, id: index };
            }
        });

        res.json({ logs });
    } catch (error) {
        res.status(500).json({ error: "Failed to read logs", message: String(error) });
    }
});

// Serve the HTML UI from file
logsViewerRouter.get("/logs", (req, res) => {
    const htmlPath = path.join(process.cwd(), "public", "logs-viewer.html");
    res.sendFile(htmlPath);
});

// API endpoint to clear logs
logsViewerRouter.post("/api/logs/clear", (req, res) => {
    try {
        const logsPath = path.join(process.cwd(), "logs", "requests.log");
        
        if (fs.existsSync(logsPath)) {
            fs.writeFileSync(logsPath, "");
        }

        res.json({ success: true, message: "Logs cleared successfully" });
    } catch (error) {
        res.status(500).json({ success: false, error: "Failed to clear logs", message: String(error) });
    }
});
