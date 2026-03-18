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
    // Important: Place loggingMiddleware after reverse proxy and IP extraction middlewares to ensure correct client IP is logged
    // Important: Place logsViewerRouter before loggingMiddleware to ensure logs for logs viewer access are not logged (to avoid infinite logging loop)
    app.use(logsViewerRouter);
    app.use(loggingMiddleware);

    app.get("/health", (req, res) => {
        res.json({ status: "ok" });
    });
    
    app.get("/test", async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 10000)); // Simulate async work
        res.json({ message: "This is a test endpoint" });
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