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
  bscRpcTimeoutMs: number;
  agentDiscoveryChainId: 56 | 97;
  scan8004BaseUrl: string;
  scan8004ApiKey?: string;
  scan8004TimeoutMs: number;
  marketplaceTestTimeoutMs: number;
  marketplaceTestMaxResponseBytes: number;
  marketplaceTestMaxRedirects: number;
  serviceTaskTimeoutMs: number;
  serviceTaskMaxResponseBytes: number;
  serviceTaskMaxRedirects: number;
  agentRegistryMainnetRpc?: string;
  agentRegistryTestnetRpc?: string;
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


function parsePositiveInt(value: string | undefined, fallback: number, label: string): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`Invalid ${label}: ${value}`);
  return parsed;
}

function parseEnvironment(value: string | undefined): SpotriqEnvironment {
  if (!value) return "development";
  if (value === "development" || value === "staging" || value === "production") return value;
  throw new Error(`Invalid SPOTRIQ_ENV: ${value}`);
}


function parseAgentDiscoveryChainId(value: string | undefined): 56 | 97 {
  if (!value) return 56;
  const parsed = Number(value);
  if (parsed === 56 || parsed === 97) return parsed;
  throw new Error(`Invalid AGENT_DISCOVERY_CHAIN_ID: ${value}. Expected 56 or 97.`);
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
    bscRpcTimeoutMs: parsePositiveInt(env.BSC_RPC_TIMEOUT_MS, 7500, "BSC_RPC_TIMEOUT_MS"),
    agentDiscoveryChainId: parseAgentDiscoveryChainId(env.AGENT_DISCOVERY_CHAIN_ID),
    scan8004BaseUrl: env.SCAN8004_BASE_URL?.trim() || "https://8004scan.io/api/v1/public",
    scan8004ApiKey: optional(env.SCAN8004_API_KEY),
    scan8004TimeoutMs: parsePositiveInt(env.SCAN8004_TIMEOUT_MS, 7500, "SCAN8004_TIMEOUT_MS"),
    marketplaceTestTimeoutMs: parsePositiveInt(env.MARKETPLACE_TEST_TIMEOUT_MS, 5000, "MARKETPLACE_TEST_TIMEOUT_MS"),
    marketplaceTestMaxResponseBytes: parsePositiveInt(env.MARKETPLACE_TEST_MAX_RESPONSE_BYTES, 256000, "MARKETPLACE_TEST_MAX_RESPONSE_BYTES"),
    marketplaceTestMaxRedirects: parsePositiveInt(env.MARKETPLACE_TEST_MAX_REDIRECTS, 2, "MARKETPLACE_TEST_MAX_REDIRECTS"),
    serviceTaskTimeoutMs: parsePositiveInt(env.SERVICE_TASK_TIMEOUT_MS, 10000, "SERVICE_TASK_TIMEOUT_MS"),
    serviceTaskMaxResponseBytes: parsePositiveInt(env.SERVICE_TASK_MAX_RESPONSE_BYTES, 384000, "SERVICE_TASK_MAX_RESPONSE_BYTES"),
    serviceTaskMaxRedirects: parsePositiveInt(env.SERVICE_TASK_MAX_REDIRECTS, 2, "SERVICE_TASK_MAX_REDIRECTS"),
    agentRegistryMainnetRpc: optional(env.AGENT_REGISTRY_MAINNET_RPC),
    agentRegistryTestnetRpc: optional(env.AGENT_REGISTRY_TESTNET_RPC),
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
