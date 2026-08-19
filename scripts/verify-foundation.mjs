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
  "packages/protocol-pancakeswap/package.json",
  "packages/protocol-pancakeswap/src/index.ts",
  "packages/protocol-pancakeswap/src/abis.ts",
  "apps/api/src/routes/pancakeswap.ts",
  "packages/protocol-venus/package.json",
  "packages/protocol-venus/src/index.ts",
  "packages/db/migrations/0004_venus_health_positions.sql",
  "packages/db/migrations/0005_yield_opportunities.sql",
  "apps/api/src/routes/venus.ts",
  "packages/market-context/package.json",
  "packages/market-context/src/index.ts",
  "packages/db/migrations/0006_grid_market_context.sql",
  "apps/api/src/routes/market-context.ts",
  "packages/smart-money/package.json",
  "packages/smart-money/src/index.ts",
  "packages/db/migrations/0003_smart_money_rebalancing.sql",
  "apps/api/src/routes/checks.ts",
  "apps/web/src/repositories/smartMoneyRepository.ts",
  "apps/web/src/services/smartMoneyRealtime.ts",
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

const pancake = await readFile(path.join(root, "packages/protocol-pancakeswap/src/index.ts"), "utf8");
for (const marker of ["PANCAKESWAP_CONTRACTS", "getV3Position", "getInfinityClPosition", "getWalletPositions", "classifyLiquidityRange"]) {
  if (!pancake.includes(marker)) throw new Error(`PancakeSwap adapter is missing ${marker}.`);
}

const pancakeRoutes = await readFile(path.join(root, "apps/api/src/routes/pancakeswap.ts"), "utf8");
for (const route of ["/v1/protocols/pancakeswap/status", "/v1/protocols/pancakeswap/positions/:version/:tokenId", "/v1/wallets/:address/pancakeswap/positions"]) {
  if (!pancakeRoutes.includes(route)) throw new Error(`Missing PancakeSwap route ${route}.`);
}

if (!evidence.includes("PANCAKE_CL_RANGE_STATE") || !evidence.includes("PANCAKE_CL_SQRT_PRICE") || !evidence.includes("SPOTRIQ_DERIVED")) {
  throw new Error("Evidence Engine must include PancakeSwap range-state methodology and derived provenance.");
}


const venus = await readFile(path.join(root, "packages/protocol-venus/src/index.ts"), "utf8");
for (const marker of ["VENUS_BOOTSTRAP_CONTRACTS", "getWalletPositions", "getYieldOpportunities", "supplyRatePerBlock", "getAccountLiquidity", "classifyVenusRisk", "ProtocolShareReserve", "isForcedLiquidationEnabled", "liquidationThresholdMantissa,uint256 liquidationIncentiveMantissa"]) {
  if (!venus.includes(marker)) throw new Error(`Venus adapter is missing ${marker}.`);
}
const venusRoutes = await readFile(path.join(root, "apps/api/src/routes/venus.ts"), "utf8");
for (const route of ["/v1/protocols/venus/status", "/v1/wallets/:address/venus/positions", "/v1/wallets/:address/venus/yield-opportunities"]) {
  if (!venusRoutes.includes(route)) throw new Error(`Missing Venus route ${route}.`);
}
if (!evidence.includes("VENUS_ACCOUNT_LIQUIDITY") || !evidence.includes("VENUS_HEALTH_FACTOR") || !evidence.includes("VENUS_SUPPLY_APY")) {
  throw new Error("Evidence Engine must include Venus account-liquidity and health-factor methodologies.");
}

const smartMoneyPackage = JSON.parse(await readFile(path.join(root, "packages/smart-money/package.json"), "utf8"));
if (smartMoneyPackage?.exports?.["."] !== "./src/index.ts") {
  throw new Error("@spotriq/smart-money must export ./src/index.ts for tsx workspace development.");
}
const smartMoney = await readFile(path.join(root, "packages/smart-money/src/index.ts"), "utf8");
for (const marker of ["createSmartMoneyEngine", "createRebalancingFinding", "createHealthFinding", "createYieldFinding", "SMART_MONEY_YIELD_METHOD", "PostgresSmartMoneyStore", "MemorySmartMoneyStore", "SMART_MONEY_REBALANCING_METHOD", "SMART_MONEY_HEALTH_METHOD"]) {
  if (!smartMoney.includes(marker)) throw new Error(`Smart Money engine is missing ${marker}.`);
}

const grid = await readFile(path.join(root, "packages/market-context/src/index.ts"), "utf8");
for (const marker of ["classifyGridRegime", "getWalletMarketContexts", "observeV3Pool", "RANGE_LIKE", "INSUFFICIENT_HISTORY"]) {
  if (!grid.includes(marker)) throw new Error(`Grid market-context engine is missing ${marker}.`);
}
const marketContextRoutes = await readFile(path.join(root, "apps/api/src/routes/market-context.ts"), "utf8");
for (const route of ["/v1/wallets/:address/grid/market-context", "/v1/grid/pools/:poolAddress/context"]) {
  if (!marketContextRoutes.includes(route)) throw new Error(`Missing Grid market-context route ${route}.`);
}
if (!evidence.includes("GRID_MARKET_REGIME")) throw new Error("Evidence Engine must include Grid market-regime methodology.");
if (!smartMoney.includes("createGridFinding") || !smartMoney.includes("SMART_MONEY_GRID_METHOD")) throw new Error("Smart Money engine must include deterministic Grid findings.");

const checkRoutes = await readFile(path.join(root, "apps/api/src/routes/checks.ts"), "utf8");
for (const route of ["/v1/checks", "/v1/checks/:checkSessionId", "/v1/checks/:checkSessionId/findings", "/v1/checks/:checkSessionId/events"]) {
  if (!checkRoutes.includes(route)) throw new Error(`Missing Smart Money Check route ${route}.`);
}
const appUi = await readFile(path.join(root, "apps/web/src/app/App.tsx"), "utf8");
if (!appUi.includes("smartMoneyRepository.startCheck") || !appUi.includes("subscribeToSmartMoneyCheck") || !appUi.includes("Live BSC data")) {
  throw new Error("Smart Money Check UI must be wired to the live API while retaining example mode.");
}

console.log("Spotriq foundation + BSC/evidence + PancakeSwap + Venus Health + Yield + Grid market context + Smart Money Check verification passed.");
