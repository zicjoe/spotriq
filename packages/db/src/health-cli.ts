import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabaseHealth } from "./index.js";

const config = loadServerConfig();
const health = await getDatabaseHealth(config.databaseUrl);
console.log(JSON.stringify(health, null, 2));
await closeDatabase();
if (health.state === "unavailable") process.exitCode = 1;
