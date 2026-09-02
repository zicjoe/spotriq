import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabasePool } from "./index.js";

const config = loadServerConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");
const database = getDatabasePool(config.databaseUrl, {
  max: config.databasePoolMax,
  idleTimeoutMs: config.databaseIdleTimeoutMs,
  connectionTimeoutMs: config.databaseConnectionTimeoutMs,
  statementTimeoutMs: Math.max(config.databaseStatementTimeoutMs, 120_000),
  applicationName: "spotriq-migrate",
})!;
const lockClient=await database.connect();
const lockKey="spotriq:migrations:v1";
const checksum=(value:string)=>createHash("sha256").update(value).digest("hex");
let advisoryLockHeld=false;

async function acquireMigrationLock():Promise<void>{
  const deadline=Date.now()+60_000;
  while(Date.now()<deadline){
    const result=await lockClient.query<{locked:boolean}>("select pg_try_advisory_lock(hashtext($1)) as locked",[lockKey]);
    if(result.rows[0]?.locked){advisoryLockHeld=true;return;}
    await sleep(1000);
  }
  throw new Error("Timed out waiting 60s for the Spotriq migration advisory lock. Another deploy may still be migrating; do not run concurrent schema writers.");
}

try {
  await acquireMigrationLock();
  await lockClient.query(`
    create table if not exists _spotriq_migrations (
      name text primary key,
      checksum_sha256 text,
      applied_at timestamptz not null default now()
    )
  `);
  await lockClient.query("alter table _spotriq_migrations add column if not exists checksum_sha256 text");

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.resolve(currentDir, "../migrations");
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();

  for (const name of files) {
    const sql = await readFile(path.join(migrationsDir, name), "utf8");
    const digest=checksum(sql);
    const applied = await lockClient.query<{checksum_sha256:string|null}>("select checksum_sha256 from _spotriq_migrations where name = $1", [name]);
    if (applied.rowCount) {
      const stored=applied.rows[0]?.checksum_sha256;
      if (stored && stored !== digest) throw new Error(`Migration drift detected for ${name}: applied checksum ${stored} differs from repository ${digest}. Historical migrations must not be mutated.`);
      if (!stored) await lockClient.query("update _spotriq_migrations set checksum_sha256=$2 where name=$1 and checksum_sha256 is null",[name,digest]);
      continue;
    }
    try {
      await lockClient.query("begin");
      await lockClient.query(sql);
      await lockClient.query("insert into _spotriq_migrations(name,checksum_sha256) values ($1,$2)", [name,digest]);
      await lockClient.query("commit");
      console.log(`Applied ${name}`);
    } catch (error) {
      await lockClient.query("rollback");
      throw error;
    }
  }
} finally {
  try { if(advisoryLockHeld)await lockClient.query("select pg_advisory_unlock(hashtext($1))",[lockKey]); } finally { lockClient.release(); await closeDatabase(); }
}
