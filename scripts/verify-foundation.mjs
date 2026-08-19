import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "apps/web/package.json",
  "apps/api/package.json",
  "apps/worker/package.json",
  "packages/domain/package.json",
  "packages/config/package.json",
  "packages/api-contracts/package.json",
  "packages/db/package.json",
  "packages/db/migrations/0001_core_foundation.sql",
  "packages/db/migrations/0002_chain_evidence_spine.sql",
  "packages/chain/package.json",
  "packages/chain/src/index.ts",
  "packages/evidence/package.json",
  "packages/evidence/src/index.ts",
  ".env.example",
  ".gitignore",
];

for (const relative of required) {
  await access(path.join(root, relative));
}

const workspace = await readFile(path.join(root, "pnpm-workspace.yaml"), "utf8");
if (!workspace.includes("apps/*") || !workspace.includes("packages/*")) {
  throw new Error("pnpm-workspace.yaml must include apps/* and packages/*.");
}

const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
if (!gitignore.includes("node_modules/") || !gitignore.includes(".env")) {
  throw new Error(".gitignore must exclude dependencies and local environment secrets.");
}

const domainCompatibility = await readFile(path.join(root, "apps/web/src/domain/types.ts"), "utf8");
if (!domainCompatibility.includes('@spotriq/domain')) {
  throw new Error("The web app must consume the shared @spotriq/domain package.");
}

const apiApp = await readFile(path.join(root, "apps/api/src/app.ts"), "utf8");
if (!apiApp.includes('/health') || !apiApp.includes('/v1/meta')) {
  throw new Error("The API skeleton must expose health and metadata routes.");
}

const chainRoutes = await readFile(path.join(root, "apps/api/src/routes/chain.ts"), "utf8");
for (const route of ["/v1/chain/status", "/v1/chain/blocks/:blockNumber", "/v1/chain/transactions/:hash", "/v1/wallets/:address/balances"]) {
  if (!chainRoutes.includes(route)) throw new Error(`Missing BSC route ${route}.`);
}

const evidence = await readFile(path.join(root, "packages/evidence/src/index.ts"), "utf8");
if (!evidence.includes("CANONICAL_ONCHAIN") || !evidence.includes("assessFreshness") || !evidence.includes("detectEvidenceConflicts")) {
  throw new Error("Evidence Engine must preserve truth layers, freshness, and conflict detection.");
}

console.log("Spotriq foundation + BSC/evidence verification passed.");
