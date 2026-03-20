import express from "express";
import 'express-async-errors';
import { logger } from "./utils/logger.util.js";
import { appConfig } from "./configs/app.config.js";
import { getAllowedReverseProxyIPs, reverseProxyValidationMiddleware } from "./middleware/reverseProxyValidation.js";
import { getAllowedIPs, ipExtractorMiddleware } from "./middleware/ipWhitelist.js";
import { loggingMiddleware } from "./middleware/loggingMiddleware.js";
import { AppError, errorMiddleware } from "./middleware/errorMiddleware.js";
import { logsViewerRouter } from "./route/logsViewer.route.js";
export const app = express();


export async function setupRoutes() {
    app.use(reverseProxyValidationMiddleware(appConfig.allowReverseProxies, appConfig.reverseProxyIPs, appConfig.nodeEnv));
    if (appConfig.allowReverseProxies) {
        app.set("trust proxy", true);
    }
    app.use(ipExtractorMiddleware);
    app.use('/log-viewer',logsViewerRouter);
    app.use(loggingMiddleware);

    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });
    
    app.get("/test", async (req, res) => {
        console.log("This should be logged too")
        logger.info("This is a test log message");
        res.json({ message: "Test endpoint is working" });
    });

    app.get("/error", async () => {
        throw new Error("This is a test error");
    });

    app.use(()=>{
        throw new AppError("Not Found", 404);
    });
    app.use(errorMiddleware);
}

export async function appStarted() {
    logger.info(`📝 Environment: ${appConfig.nodeEnv}`);
    logger.info(`🛡️  Allow Reverse Proxies: ${appConfig.allowReverseProxies}`);
    const allowedReverseProxies = getAllowedReverseProxyIPs(appConfig.reverseProxyIPs, appConfig.nodeEnv);
    if (appConfig.allowReverseProxies) {
        logger.info(`📋 Allowed Proxy IPs: ${allowedReverseProxies.join(", ")}`);
    }
    logger.info(`🔐 IP Whitelist Enabled: ${appConfig.ipWhitelistEnabled}`);
    const allowedIPs = getAllowedIPs(appConfig.allowedIPs, appConfig.nodeEnv);
    if (appConfig.ipWhitelistEnabled) {
        if (allowedIPs.length === 0) {
            logger.warn("⚠️  IP whitelist is enabled but no allowed IPs are configured");
        } else {
            logger.info(`📋 Allowed IPs: ${allowedIPs.join(", ")}`);
        }
    }
}