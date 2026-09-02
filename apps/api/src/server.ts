import { loadServerConfig } from "@spotriq/config";
import { closeDatabase } from "@spotriq/db";
import { buildServer } from "./app.js";

const config = loadServerConfig();
const app = await buildServer({ config });
let shuttingDown=false;

const shutdown = async (signal: string) => {
  if(shuttingDown)return;
  shuttingDown=true;
  app.log.info({ signal }, "shutting down Spotriq API");
  const force=setTimeout(()=>{
    app.log.error({signal},"Spotriq API graceful shutdown exceeded 15s hard limit");
    process.exit(1);
  },15_000);
  force.unref();
  try{
    await app.close();
    await closeDatabase();
    clearTimeout(force);
    process.exit(0);
  }catch(error){
    clearTimeout(force);
    app.log.error(error,"Spotriq API shutdown failed");
    process.exit(1);
  }
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
      rateLimitEnabled: config.rateLimitEnabled,
      trustProxyHops: config.trustProxyHops,
    },
    "Spotriq API ready",
  );
} catch (error) {
  app.log.error(error);
  await closeDatabase();
  process.exit(1);
}
