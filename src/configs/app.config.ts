import { env } from "./env.js";

export type NodeEnv = "development" | "production" | "test";

export interface AppConfig {
    port: number;
    nodeEnv: NodeEnv;
    allowReverseProxies: boolean;
    reverseProxyIPs: string[];
    ipWhitelistEnabled: boolean;
    allowedIPs: string[];
}

export const appConfig: AppConfig = {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    allowReverseProxies: env.ALLOW_REVERSE_PROXIES,
    reverseProxyIPs: env.REVERSE_PROXY_IPS,
    ipWhitelistEnabled: env.IP_WHITELIST_ENABLED,
    allowedIPs: env.ALLOWED_IPS,
};
