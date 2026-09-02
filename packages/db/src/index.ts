import { performance } from "node:perf_hooks";
import pg, { type Pool as PgPool } from "pg";
import type { DependencyHealth } from "@spotriq/domain";

const { Pool } = pg;
let pool: PgPool | undefined;
let activeUrl: string | undefined;
let activeOptionsKey: string | undefined;

export interface DatabasePoolOptions {
  max?: number;
  idleTimeoutMs?: number;
  connectionTimeoutMs?: number;
  statementTimeoutMs?: number;
  applicationName?: string;
}

export function getDatabasePool(databaseUrl?: string, options: DatabasePoolOptions = {}): PgPool | undefined {
  if (!databaseUrl) return undefined;
  const normalized = {
    max: Math.max(1, Math.min(100, Math.floor(options.max ?? 10))),
    idleTimeoutMs: Math.max(1000, Math.floor(options.idleTimeoutMs ?? 30_000)),
    connectionTimeoutMs: Math.max(1000, Math.floor(options.connectionTimeoutMs ?? 5_000)),
    statementTimeoutMs: Math.max(1000, Math.floor(options.statementTimeoutMs ?? 20_000)),
    applicationName: options.applicationName?.trim() || "spotriq",
  };
  const optionsKey=JSON.stringify(normalized);
  if (!pool || activeUrl !== databaseUrl || activeOptionsKey !== optionsKey) {
    void pool?.end();
    pool = new Pool({
      connectionString: databaseUrl,
      max: normalized.max,
      idleTimeoutMillis: normalized.idleTimeoutMs,
      connectionTimeoutMillis: normalized.connectionTimeoutMs,
      statement_timeout: normalized.statementTimeoutMs,
      application_name: normalized.applicationName,
    });
    activeUrl = databaseUrl;
    activeOptionsKey = optionsKey;
  }
  return pool;
}

export async function getDatabaseHealth(databaseUrl?: string, options?: DatabasePoolOptions): Promise<DependencyHealth> {
  if (!databaseUrl) {
    return { name: "postgres", state: "not_configured", detail: "DATABASE_URL is not configured." };
  }
  const database = getDatabasePool(databaseUrl, options)!;
  const started = performance.now();
  try {
    await database.query("select 1 as ok");
    return { name: "postgres", state: "ok", latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    return {
      name: "postgres",
      state: "unavailable",
      latencyMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : "Unknown PostgreSQL error",
    };
  }
}

export async function closeDatabase(): Promise<void> {
  if (pool) await pool.end();
  pool = undefined;
  activeUrl = undefined;
  activeOptionsKey = undefined;
}
