import { loadServerConfig } from "@spotriq/config";
import { closeDatabase } from "@spotriq/db";
import { buildServer } from "./app.js";

const config = loadServerConfig();
const app = await buildServer({ config });

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down Spotriq API");
  await app.close();
  await closeDatabase();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ host: config.apiHost, port: config.apiPort });
  app.log.info(
    {
      environment: config.appEnv,
      network: config.bscNetwork,
      databaseConfigured: Boolean(config.databaseUrl),
    },
    "Spotriq API ready",
  );
} catch (error) {
  app.log.error(error);
  await closeDatabase();
  process.exit(1);
}
