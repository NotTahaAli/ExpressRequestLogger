import { Request, Response, NextFunction } from "express";
import { NodeEnv } from "../configs/app.config.js";

export interface RequestWithIP extends Request {
    clientIP?: string;
}

/**
 * Middleware to extract client IP address
 * Handles both direct connections and reverse proxies (NGINX, etc.)
 */
export const ipExtractorMiddleware = (
    req: RequestWithIP,
    res: Response,
    next: NextFunction
) => {
    const forwardedFor = req.headers["x-forwarded-for"];

    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        const clientIP = Array.isArray(forwardedFor)
            ? forwardedFor[0].split(",")[0].trim()
            : forwardedFor.split(",")[0].trim();
        req.clientIP = clientIP;
    } else {
        req.clientIP = req.socket.remoteAddress || "unknown";
    }

    next();
};

export function getAllowedIPs(allowedIPs: string[], nodeEnv: NodeEnv): string[] {
    if (nodeEnv === "development") {
        const devIPs = ["127.0.0.1", "::1"];
        return [...allowedIPs, ...devIPs];
    }
    return allowedIPs;
}

/**
 * Create IP whitelist middleware for specific endpoints
 * @param whitelist - Array of allowed IP addresses from env or config
 */
export const createIPWhitelistMiddleware = (
    whitelist: string[],
    nodeEnv: NodeEnv
) => {
    return (req: RequestWithIP, res: Response, next: NextFunction) => {
        const clientIP = req.clientIP || "unknown";

        const allowedIPs = getAllowedIPs(whitelist, nodeEnv);
        if (allowedIPs.includes(clientIP)) {
            return next();
        }

        return res.status(403).json({
            error: "Forbidden",
            message: "Your IP address is not whitelisted for this endpoint",
        });
    };
};
