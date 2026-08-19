import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabaseHealth } from "@spotriq/db";

const config = loadServerConfig();
let shuttingDown = false;
let timer: NodeJS.Timeout | undefined;

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
    note: "Smart Money Check currently executes through the API process; Redis/BullMQ worker execution is introduced when queue infrastructure becomes necessary.",
    at: new Date().toISOString(),
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

// The referenced heartbeat interval intentionally keeps the worker alive until SIGINT/SIGTERM.
// Do not unref this timer: doing so would let Node exit, while an unresolved top-level await
// produces an unsettled-await warning under current Node releases.
