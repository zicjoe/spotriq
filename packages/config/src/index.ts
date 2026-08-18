import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotEnv } from "dotenv";
import type { BscNetwork, SpotriqEnvironment } from "@spotriq/domain";

function loadNearestDotEnv(startDir: string): void {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = path.join(current, ".env");
    if (existsSync(candidate)) {
      loadDotEnv({ path: candidate, quiet: true, override: false });
      return;
    }
    const parent = path.dirname(current);
    if (parent === current) return;
    current = parent;
  }
}

loadNearestDotEnv(process.cwd());


export interface ServerConfig {
  nodeEnv: string;
  appEnv: SpotriqEnvironment;
  apiHost: string;
  apiPort: number;
  corsOrigins: string[];
  databaseUrl?: string;
  redisUrl?: string;
  bscNetwork: BscNetwork;
  bscRpcPrimary?: string;
  bscRpcSecondary?: string;
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid API_PORT: ${value}`);
  }
  return parsed;
}

function parseEnvironment(value: string | undefined): SpotriqEnvironment {
  if (!value) return "development";
  if (value === "development" || value === "staging" || value === "production") return value;
  throw new Error(`Invalid SPOTRIQ_ENV: ${value}`);
}

function parseNetwork(value: string | undefined): BscNetwork {
  if (!value) return "testnet";
  if (value === "testnet" || value === "mainnet") return value;
  throw new Error(`Invalid BSC_NETWORK: ${value}`);
}

export function loadServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const appEnv = parseEnvironment(env.SPOTRIQ_ENV);
  const config: ServerConfig = {
    nodeEnv: env.NODE_ENV ?? "development",
    appEnv,
    apiHost: env.API_HOST?.trim() || "0.0.0.0",
    apiPort: parsePort(env.API_PORT, 3001),
    corsOrigins: (env.CORS_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    databaseUrl: optional(env.DATABASE_URL),
    redisUrl: optional(env.REDIS_URL),
    bscNetwork: parseNetwork(env.BSC_NETWORK),
    bscRpcPrimary: optional(env.BSC_RPC_PRIMARY),
    bscRpcSecondary: optional(env.BSC_RPC_SECONDARY),
  };

  if (appEnv === "production") {
    const missing = [
      !config.databaseUrl && "DATABASE_URL",
      !config.bscRpcPrimary && "BSC_RPC_PRIMARY",
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new Error(`Missing required production configuration: ${missing.join(", ")}`);
    }
  }

  return config;
}
