import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { loadServerConfig } from "@spotriq/config";
import { closeDatabase, getDatabasePool } from "./index.js";

const config = loadServerConfig();
if (!config.databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");
const database = getDatabasePool(config.databaseUrl)!;

await database.query(`
  create table if not exists _spotriq_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, "../migrations");
const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();

for (const name of files) {
  const applied = await database.query("select 1 from _spotriq_migrations where name = $1", [name]);
  if (applied.rowCount) continue;
  const sql = await readFile(path.join(migrationsDir, name), "utf8");
  const client = await database.connect();
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into _spotriq_migrations(name) values ($1)", [name]);
    await client.query("commit");
    console.log(`Applied ${name}`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

await closeDatabase();
