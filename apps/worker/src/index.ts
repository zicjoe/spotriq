import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabaseHealth, getDatabasePool } from "@spotriq/db";
import { createWorkerHeartbeat, MemoryOperationalHealthStore, PostgresOperationalHealthStore } from "@spotriq/observability";
import { MemoryDurableWorkQueue, MemoryRateLimitStore, PostgresDurableWorkQueue, PostgresRateLimitStore, retryDelayMs, type DurableWorkQueue, type RateLimitStore } from "@spotriq/production-hardening";

const config = loadServerConfig();
let shuttingDown = false;
let heartbeatTimer: NodeJS.Timeout | undefined;
let pollTimer: NodeJS.Timeout | undefined;
let inFlight: Promise<void> | undefined;
const dbPoolOptions={max:config.databasePoolMax,idleTimeoutMs:config.databaseIdleTimeoutMs,connectionTimeoutMs:config.databaseConnectionTimeoutMs,statementTimeoutMs:config.databaseStatementTimeoutMs,applicationName:"spotriq-worker"};
const database = getDatabasePool(config.databaseUrl,dbPoolOptions);
const sqlDatabase=database?{query:async<Row=Record<string,unknown>>(text:string,values?:unknown[])=>{const result=await database.query(text,values);return{rows:result.rows as unknown as Row[],rowCount:result.rowCount}}}:undefined;
const store = database
  ? new PostgresOperationalHealthStore(sqlDatabase!)
  : new MemoryOperationalHealthStore();
const queue:DurableWorkQueue=sqlDatabase?new PostgresDurableWorkQueue(sqlDatabase):new MemoryDurableWorkQueue();
const rateLimits:RateLimitStore=sqlDatabase?new PostgresRateLimitStore(sqlDatabase):new MemoryRateLimitStore();
const workerId = process.env.RAILWAY_REPLICA_ID?.trim() || process.env.HOSTNAME?.trim() || `worker:${process.pid}`;

async function heartbeat(): Promise<void> {
  const databaseHealth = await getDatabaseHealth(config.databaseUrl,dbPoolOptions);
  const value = createWorkerHeartbeat({
    workerId,
    version: "0.38.0",
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
  console.log(JSON.stringify({service:"spotriq-worker",event:"heartbeat",environment:config.appEnv,network:config.bscNetwork,database:databaseHealth,redisConfigured:Boolean(config.redisUrl),jobsEnabled:false,financialJobExecutionMode:"API_INLINE",maintenanceQueueEnabled:Boolean(database),workerId,at:value.observedAt}));
}

function maintenanceBucket(now=new Date()):string{return now.toISOString().slice(0,13)}
async function enqueueMaintenance():Promise<void>{
  if(!database)return;
  await queue.enqueue({kind:"CLEANUP_RATE_LIMIT_BUCKETS",payload:{scheduledBy:"spotriq-worker"},idempotencyKey:`maintenance:rate-limit:${maintenanceBucket()}`,maxAttempts:5});
}
async function pollOnce():Promise<void>{
  if(shuttingDown||inFlight)return;
  inFlight=(async()=>{
    try{
      await enqueueMaintenance();
      const job=await queue.claim(workerId,config.workerLeaseMs,["CLEANUP_RATE_LIMIT_BUCKETS"]);
      if(!job)return;
      try{
        if(job.kind==="CLEANUP_RATE_LIMIT_BUCKETS")await rateLimits.cleanup?.();
        await queue.complete(job.jobId,workerId);
      }catch(error){
        await queue.fail(job.jobId,workerId,error instanceof Error?error.message:String(error),retryDelayMs(job.attempts));
      }
    }catch(error){console.error(JSON.stringify({service:"spotriq-worker",event:"maintenance_poll_failed",detail:error instanceof Error?error.message:String(error),at:new Date().toISOString()}));}
    finally{inFlight=undefined;}
  })();
  await inFlight;
}

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(JSON.stringify({ service: "spotriq-worker", event: "shutdown", signal }));
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (pollTimer) clearInterval(pollTimer);
  if(inFlight)await Promise.race([inFlight,new Promise<void>(resolve=>setTimeout(resolve,Math.min(config.workerLeaseMs,10_000)))]);
  await closeDatabase();
  process.exit(0);
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

await heartbeat();
await pollOnce();
heartbeatTimer = setInterval(() => void heartbeat(), 30_000);
pollTimer = setInterval(() => void pollOnce(), config.workerPollIntervalMs);
