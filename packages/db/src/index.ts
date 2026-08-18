import { performance } from "node:perf_hooks";
import pg, { type Pool as PgPool } from "pg";
import type { DependencyHealth } from "@spotriq/domain";

const { Pool } = pg;
let pool: PgPool | undefined;
let activeUrl: string | undefined;

export function getDatabasePool(databaseUrl?: string): PgPool | undefined {
  if (!databaseUrl) return undefined;
  if (!pool || activeUrl !== databaseUrl) {
    void pool?.end();
    pool = new Pool({
      connectionString: databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    activeUrl = databaseUrl;
  }
  return pool;
}

export async function getDatabaseHealth(databaseUrl?: string): Promise<DependencyHealth> {
  if (!databaseUrl) {
    return { name: "postgres", state: "not_configured", detail: "DATABASE_URL is not configured." };
  }
  const database = getDatabasePool(databaseUrl)!;
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
}
