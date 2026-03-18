import dotenv from "dotenv";
import { z } from "zod";
import { logger } from "../utils/logger.util.js";

dotenv.config();

const splitCsv = (value: string): string[] =>
    value
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0);

const envSchema = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ALLOW_REVERSE_PROXIES: z
        .string()
        .default("true")
        .transform((value) => value !== "false"),
    REVERSE_PROXY_IPS: z.string().default("").transform(splitCsv),
    IP_WHITELIST_ENABLED: z
        .string()
        .default("false")
        .transform((value) => value === "true"),
    ALLOWED_IPS: z.string().default("").transform(splitCsv),
});

const parseResult = envSchema.safeParse(process.env);
if (!parseResult.success) {
    logger.error("❌ Invalid environment variables:", parseResult.error.format());
    process.exit(1);
}

export const env = parseResult.data;
export type Env = typeof env;
