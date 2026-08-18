import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabaseHealth } from "@spotriq/db";

const config = loadServerConfig();
let shuttingDown = false;

async function heartbeat(): Promise<void> {
  const database = await getDatabaseHealth(config.databaseUrl);
  console.log(JSON.stringify({
    service: "spotriq-worker",
    event: "heartbeat",
    environment: config.appEnv,
    network: config.bscNetwork,
    database,
    redisConfigured: Boolean(config.redisUrl),
    jobsEnabled: false,
    note: "Queue-backed jobs are introduced after the BSC/evidence data spine.",
    at: new Date().toISOString(),
  }));
}

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ service: "spotriq-worker", event: "shutdown", signal }));
  clearInterval(timer);
  await closeDatabase();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await heartbeat();
const timer = setInterval(() => void heartbeat(), 30_000);
timer.unref();

// Keep the worker process alive even before Redis/BullMQ is introduced.
await new Promise<void>(() => undefined);
