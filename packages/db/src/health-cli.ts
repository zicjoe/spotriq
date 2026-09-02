import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabaseHealth } from "./index.js";

const config = loadServerConfig();
const health = await getDatabaseHealth(config.databaseUrl,{max:config.databasePoolMax,idleTimeoutMs:config.databaseIdleTimeoutMs,connectionTimeoutMs:config.databaseConnectionTimeoutMs,statementTimeoutMs:config.databaseStatementTimeoutMs,applicationName:"spotriq-db-health"});
console.log(JSON.stringify(health, null, 2));
await closeDatabase();
if (health.state === "unavailable") process.exitCode = 1;
