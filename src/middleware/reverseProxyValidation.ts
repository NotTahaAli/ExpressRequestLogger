import { Request, Response, NextFunction } from "express";
import { NodeEnv } from "../configs/app.config.js";

export function getAllowedReverseProxyIPs(reverseProxyIPs: string[], nodeEnv: NodeEnv): string[] {
    if (nodeEnv === "development") {
        const devIPs = ["127.0.0.1", "::1"];
        return [...reverseProxyIPs, ...devIPs];
    }
    return reverseProxyIPs;
}

/**
 * Middleware to validate reverse proxy connections
 * Ensures requests only come through approved proxies
 */
export const reverseProxyValidationMiddleware = (
    allowReverseProxies: boolean,
    reverseProxyIPs: string[],
    nodeEnv: NodeEnv
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const hasXForwardedFor = req.headers["x-forwarded-for"];

        // If reverse proxies are disabled, reject any request with X-Forwarded-For header
        if (!allowReverseProxies && hasXForwardedFor) {
            return res.status(403).json({
                error: "Forbidden",
                message: "Reverse proxy requests are not allowed",
            });
        }

        // If reverse proxies are restricted to specific IPs
        if (
            allowReverseProxies &&
            reverseProxyIPs.length > 0 &&
            hasXForwardedFor
        ) {
            // Get the direct connecting IP (the proxy that connected to us)
            const directConnectIP = req.socket.remoteAddress || "unknown";

            const allowedIPs = getAllowedReverseProxyIPs(reverseProxyIPs, nodeEnv);
            if (!allowedIPs.includes(directConnectIP)) {
                return res.status(403).json({
                    error: "Forbidden",
                    message: "Request must come through an approved reverse proxy",
                });
            }
        }

        next();
    };
};
