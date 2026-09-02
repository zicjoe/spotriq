import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabaseHealth, getDatabasePool } from "@spotriq/db";
import { createWorkerHeartbeat, MemoryOperationalHealthStore, PostgresOperationalHealthStore } from "@spotriq/observability";

const config = loadServerConfig();
let shuttingDown = false;
let timer: NodeJS.Timeout | undefined;
const database = getDatabasePool(config.databaseUrl);
const store = database
  ? new PostgresOperationalHealthStore({ query: async (text, values) => { const result = await database.query(text, values); return { rows: result.rows, rowCount: result.rowCount }; } })
  : new MemoryOperationalHealthStore();
const workerId = process.env.RAILWAY_REPLICA_ID?.trim() || process.env.HOSTNAME?.trim() || `worker:${process.pid}`;

async function heartbeat(): Promise<void> {
  const databaseHealth = await getDatabaseHealth(config.databaseUrl);
  const value = createWorkerHeartbeat({
    workerId,
    version: "0.35.0",
    environment: config.appEnv,
    network: config.bscNetwork,
    databaseState: databaseHealth.state,
    redisConfigured: Boolean(config.redisUrl),
    jobsEnabled: false,
    jobExecutionMode: "API_INLINE",
    processUptimeSeconds: process.uptime(),
  });
  try { await store.saveWorkerHeartbeat(value); } catch (error) {
    console.error(JSON.stringify({ service:"spotriq-worker",event:"heartbeat_persist_failed",detail:error instanceof Error?error.message:String(error),at:new Date().toISOString() }));
  }
  console.log(JSON.stringify({
    service: "spotriq-worker",
    event: "heartbeat",
    environment: config.appEnv,
    network: config.bscNetwork,
    database: databaseHealth,
    redisConfigured: Boolean(config.redisUrl),
    jobsEnabled: false,
    jobExecutionMode: "API_INLINE",
    workerId,
    at: value.observedAt,
  }));
}

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ service: "spotriq-worker", event: "shutdown", signal }));
  if (timer) clearInterval(timer);
  await closeDatabase();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await heartbeat();
timer = setInterval(() => void heartbeat(), 30_000);
