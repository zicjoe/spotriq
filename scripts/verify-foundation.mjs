import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const required = [
  "SPOTRIQ_FOUNDATION.md",
  "PROJECT_STATE.md",
  "SPOTRIQ_DRIFT_AUDIT.md",
  "CORRECTED_ROADMAP.md",
  "PROJECT_OPERATING_RULES.md",
  "docs/history/SPOTRIQ_FOUNDATIONAL_HANDOFF_ARCHIVE.md",
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
  "packages/agent-registry/package.json",
  "packages/agent-registry/src/index.ts",
  "packages/db/migrations/0007_agent_registry_discovery.sql",
  "apps/api/src/routes/agents.ts",
  "apps/web/src/repositories/agentRegistryRepository.ts",
  "packages/marketplace-supply/package.json",
  "packages/marketplace-supply/src/index.ts",
  "packages/marketplace-supply/src/test-lab.ts",
  "packages/db/migrations/0008_marketplace_service_readiness.sql",
  "packages/db/migrations/0009_marketplace_test_lab.sql",
  "apps/api/src/routes/marketplace.ts",
  "apps/web/src/repositories/marketplaceSupplyRepository.ts",
  "docs/IMPLEMENTATION_REPORT_FINANCIAL_SUPPLY_DISCOVERY_v0.11.0.md",
  "docs/MARKETPLACE_TEST_LAB.md",
  "docs/IMPLEMENTATION_REPORT_MARKETPLACE_TEST_LAB_v0.12.0.md",
  "docs/FINDING_SERVICE_COMPATIBILITY.md",
  "docs/IMPLEMENTATION_REPORT_FINDING_SERVICE_COMPATIBILITY_v0.13.0.md",
  "packages/job-intents/package.json",
  "packages/job-intents/src/index.ts",
  "apps/api/src/routes/job-intents.ts",
  "apps/web/src/repositories/jobIntentRepository.ts",
  "docs/REBALANCING_JOB_INTENT.md",
  "docs/IMPLEMENTATION_REPORT_REBALANCING_JOB_INTENT_v0.14.0.md",
  "packages/authority/package.json",
  "packages/authority/src/index.ts",
  "packages/authority/src/altana.ts",
  "apps/api/src/routes/authority.ts",
  "apps/web/src/repositories/authorityRepository.ts",
  "docs/BOUNDED_PERMISSION_AUTHORITY.md",
  "docs/IMPLEMENTATION_REPORT_BOUNDED_PERMISSION_AUTHORITY_v0.15.0.md",
  "packages/marketplace-supply/src/authority-binding.ts",
  "packages/execution-guard/package.json",
  "packages/execution-guard/src/index.ts",
  "packages/db/migrations/0010_trusted_agent_binding_and_altana_probe.sql",
  "apps/web/src/services/altanaHandlers.ts",
  "docs/TRUSTED_BINDING_AND_EXECUTION_GUARD.md",
  "docs/IMPLEMENTATION_REPORT_TRUSTED_BINDING_EXECUTION_GUARD_v0.16.0.md",
  "packages/execution-plans/package.json",
  "packages/execution-plans/src/index.ts",
  "packages/execution-boundary/package.json",
  "packages/execution-boundary/src/index.ts",
  "packages/db/migrations/0011_rebalancing_execution_plan_boundary.sql",
  "apps/api/src/routes/execution-plans.ts",
  "apps/web/src/repositories/executionPlanRepository.ts",
  "docs/REBALANCING_EXECUTION_PLAN_BOUNDARY.md",
  "docs/IMPLEMENTATION_REPORT_REBALANCING_EXECUTION_PLAN_BOUNDARY_v0.17.0.md",
  "packages/db/migrations/0012_boundary_financial_session_readiness.sql",
  "docs/BOUNDARY_CONTROLLED_ALTANA_FINANCIAL_SESSION.md",
  "docs/IMPLEMENTATION_REPORT_BOUNDARY_FINANCIAL_SESSION_v0.18.0.md",
  "packages/controlled-execution/package.json",
  "packages/controlled-execution/src/index.ts",
  "packages/db/migrations/0013_controlled_rebalancing_execution.sql",
  "docs/CONTROLLED_BSC_TESTNET_REBALANCING_EXECUTION.md",
  "docs/IMPLEMENTATION_REPORT_CONTROLLED_REBALANCING_EXECUTION_v0.19.0.md",
  "packages/activity-outcomes/package.json",
  "packages/activity-outcomes/src/index.ts",
  "packages/db/migrations/0014_execution_activity_outcomes.sql",
  "apps/api/src/routes/activity-outcomes.ts",
  "apps/web/src/repositories/activityOutcomesRepository.ts",
  "docs/ACTIVITY_OUTCOMES.md",
  "docs/IMPLEMENTATION_REPORT_ACTIVITY_OUTCOMES_v0.20.0.md",
  "packages/service-tasks/package.json",
  "packages/service-tasks/src/index.ts",
  "packages/service-tasks/src/index.test.ts",
  "packages/db/migrations/0015_service_task_origin_proof.sql",
  "apps/api/src/routes/service-tasks.ts",
  "apps/api/src/routes/service-tasks.test.ts",
  "apps/web/src/repositories/serviceTaskRepository.ts",
  "docs/AGENTSERVICE_TASK_ORIGIN_PROOF.md",
  "docs/IMPLEMENTATION_REPORT_SERVICE_TASK_ORIGIN_PROOF_v0.21.0.md",
  "packages/reference-agents/package.json",
  "packages/reference-agents/src/index.ts",
  "packages/reference-agents/src/index.test.ts",
  "packages/config/src/index.test.ts",
  "apps/api/src/routes/reference-agents.ts",
  "docs/LIVE_REFERENCE_AGENT_SUPPLY.md",
  "docs/IMPLEMENTATION_REPORT_LIVE_REFERENCE_AGENT_SUPPLY_v0.22.0.md",
  "docs/IMPLEMENTATION_REPORT_REFERENCE_AGENT_ERC8004_RECONCILIATION_v0.22.2.md",
  "packages/commercial/package.json",
  "packages/commercial/src/index.ts",
  "packages/commercial/src/index.test.ts",
  "packages/db/migrations/0016_commercial_hiring_activation.sql",
  "apps/api/src/routes/commercial.ts",
  "apps/web/src/repositories/commercialRepository.ts",
  "scripts/verify-reference-acceptance.mjs",
  "scripts/verify-commercial-acceptance.mjs",
  "docs/COMMERCIAL_HIRING_ACTIVATION.md",
  "docs/IMPLEMENTATION_REPORT_COMMERCIAL_HIRING_ACTIVATION_v0.23.0.md",
  "packages/db/migrations/0017_four_category_activation_tasks.sql",
  "scripts/verify-activation-parity.mjs",
  "docs/IMPLEMENTATION_REPORT_FOUR_CATEGORY_ACTIVATION_PARITY_v0.24.0.md",
  "packages/permission-checkout/package.json",
  "packages/permission-checkout/src/index.ts",
  "packages/permission-checkout/src/index.test.ts",
  "packages/db/migrations/0018_permission_checkout_scoped_authority.sql",
  "apps/api/src/routes/permission-checkout.ts",
  "apps/api/src/routes/permission-checkout.test.ts",
  "apps/web/src/repositories/permissionCheckoutRepository.ts",
  "apps/web/src/components/PermissionCheckoutPage.tsx",
  "scripts/verify-permission-checkout.mjs",
  "docs/PERMISSION_CHECKOUT_SCOPED_AUTHORITY.md",
  "docs/IMPLEMENTATION_REPORT_PERMISSION_CHECKOUT_SCOPED_AUTHORITY_v0.25.0.md",
  "packages/financial-execution-adapters/package.json",
  "packages/financial-execution-adapters/src/index.ts",
  "packages/financial-execution-adapters/src/index.test.ts",
  "packages/db/migrations/0019_four_category_financial_execution_adapters.sql",
  "apps/api/src/routes/financial-execution-adapters.ts",
  "apps/api/src/routes/financial-execution-adapters.test.ts",
  "apps/web/src/repositories/financialExecutionAdapterRepository.ts",
  "scripts/verify-execution-adapter-parity.mjs",
  "docs/IMPLEMENTATION_REPORT_FOUR_CATEGORY_FINANCIAL_EXECUTION_ADAPTER_PARITY_v0.26.0.md",
  ".env.example",
  ".gitignore",
];

for (const relative of required) {
  await access(path.join(root, relative));
}

const foundationDoctrine = await readFile(path.join(root, "SPOTRIQ_FOUNDATION.md"), "utf8");
for (const marker of ["AI explains. Deterministic systems decide.", "RangeKeeper", "GridPilot", "YieldPilot", "VenusGuard", "search relevance", "partial-data", "Home · Explore · Smart Money Check · My Agents"]) {
  if (!foundationDoctrine.includes(marker)) throw new Error(`Spotriq foundation doctrine is missing ${marker}.`);
}
const projectState = await readFile(path.join(root, "PROJECT_STATE.md"), "utf8");
if (!projectState.includes("v0.25 — Permission Checkout + scoped authority parity ✅") || !projectState.includes("v0.26.0 implementation candidate") || !projectState.includes("Four-Category Financial Execution Adapter Parity")) {
  throw new Error("PROJECT_STATE.md must record externally accepted v0.25 and the current v0.26 execution-adapter candidate.");
}
const correctedRoadmap = await readFile(path.join(root, "CORRECTED_ROADMAP.md"), "utf8");
for (const marker of ["v0.22.0", "v0.23.0", "v0.24.0", "v0.25.0 — Permission Checkout + Scoped Financial Authority Parity", "v0.26.0 — Four-Category Financial Execution Adapter Parity"]) {
  if (!correctedRoadmap.includes(marker)) throw new Error(`Corrected roadmap is missing ${marker}.`);
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
for (const route of ["/v1/checks", "/v1/checks/:checkSessionId", "/v1/checks/:checkSessionId/findings", "/v1/checks/:checkSessionId/findings/:findingId/matches", "/v1/checks/:checkSessionId/events"]) {
  if (!checkRoutes.includes(route)) throw new Error(`Missing Smart Money Check route ${route}.`);
}
const appUi = await readFile(path.join(root, "apps/web/src/app/App.tsx"), "utf8");
if (!appUi.includes("smartMoneyRepository.startCheck") || !appUi.includes("subscribeToSmartMoneyCheck") || !appUi.includes("Live BSC data")) {
  throw new Error("Smart Money Check UI must be wired to the live API while retaining example mode.");
}



const agentRegistry = await readFile(path.join(root, "packages/agent-registry/src/index.ts"), "utf8");
for (const marker of ["ERC8004_REGISTRIES", "createAgentRegistry", "deriveAgentCategoryHints", "verifyIdentity", "MemoryAgentRegistryStore", "PostgresAgentRegistryStore", "8004scan"]) {
  if (!agentRegistry.includes(marker)) throw new Error(`Agent registry integration is missing ${marker}.`);
}
const agentRoutes = await readFile(path.join(root, "apps/api/src/routes/agents.ts"), "utf8");
for (const route of ["/v1/registry/status", "/v1/agents", "/v1/agents/search", "/v1/agents/:chainId/:agentId", "/v1/agents/:chainId/:agentId/feedback", "/v1/accounts/:address/agents"]) {
  if (!agentRoutes.includes(route)) throw new Error(`Missing agent discovery route ${route}.`);
}
const agentRegistryUi = await readFile(path.join(root, "apps/web/src/repositories/agentRegistryRepository.ts"), "utf8");
if (!agentRegistryUi.includes("ApiAgentRegistryRepository") || !appUi.includes("Live ERC-8004 registry discoveries") || !appUi.includes("activation blocked")) {
  throw new Error("Explore must preserve a distinct live ERC-8004 discovery surface without presenting discovered identities as activatable services.");
}
if (!appUi.includes('category === "all"\n    ? registryAgents') || !appUi.includes("with recognized financial metadata hints")) {
  throw new Error("Explore All must render returned live registry identities without requiring a financial metadata hint.");
}
if (!evidence.includes("ERC8004_IDENTITY") || !evidence.includes("SCAN8004_DISCOVERY")) {
  throw new Error("Evidence Engine must include ERC-8004 canonical identity and 8004scan indexed discovery methods.");
}

const marketplaceSupply = await readFile(path.join(root, "packages/marketplace-supply/src/index.ts"), "utf8");
for (const marker of ["createMarketplaceSupply", "normalizeMarketplaceListing", "normalizeMarketplaceService", "MARKETPLACE_SERVICE_NORMALIZATION_METHOD", "MARKETPLACE_SERVICE_READINESS_METHOD", "FINANCIAL_SUPPLY_DISCOVERY_METHOD", "FINDING_SERVICE_COMPATIBILITY_METHOD", "rankServicesForFinding", "matchFinding", "FINANCIAL_DISCOVERY_QUERIES", "Promise.allSettled", "RUNTIME_REACHABILITY", "runTests", "createMarketplaceTestLab", "MARKETPLACE_TESTS"]) {
  if (!marketplaceSupply.includes(marker)) throw new Error(`Marketplace supply engine is missing ${marker}.`);
}
const marketplaceRoutes = await readFile(path.join(root, "apps/api/src/routes/marketplace.ts"), "utf8");
for (const route of ["/v1/marketplace/status", "/v1/listings", "/v1/services", "/v1/services/:serviceId", "/v1/services/:serviceId/readiness", "/v1/services/:serviceId/evidence", "/v1/services/:serviceId/tests"]) {
  if (!marketplaceRoutes.includes(route)) throw new Error(`Missing marketplace supply route ${route}.`);
}
const marketplaceUiRepo = await readFile(path.join(root, "apps/web/src/repositories/marketplaceSupplyRepository.ts"), "utf8");
if (!marketplaceUiRepo.includes("ApiMarketplaceSupplyRepository") || !marketplaceUiRepo.includes("runTests") || !appUi.includes("Live financial services") || !appUi.includes("Financial activation gated") || !appUi.includes("Run Test Lab")) {
  throw new Error("Explore must render live first-party/external service candidates separately from legacy samples and keep financial activation independently gated.");
}
if (!appUi.includes("Targeted financial supply discovery") || !appUi.includes("Discovery lead only · not a service claim")) {
  throw new Error("Explore must expose targeted financial search coverage and keep search-only leads separate from normalized services.");
}
const domain = await readFile(path.join(root, "packages/domain/src/index.ts"), "utf8");
for (const marker of ["MarketplaceFinancialDiscovery", "FinancialSupplySearchRun", "FinancialSupplyLead", "FinancialSupplyDiscoveryMatch", "FindingCompatibilityContext", "FindingServiceCompatibilityCheck", "FindingServiceMatch", "FindingServiceMatchPage"]) {
  if (!domain.includes(marker)) throw new Error(`Financial supply discovery domain model is missing ${marker}.`);
}
if (!evidence.includes("AGENT_SERVICE_NORMALIZATION") || !evidence.includes("SERVICE_READINESS") || !evidence.includes("MARKETPLACE_TEST_LAB")) {
  throw new Error("Evidence Engine must include service normalization, readiness, and Marketplace Test Lab methodologies.");
}
const migration0008 = await readFile(path.join(root, "packages/db/migrations/0008_marketplace_service_readiness.sql"), "utf8");
for (const table of ["service_offers", "permission_profiles", "service_readiness_snapshots", "agent_capability_claims"]) {
  if (!migration0008.includes(table)) throw new Error(`Marketplace supply migration is missing ${table}.`);
}
const testLab = await readFile(path.join(root, "packages/marketplace-supply/src/test-lab.ts"), "utf8");
for (const marker of ["MARKETPLACE_TEST_LAB_METHOD", "server/discover", ".well-known/agent-card.json", "isPublicRuntimeAddress", "CATEGORY_CAPABILITY", "PROTOCOL_CONTRACT"]) {
  if (!testLab.includes(marker)) throw new Error(`Marketplace Test Lab is missing ${marker}.`);
}
const migration0009 = await readFile(path.join(root, "packages/db/migrations/0009_marketplace_test_lab.sql"), "utf8");
if (!migration0009.includes("marketplace_service_test_runs")) throw new Error("Marketplace Test Lab migration is missing marketplace_service_test_runs.");
if (!marketplaceRoutes.includes("supply.runTests") || !marketplaceRoutes.includes("app.post")) throw new Error("Marketplace Test Lab POST execution route is missing.");
if (!checkRoutes.includes("marketplaceSupply.matchFinding") || !checkRoutes.includes("FindingServiceMatchesResponse")) throw new Error("Smart Money Finding → AgentService compatibility API route is missing.");
if (!smartMoney.includes('agentCompatibility: "AVAILABLE"') || !smartMoney.includes('"agent_compatibility", "COMPLETED"')) throw new Error("Smart Money Check must expose the compatibility handoff as available after findings are generated.");
if (!appUi.includes("Best live matches for this finding") || !appUi.includes("fromFinding={nav.fromFinding}") || !appUi.includes("getFindingMatches")) throw new Error("Explore must consume the live Finding handoff and render deterministic matched services.");


const jobIntents = await readFile(path.join(root, "packages/job-intents/src/index.ts"), "utf8");
for (const marker of ["REBALANCING_JOB_INTENT_METHOD", "PREPARE_RANGE_REBALANCE", "PREPARE_ONLY", "NO_EXECUTION", "AWAITING_AUTHORITY", "MemoryJobIntentStore", "PostgresJobIntentStore", "checkouts"]) {
  if (!jobIntents.includes(marker)) throw new Error(`Rebalancing Job Intent engine is missing ${marker}.`);
}
const jobIntentRoutes = await readFile(path.join(root, "apps/api/src/routes/job-intents.ts"), "utf8");
for (const route of ["/v1/checks/:checkSessionId/findings/:findingId/job-intents", "/v1/job-intents/:jobIntentId", "/v1/job-intents/:jobIntentId/confirm"]) {
  if (!jobIntentRoutes.includes(route)) throw new Error(`Missing Job Intent route ${route}.`);
}
if (!jobIntentRoutes.includes("marketplaceSupply.matchFinding") || !jobIntentRoutes.includes("snapshot.findings.find")) {
  throw new Error("Job Intent preparation must reload the Smart Money Finding and revalidate current service compatibility server-side.");
}
for (const marker of ["RebalancingJobIntent", "RebalancingJobConstraints", "JobIntentAuthorityRequirement", "jobIntentId?: string"]) {
  if (!domain.includes(marker)) throw new Error(`Job Intent domain model is missing ${marker}.`);
}
if (!appUi.includes("Prepare job") || !appUi.includes("Review the job before authority") || !appUi.includes("Confirm job intent") || !appUi.includes("Nothing is signed or submitted.")) {
  throw new Error("The live Rebalancing handoff UI must expose reviewable Job Intent preparation without pretending authority or execution exists.");
}
if (!appUi.includes("jobIntentRepository.prepare") || !appUi.includes("jobIntentId={nav.jobIntentId}")) {
  throw new Error("Explore and Checkout must be wired through the live Job Intent API handoff.");
}
if (!apiApp.includes("rebalancingJobIntentEnabled: true")) {
  throw new Error("System capabilities must expose Job Intent support while preserving marketplace activation as a separate resource.");
}

const authority = await readFile(path.join(root, "packages/authority/src/index.ts"), "utf8");
for (const marker of ["BOUNDED_AUTHORITY_METHOD", "SAFETY_PREREQUISITES_REQUIRED", "TRUSTED_AGENT_SESSION_KEY", "ARGUMENT_LEVEL_EXECUTION_GUARD", "EXACT_MATCH", "executionEligible: false", "decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))", "collect((uint256,address,uint128,uint128))", "increaseLiquidity((uint256,uint256,uint256,uint256,uint256,uint256))", "mint((address,address,uint24,int24,int24,uint256,uint256,uint256,uint256,address,uint256))"]) {
  if (!authority.includes(marker)) throw new Error(`Bounded authority engine is missing ${marker}.`);
}
if (!authority.includes("permission_requests") || !authority.includes("permission_grants")) {
  throw new Error("Bounded authority persistence must use the existing permission request/grant tables.");
}
for (const marker of ["AuthoritySafetyPrerequisite", "TRUSTED_AGENT_SESSION_KEY", "ARGUMENT_LEVEL_EXECUTION_GUARD", "safetyPrerequisites", "executionSafetyPrerequisites"]) {
  if (!domain.includes(marker)) throw new Error(`Bounded authority domain model is missing ${marker}.`);
}
const altanaAuthority = await readFile(path.join(root, "packages/authority/src/altana.ts"), "utf8");
for (const marker of ["ALTANA_KEYSTORE_BY_NETWORK", "isValidKey", "keccak256", "0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a", "0x6b8361C29d05D498b1a12B54A37310f94171E94A"]) {
  if (!altanaAuthority.includes(marker)) throw new Error(`Altana Keystore verifier is missing ${marker}.`);
}
const authorityRoutes = await readFile(path.join(root, "apps/api/src/routes/authority.ts"), "utf8");
for (const route of ["/v1/job-intents/:jobIntentId/permissions", "/v1/permissions/:permissionRequestId", "/v1/permissions/:permissionRequestId/reconcile", "/v1/permission-grants/:permissionGrantId", "/v1/permission-grants/:permissionGrantId/reverify"]) {
  if (!authorityRoutes.includes(route)) throw new Error(`Missing bounded authority route ${route}.`);
}
if (!apiApp.includes("boundedPermissionAuthorityEnabled: true") || !apiApp.includes("altanaKeystoreVerificationEnabled: true")) {
  throw new Error("API capabilities must expose bounded authority + Altana verification while preserving marketplace activation as a separate resource.");
}
for (const marker of ["Bounded authority · Altana", "Grant submission is deliberately blocked", "Re-check onchain authority", "Prepare bounded authority"]) {
  if (!appUi.includes(marker)) throw new Error(`Live authority review UI is missing ${marker}.`);
}
if (!appUi.includes("authorityRepository.prepare") || !appUi.includes("authorityRepository.reverify")) {
  throw new Error("Live authority review UI must use the bounded authority API repository.");
}
if (!jobIntents.includes("linkPermissionRequest") || !jobIntents.includes("linkPermissionGrant") || !jobIntents.includes('executionState: "NO_EXECUTION"')) {
  throw new Error("Job Intent authority linkage must preserve the NO_EXECUTION boundary.");
}


const authorityBinding = await readFile(path.join(root, "packages/marketplace-supply/src/authority-binding.ts"), "utf8");
for (const marker of ["AGENT_AUTHORITY_BINDING_METHOD", "urn:spotriq:authority-binding:v1", "EIP191_SECP256K1", "isPublicRuntimeAddress", "recoverMessageAddress"]) {
  if (!authorityBinding.includes(marker)) throw new Error(`Trusted AgentService authority-binding verifier is missing ${marker}.`);
}
if (!marketplaceSupply.includes("verifyAuthorityBinding") || !marketplaceSupply.includes("getAuthorityBinding")) {
  throw new Error("Marketplace Supply must persist and expose trusted AgentService authority-binding evidence.");
}

const executionGuard = await readFile(path.join(root, "packages/execution-guard/src/index.ts"), "utf8");
for (const marker of ["REBALANCING_EXECUTION_GUARD_METHOD", "collect", "increaseLiquidity", "decreaseLiquidity", "mint", "TARGET_RANGE_REVIEW", "executionEligible: false"]) {
  if (!executionGuard.includes(marker)) throw new Error(`Rebalancing calldata guard is missing ${marker}.`);
}
if (!authority.includes("NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY") || !domain.includes("NON_BYPASSABLE_FINANCIAL_EXECUTION_BOUNDARY")) {
  throw new Error("Authority must expose the non-bypassable financial execution boundary as a structured blocking prerequisite.");
}
for (const route of ["/v1/permissions/:permissionRequestId/trusted-agent-binding", "/v1/permissions/:permissionRequestId/execution-guard", "/v1/job-intents/:jobIntentId/altana-testnet-probes", "/v1/job-intents/:jobIntentId/altana-testnet-probe", "/v1/altana-testnet-probes/:probeId", "/v1/altana-testnet-probes/:probeId/reverify"]) {
  if (!authorityRoutes.includes(route)) throw new Error(`Missing v0.16 trusted-binding/execution-guard/Altana-probe route ${route}.`);
}
const migration0010 = await readFile(path.join(root, "packages/db/migrations/0010_trusted_agent_binding_and_altana_probe.sql"), "utf8");
for (const table of ["agent_authority_bindings", "altana_testnet_probe_grants"]) {
  if (!migration0010.includes(table)) throw new Error(`v0.16 migration is missing ${table}.`);
}
const altanaHandlers = await readFile(path.join(root, "apps/web/src/services/altanaHandlers.ts"), "utf8");
for (const marker of ["grantReadOnlyProbe", "revokeReadOnlyProbe", "positions(uint256)", "chainId: 97"]) {
  if (!altanaHandlers.includes(marker)) throw new Error(`Altana BSC Testnet probe handler is missing ${marker}.`);
}
for (const marker of ["Verify service-owned key", "Run calldata guard", "Grant read-only testnet probe", "non-bypassable"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.16 Job Intent authority UI is missing ${marker}.`);
}
if (!apiApp.includes("trustedAgentSessionKeyBindingEnabled: true") || !apiApp.includes("argumentLevelExecutionGuardEnabled: true") || !apiApp.includes("altanaTestnetProbeGrantEnabled: true")) {
  throw new Error("API capabilities must expose v0.16 binding/guard/testnet probe support while preserving marketplace activation as a separate resource.");
}


const executionPlans = await readFile(path.join(root, "packages/execution-plans/src/index.ts"), "utf8");
for (const marker of ["REBALANCING_EXECUTION_PLAN_METHOD", "quoteV3DecreaseLiquidity", "DECREASE_LIQUIDITY", "COLLECT", "MINT", "USER_REVIEWED", "guardState", "executionEligible:false"]) {
  if (!executionPlans.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.17 execution-plan engine is missing ${marker}.`);
}
const executionBoundary = await readFile(path.join(root, "packages/execution-boundary/src/index.ts"), "utf8");
for (const marker of ["FINANCIAL_EXECUTION_BOUNDARY_METHOD", "EXACT_PLAN_CALL_HASH_AND_ORDER", "AUTHENTICATED_PROPOSER_ONLY", "BOUNDARY_CONTROLLED_NOT_PROVISIONED", "PASS_AUTHORITY_REQUIRED", "executionEligible:false"]) {
  if (!executionBoundary.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.17 execution boundary is missing ${marker}.`);
}
if (!authority.includes("applyExecutionPlan") || !authority.includes("applyExecutionBoundary") || !authority.includes("BOUNDARY_SIGNER_REQUIRED") || !authority.includes("SPOTRIQ_EXECUTION_BOUNDARY")) {
  throw new Error("v0.17 authority must consume reviewed plans/boundaries and stop at BOUNDARY_SIGNER_REQUIRED.");
}
const executionPlanRoutes = await readFile(path.join(root, "apps/api/src/routes/execution-plans.ts"), "utf8");
for (const route of ["/v1/job-intents/:jobIntentId/execution-plans", "/v1/job-intents/:jobIntentId/execution-plan", "/v1/execution-plans/:planId", "/v1/execution-plans/:planId/review", "/v1/execution-plans/:planId/seal-boundary", "/v1/execution-boundaries/:boundaryId", "/v1/execution-boundaries/:boundaryId/preflight"]) {
  if (!executionPlanRoutes.includes(route)) throw new Error(`Missing v0.17 execution-plan/boundary route ${route}.`);
}
const migration0011 = await readFile(path.join(root, "packages/db/migrations/0011_rebalancing_execution_plan_boundary.sql"), "utf8");
for (const table of ["rebalancing_execution_plans", "financial_execution_boundaries"]) {
  if (!migration0011.includes(table)) throw new Error(`v0.17 migration is missing ${table}.`);
}
for (const marker of ["Prepare exact plan", "Review range + refresh quote", "Seal execution boundary", "Fresh preflight", "Nothing is signed or submitted."]) {
  if (!appUi.includes(marker)) throw new Error(`v0.17 live execution-plan UI is missing ${marker}.`);
}
if (!apiApp.includes("rebalancingExecutionPlanEnabled: true") || !apiApp.includes("nonBypassableExecutionBoundaryEnabled: true")) {
  throw new Error("API capabilities must preserve v0.17 plan/boundary support while preserving marketplace activation as a separate resource.");
}
const pancakeSwapAdapter = await readFile(path.join(root, "packages/protocol-pancakeswap/src/index.ts"), "utf8");
const chainAdapter = await readFile(path.join(root, "packages/chain/src/index.ts"), "utf8");
if (!pancakeSwapAdapter.includes("quoteV3DecreaseLiquidity") || !pancakeSwapAdapter.includes("ETH_CALL_SIMULATION") || !chainAdapter.includes("callContractFrom")) {
  throw new Error("v0.17 must obtain independent owner-context expected-output evidence through read-only eth_call simulation.");
}



const migration0012 = await readFile(path.join(root, "packages/db/migrations/0012_boundary_financial_session_readiness.sql"), "utf8");
for (const table of ["boundary_financial_sessions", "boundary_financial_readiness"]) {
  if (!migration0012.includes(table)) throw new Error(`v0.18 migration is missing ${table}.`);
}
for (const marker of ["BOUNDARY_FINANCIAL_SESSION_METHOD", "BOUNDARY_FINANCIAL_READINESS_METHOD", "observeBoundaryFinancialSession", "assessBoundaryFinancialReadiness", "SPOTRIQ_BOUNDARY_EPHEMERAL_CLIENT_SIGNER", "PROJECTED_SUFFICIENT", "APPROVAL_REQUIRED", "executionEligible:false"]) {
  if (!authority.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.18 authority engine is missing ${marker}.`);
}
for (const marker of ["BOUNDARY_CONTROLLED_ALTANA_TESTNET_SESSION", "PASS_EXECUTION_DISABLED", "linkFinancialSession", "executionEligible:false"]) {
  if (!executionBoundary.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.18 execution boundary is missing ${marker}.`);
}
for (const route of ["/v1/execution-boundaries/:boundaryId/financial-sessions", "/v1/execution-boundaries/:boundaryId/financial-session", "/v1/financial-sessions/:financialSessionId", "/v1/financial-sessions/:financialSessionId/reverify", "/v1/execution-boundaries/:boundaryId/financial-readiness"]) {
  if (!executionPlanRoutes.includes(route)) throw new Error(`Missing v0.18 financial-session/readiness route ${route}.`);
}
for (const marker of ["grantBoundaryFinancialSession", "revokeBoundaryFinancialSession", "sessionSigner", "register: true"]) {
  if (!altanaHandlers.includes(marker)) throw new Error(`v0.18 Altana financial-session handler is missing ${marker}.`);
}
for (const marker of ["Boundary-controlled Altana financial session", "Grant boundary financial session", "Check balances & allowances", "Prepare exact approvals", "v0.19 can dispatch only the exact sealed plan"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.18 Job Intent financial-authority UI is missing ${marker}.`);
}
if (!apiApp.includes("boundaryControlledAltanaFinancialSessionEnabled: true") || !apiApp.includes("financialAssetReadinessEnabled: true") || !apiApp.includes("liveFinancialSignerEnabled: true")) {
  throw new Error("API capabilities must expose v0.18 boundary financial-session/readiness support while preserving marketplace activation as a separate resource.");
}



const controlledExecution = await readFile(path.join(root, "packages/controlled-execution/src/index.ts"), "utf8");
for (const marker of ["CONTROLLED_EXECUTION_METHOD", "BOUNDED_APPROVAL_METHOD", "READY_TO_DISPATCH", "READY_FOR_CONTROLLED_EXECUTION_MILESTONE", "PASS_EXECUTION_DISABLED", "authorizeCall", "consume", "getTransactionReceipt", "DECREASE_LIQUIDITY_TOPIC", "COLLECT_TOPIC", "effectsReconciled", "APPROVAL_REQUIRED"]) {
  if (!controlledExecution.includes(marker)) throw new Error(`v0.19 controlled execution engine is missing ${marker}.`);
}
if (controlledExecution.includes("maxUint256") || controlledExecution.includes("MaxUint256") || controlledExecution.includes("approveMax")) {
  throw new Error("v0.19 controlled approval path must not request unlimited ERC-20 allowance.");
}
const controlledRoutes = await readFile(path.join(root, "apps/api/src/routes/controlled-execution.ts"), "utf8");
for (const route of [
  "/v1/execution-boundaries/:boundaryId/approval-plans",
  "/v1/approval-plans/:approvalPlanId/review",
  "/v1/approval-plans/:approvalPlanId/observe",
  "/v1/execution-boundaries/:boundaryId/controlled-executions",
  "/v1/execution-boundaries/:boundaryId/controlled-execution",
  "/v1/controlled-executions/:executionId",
  "/v1/controlled-executions/:executionId/observe",
  "/v1/controlled-executions/:executionId/reconcile",
]) {
  if (!controlledRoutes.includes(route)) throw new Error(`Missing v0.19 controlled-execution route ${route}.`);
}
if (controlledRoutes.includes("request.body.calls")) {
  throw new Error("Controlled dispatch preparation must not trust client-supplied arbitrary calls.");
}
const migration0013 = await readFile(path.join(root, "packages/db/migrations/0013_controlled_rebalancing_execution.sql"), "utf8");
for (const table of ["boundary_approval_plans", "boundary_approval_observations", "controlled_rebalancing_executions"]) {
  if (!migration0013.includes(table)) throw new Error(`v0.19 migration is missing ${table}.`);
}
if (!executionBoundary.includes("async consume") || !executionBoundary.includes('state:"CONSUMED"')) {
  throw new Error("v0.19 must consume the sealed execution boundary after a confirmed dispatch to prevent replay.");
}
if (!jobIntents.includes("linkControlledExecution") || !jobIntents.includes('executionState: "CONTROLLED_TESTNET_EXECUTED"') || !jobIntents.includes('state: "COMPLETED"')) {
  throw new Error("v0.19 Job Intent lifecycle must complete only from independently confirmed controlled execution evidence.");
}
for (const marker of ["executeExactApprovalPlan", "executeControlledBoundaryPlan", "client.execute", "chainId: 97"]) {
  if (!altanaHandlers.includes(marker)) throw new Error(`v0.19 Altana controlled-dispatch handler is missing ${marker}.`);
}
for (const marker of ["Prepare exact approvals", "Execute exact reviewed plan on BSC Testnet", "Reconcile BSC receipt"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.19 controlled-execution UI is missing ${marker}.`);
}
if (!apiApp.includes("boundedTokenApprovalFlowEnabled: true") || !apiApp.includes("controlledBscTestnetExecutionEnabled: true")) {
  throw new Error("API capabilities must expose v0.19 controlled execution while preserving marketplace agent activation as a distinct commercial resource.");
}


const activityOutcomes = await readFile(path.join(root, "packages/activity-outcomes/src/index.ts"), "utf8");
for (const marker of ["ACTIVITY_OUTCOMES_METHOD", "MemoryActivityOutcomesStore", "PostgresActivityOutcomesStore", "transaction.gas_cost_native", "INSUFFICIENT_HISTORY", "FINANCIAL_SESSION_REVOKED"]) {
  if (!activityOutcomes.includes(marker)) throw new Error(`v0.20 Activity & Outcomes engine is missing ${marker}.`);
}
const activityOutcomeRoutes = await readFile(path.join(root, "apps/api/src/routes/activity-outcomes.ts"), "utf8");
for (const route of [
  "/v1/controlled-executions/:executionId/activity-outcomes/sync",
  "/v1/controlled-executions/:executionId/activity-outcomes",
  "/v1/controlled-executions/:executionId/activity",
  "/v1/controlled-executions/:executionId/outcome",
]) {
  if (!activityOutcomeRoutes.includes(route)) throw new Error(`Missing v0.20 Activity & Outcomes route ${route}.`);
}
const migration0014 = await readFile(path.join(root, "packages/db/migrations/0014_execution_activity_outcomes.sql"), "utf8");
for (const marker of ["activity_events", "outcome_windows", "outcome_metrics", "controlled_execution_id"]) {
  if (!migration0014.includes(marker)) throw new Error(`v0.20 Activity & Outcomes migration is missing ${marker}.`);
}
if (!apiApp.includes("executionActivityOutcomesEnabled: true")) {
  throw new Error("API capabilities must expose execution-scoped Activity & Outcomes while keeping marketplace AgentService activation distinct from execution evidence.");
}
for (const marker of ["Activity & Outcomes", "Performance claims remain unavailable", "Refresh evidence", "Example Portfolio / Sample Data"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.20 Activity & Outcomes UI is missing ${marker}.`);
}
if (!controlledRoutes.includes("Activity & Outcomes sync failed after confirmed execution; execution truth remains confirmed")) {
  throw new Error("Post-confirmation Activity & Outcomes enrichment must not invalidate already-confirmed execution truth.");
}


const serviceTasks = await readFile(path.join(root, "packages/service-tasks/src/index.ts"), "utf8");
for (const marker of [
  "SERVICE_TASK_METHOD", "SPOTRIQ_REBALANCING_PROPOSAL_SCHEMA", "requestContextHash",
  "exactA2aTestEndpoint", "marketplace.verifyAuthorityBinding", "SendMessage", "message/send", "message:send",
  "GetTask", "CancelTask", "AUTH_REQUIRED", '"NOT_PROVEN"', "sameOrigin",
]) {
  if (!serviceTasks.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.21 service-task origin engine is missing ${marker}.`);
}
const serviceTaskRoutes = await readFile(path.join(root, "apps/api/src/routes/service-tasks.ts"), "utf8");
for (const route of [
  "/v1/job-intents/:jobIntentId/service-tasks",
  "/v1/job-intents/:jobIntentId/service-task",
  "/v1/service-tasks/:serviceTaskId",
  "/v1/service-tasks/:serviceTaskId/reconcile",
  "/v1/service-tasks/:serviceTaskId/retry",
  "/v1/service-tasks/:serviceTaskId/cancel",
]) {
  if (!serviceTaskRoutes.includes(route)) throw new Error(`Missing v0.21 service-task route ${route}.`);
}
for (const forbidden of ["runtimeEndpoint:request.body", "proposal:request.body", "originProof:request.body", "financialSigner:request.body"]) {
  if (serviceTaskRoutes.replaceAll(" ", "").includes(forbidden)) throw new Error("ServiceTask routes must not trust browser-supplied runtime/proposal/origin/financial-signer evidence.");
}
const serviceTaskRouteTests = await readFile(path.join(root, "apps/api/src/routes/service-tasks.test.ts"), "utf8");
if (!serviceTaskRouteTests.includes("browser-fabricated") || !serviceTaskRouteTests.includes("financialSigner")) throw new Error("v0.21 must preserve an adversarial test proving browser-origin evidence cannot be fabricated.");
const migration0015 = await readFile(path.join(root, "packages/db/migrations/0015_service_task_origin_proof.sql"), "utf8");
for (const marker of ["service_tasks", "request_context_hash", "origin_proof_state", "commercial_state"]) {
  if (!migration0015.includes(marker)) throw new Error(`v0.21 migration is missing ${marker}.`);
}
for (const marker of ["ServiceTask", "JobIntentServiceTaskLink", "requestContextHash", "proposalOrigin", "USER_OVERRIDE"]) {
  if (!domain.includes(marker)) throw new Error(`v0.21 domain model is missing ${marker}.`);
}
for (const marker of ["linkServiceTask", 'originProofState !== "VERIFIED"', 'proposalState !== "STRUCTURED"', "serviceTask: undefined"]) {
  if (!jobIntents.includes(marker)) throw new Error(`v0.21 Job Intent origin gate is missing ${marker}.`);
}
for (const marker of ["proposalOrigin", "AGENT_SERVICE", "USER_OVERRIDE"]) {
  if (!executionPlans.includes(marker)) throw new Error(`v0.21 execution-plan proposal attribution is missing ${marker}.`);
}
for (const marker of ["Invoke selected service", "Real AgentService task origin", "Confirm stays locked", "serviceTaskRepository.invoke"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.21 live task-origin UI is missing ${marker}.`);
}
if (!apiApp.includes("serviceTaskOriginProofEnabled: true")) {
  throw new Error("API capabilities must expose v0.21 service-task origin proof while keeping commercial marketplace activation distinct from task-origin proof.");
}

// v0.22 — genuine first-party reference AgentService supply across all four required categories.
const referenceAgents = await readFile(path.join(root, "packages/reference-agents/src/index.ts"), "utf8");
for (const marker of ["RangeKeeper", "GridPilot", "YieldPilot", "VenusGuard", "REFERENCE_AGENT_DEFINITIONS", "createReferenceAgentCatalog", "handleReferenceAgentJsonRpc", "READ_ONLY", "REQUIRED_AFTER_PUBLIC_DEPLOYMENT"]) {
  if (!referenceAgents.includes(marker)) throw new Error(`v0.22 reference-agent package is missing ${marker}.`);
}
const referenceRoutes = await readFile(path.join(root, "apps/api/src/routes/reference-agents.ts"), "utf8");
for (const route of ["/v1/reference-agents", "/v1/reference-agents/:slug/.well-known/agent-card.json", "/v1/reference-agents/:slug/a2a"]) {
  if (!referenceRoutes.includes(route)) throw new Error(`Missing v0.22 reference-agent route ${route}.`);
}
if (!marketplaceSupply.includes("referenceServices") || !marketplaceSupply.includes("MARKETPLACE_REFERENCE") || !marketplaceSupply.includes("liveReferenceAgentSupply")) {
  throw new Error("Marketplace supply must integrate first-party reference services through the existing readiness pipeline.");
}
if (!appUi.includes("Live reference service") || !appUi.includes("Payment ≠ permission ≠ activation ≠ execution")) {
  throw new Error("Explore must label first-party reference services truthfully and preserve identity/activation separation.");
}
if (!apiApp.includes("liveReferenceAgentSupplyEnabled: true") || !apiApp.includes("referenceAgentRuntimeEnabled: true")) {
  throw new Error("v0.22 capabilities must expose live reference supply/runtime while preserving commercial activation as a distinct gate.");
}
if (!evidence.includes("REFERENCE_AGENT_CATALOG") || !evidence.includes("REFERENCE_AGENT_RUNTIME")) {
  throw new Error("Evidence Engine must expose versioned reference-agent catalog/runtime methodologies.");
}

// v0.22.2 — deployment-configured canonical ERC-8004 reconciliation for first-party references.
const configSource = await readFile(path.join(root, "packages/config/src/index.ts"), "utf8");
for (const marker of ["REFERENCE_AGENT_REGISTRY_CHAIN_ID", "REFERENCE_AGENT_RANGEKEEPER_ID", "REFERENCE_AGENT_GRIDPILOT_ID", "REFERENCE_AGENT_YIELDPILOT_ID", "REFERENCE_AGENT_VENUSGUARD_ID"]) {
  if (!configSource.includes(marker)) throw new Error(`v0.22.2 reference identity configuration is missing ${marker}.`);
}
for (const marker of ["ReferenceAgentIdentityBinding", "assessReferenceAgentIdentityBinding", "registrationBacklinkMatches", "samePublicEndpoint", "erc8004Verified"]) {
  if (!referenceAgents.includes(marker)) throw new Error(`v0.22.2 reference identity reconciliation is missing ${marker}.`);
}
if (!apiApp.includes("referenceIdentityBindings") || !apiApp.includes("agentRegistry.verifyIdentity") || !apiApp.includes("referenceAgentRegistryChainId")) {
  throw new Error("v0.22.2 API startup must canonically verify configured first-party ERC-8004 identities before catalog binding.");
}
if (!marketplaceSupply.includes('const verification = agent.canonicalVerification?.state ?? "NOT_CHECKED"') || !marketplaceSupply.includes("first-party service is bound to a canonically verified ERC-8004 identity")) {
  throw new Error("v0.22.2 readiness must consume canonical identity evidence for first-party references.");
}
const envExample = await readFile(path.join(root, ".env.example"), "utf8");
if (!envExample.includes("REFERENCE_AGENT_RANGEKEEPER_ID") || !envExample.includes("REFERENCE_AGENT_REGISTRY_CHAIN_ID=97")) {
  throw new Error(".env.example must document first-party ERC-8004 reconciliation variables.");
}

// v0.23 — Commercial Hiring + Marketplace Activation Kernel.
const commercial = await readFile(path.join(root, "packages/commercial/src/index.ts"), "utf8");
for (const marker of [
  "COMMERCIAL_KERNEL_METHOD", "CommercialStore", "MemoryCommercialStore", "PostgresCommercialStore",
  "createQuote", "createHire", "reconcilePayment", "activate", "BuyerCommercialState",
  "createErc8183PaymentAdapter", "PAYMENT_ADAPTER_UNAVAILABLE", "IDEMPOTENCY_CONFLICT", "OFFER_STALE",
  "walletSigningAuthorityGranted:false", "financialExecutionAuthorityGranted:false",
]) {
  if (!commercial.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.23 commercial kernel is missing ${marker}.`);
}
const commercialRoutes = await readFile(path.join(root, "apps/api/src/routes/commercial.ts"), "utf8");
for (const route of [
  "/v1/services/:serviceId/offers", "/v1/quotes", "/v1/quotes/:quoteId", "/v1/hires", "/v1/hires/:hireId",
  "/v1/hires/:hireId/payment", "/v1/hires/:hireId/payment/reconcile", "/v1/hires/:hireId/activate",
  "/v1/activations/:activationId", "/v1/accounts/:address/commercial-state",
]) {
  if (!commercialRoutes.includes(route)) throw new Error(`Missing v0.23 commercial route ${route}.`);
}
const migration0016 = await readFile(path.join(root, "packages/db/migrations/0016_commercial_hiring_activation.sql"), "utf8");
for (const marker of ["commercial_quotes", "commercial_hires", "commercial_payment_evidence", "hire_id", "commercial_payload", "activation_id"]) {
  if (!migration0016.includes(marker)) throw new Error(`v0.23 commercial migration is missing ${marker}.`);
}
for (const marker of ["CommercialOfferTerms", "CommercialQuote", "CommercialHire", "CommercialPaymentEvidence", "MarketplaceActivation", "BuyerCommercialState"]) {
  if (!domain.includes(marker)) throw new Error(`v0.23 domain model is missing ${marker}.`);
}
if (!referenceAgents.includes('commercialModel: "FREE"') || !referenceAgents.includes('serviceType: "READ_ONLY_SERVICE"') || !referenceAgents.includes('paymentRail: "FREE"')) {
  throw new Error("v0.23 reference agents must publish truthful FREE / READ_ONLY_SERVICE offers.");
}
if (!serviceTasks.includes("activationId") || !serviceTasks.includes("hireId") || !serviceTaskRoutes.includes("commercial.assertActivationForService")) {
  throw new Error("v0.23 ServiceTask must support explicit binding to a legitimate Activation.");
}
const commercialRepo = await readFile(path.join(root, "apps/web/src/repositories/commercialRepository.ts"), "utf8");
for (const marker of ["createQuote", "createHire", "activate", "getBuyerState"]) {
  if (!commercialRepo.includes(marker)) throw new Error(`v0.23 web commercial repository is missing ${marker}.`);
}
for (const marker of ["Hire free read-only", "commercialRepository.createQuote", "commercialRepository.createHire", "commercialRepository.activate", "No wallet signing, transaction, or financial execution authority was granted"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.23 Explore commercial flow is missing ${marker}.`);
}
if (!apiApp.includes("commercialOfferEnabled: true") || !apiApp.includes("commercialQuoteEnabled: true") || !apiApp.includes("commercialHireEnabled: true") || !apiApp.includes("commercialPaymentReconciliationEnabled: true") || !apiApp.includes("marketplaceActivationEnabled: true")) {
  throw new Error("API capabilities must expose the v0.23 commercial kernel.");
}
if (!evidence.includes("COMMERCIAL_QUOTE") || !evidence.includes("COMMERCIAL_ACTIVATION") || !evidence.includes("ERC8183_PAYMENT")) {
  throw new Error("Evidence Engine must expose v0.23 commercial and ERC-8183 reconciliation methods.");
}

// v0.24 — Four-Category End-to-End Activation Parity.
const migration0017 = await readFile(path.join(root, "packages/db/migrations/0017_four_category_activation_tasks.sql"), "utf8");
for (const marker of ["origin_kind", "category", "result_state", "service_tasks_activation_category_idx", "service_tasks_activation_context_idx"]) {
  if (!migration0017.includes(marker)) throw new Error(`v0.24 activation-task migration is missing ${marker}.`);
}
for (const marker of ["ActivationControlProfile", "ActivationRuntimeState", "ACTIVATION", "ANALYZE_POSITION", "ANALYZE_GRID_MARKET", "SCAN_YIELD_OPPORTUNITIES", "INSPECT_HEALTH", "SNAPSHOT_OBSERVED"]) {
  if (!domain.includes(marker)) throw new Error(`v0.24 domain model is missing ${marker}.`);
}
for (const marker of ["getActivationControl", "revokeActivation", "financialWrite:[]", "walletSigningAuthorityGranted", "financialExecutionAuthorityGranted"]) {
  if (!commercial.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.24 commercial control layer is missing ${marker}.`);
}
for (const marker of ["invokeActivation", "retryActivation", "getForActivation", "getActivationRuntimeState", 'originKind:"ACTIVATION"', "ANALYZE_GRID_MARKET", "SCAN_YIELD_OPPORTUNITIES", "INSPECT_HEALTH"]) {
  if (!serviceTasks.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.24 ServiceTask parity is missing ${marker}.`);
}
for (const route of ["/v1/activations/:activationId/control", "/v1/activations/:activationId/revoke"]) {
  if (!commercialRoutes.includes(route)) throw new Error(`Missing v0.24 Activation control route ${route}.`);
}
for (const route of ["/v1/activations/:activationId/service-tasks", "/v1/activations/:activationId/service-task", "/v1/activations/:activationId/service-task/retry", "/v1/activations/:activationId/runtime-state"]) {
  if (!serviceTaskRoutes.includes(route)) throw new Error(`Missing v0.24 Activation task route ${route}.`);
}
for (const marker of ["getActivationControl", "revokeActivation"]) {
  if (!commercialRepo.includes(marker)) throw new Error(`v0.24 web commercial repository is missing ${marker}.`);
}
const activationParityVerifier = await readFile(path.join(root, "scripts/verify-activation-parity.mjs"), "utf8");
for (const marker of ["rangekeeper", "gridpilot", "yieldpilot", "venusguard", "verify:activation-parity", "SNAPSHOT_OBSERVED", "/runtime-state", "/revoke"]) {
  if (marker === "verify:activation-parity") continue;
  if (!activationParityVerifier.includes(marker)) throw new Error(`v0.24 live parity verifier is missing ${marker}.`);
}
const rootManifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
if (rootManifest.scripts?.["verify:activation-parity"] !== "node scripts/verify-activation-parity.mjs") {
  throw new Error("Root package.json must expose pnpm verify:activation-parity.");
}
// v0.25 — Permission Checkout + Scoped Financial Authority Parity.
const permissionCheckout = await readFile(path.join(root, "packages/permission-checkout/src/index.ts"), "utf8");
for (const marker of [
  "PERMISSION_CHECKOUT_METHOD", "SCOPED_PERMISSION_REQUEST_METHOD", "PermissionCheckoutStore",
  "MemoryPermissionCheckoutStore", "PostgresPermissionCheckoutStore", "createPermissionCheckoutEngine",
  "create(activationId", "confirm(checkoutId", "reconcileGrant", "getBuyerState",
  "SERVICE_READ_ONLY", "SERVICE_NOT_FINANCIALLY_READY", "AUTHORITY_PROVIDER_BRIDGE_REQUIRED", "MAINNET_EXECUTION_NOT_APPROVED",
]) {
  if (!permissionCheckout.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.25 Permission Checkout kernel is missing ${marker}.`);
}
for (const marker of ["PermissionCheckoutState", "PermissionCheckoutCategoryInput", "PermissionCheckoutScope", "ScopedPermissionRequest", "BuyerPermissionState", "PROTECTIVE_WRITE"]) {
  if (!domain.includes(marker)) throw new Error(`v0.25 domain model is missing ${marker}.`);
}
const migration0018 = await readFile(path.join(root, "packages/db/migrations/0018_permission_checkout_scoped_authority.sql"), "utf8");
for (const marker of ["permission_checkout_sessions", "scoped_permission_requests", "scope_hash", "idempotency_key", "linked_permission_grant_id"]) {
  if (!migration0018.includes(marker)) throw new Error(`v0.25 permission migration is missing ${marker}.`);
}
const permissionRoutes = await readFile(path.join(root, "apps/api/src/routes/permission-checkout.ts"), "utf8");
for (const route of [
  "/v1/activations/:activationId/permission-checkouts", "/v1/activations/:activationId/permission-checkout",
  "/v1/permission-checkouts/:checkoutId", "/v1/permission-checkouts/:checkoutId/confirm",
  "/v1/permission-checkouts/:checkoutId/cancel", "/v1/scoped-permission-requests/:permissionRequestId",
  "/v1/scoped-permission-requests/:permissionRequestId/reconcile", "/v1/accounts/:address/permission-state",
]) {
  if (!permissionRoutes.includes(route)) throw new Error(`Missing v0.25 Permission Checkout route ${route}.`);
}
const permissionRepo = await readFile(path.join(root, "apps/web/src/repositories/permissionCheckoutRepository.ts"), "utf8");
for (const marker of ["create", "getForActivation", "confirm", "cancel", "reconcile", "getBuyerState"]) {
  if (!permissionRepo.includes(marker)) throw new Error(`v0.25 web Permission Checkout repository is missing ${marker}.`);
}
const permissionUi = await readFile(path.join(root, "apps/web/src/components/PermissionCheckoutPage.tsx"), "utf8");
for (const marker of ["Review financial authority separately", "Scope reviewed — authority not granted", "Record reviewed scope", "commercialRepository.getBuyerState", "permissionCheckoutRepository.create", "Permission Checkout starts from a legitimate Marketplace Activation"]) {
  if (!permissionUi.includes(marker)) throw new Error(`v0.25 Permission Checkout UI is missing ${marker}.`);
}
if (appUi.includes("runMockActivation")) throw new Error("v0.25 checkout must not use the old mock activation/permission helper.");
for (const marker of ["permissionCheckoutEnabled: true", "fourCategoryAuthorityScopeParityEnabled: true", "scopedPermissionRequestEnabled: true", "permissionGrantReconciliationBridgeEnabled: true"]) {
  if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose v0.25 feature ${marker}.`);
}
const permissionVerifier = await readFile(path.join(root, "scripts/verify-permission-checkout.mjs"), "utf8");
for (const marker of ["rangekeeper", "gridpilot", "yieldpilot", "venusguard", "SERVICE_READ_ONLY", "SERVICE_NOT_FINANCIALLY_READY", "no PermissionGrant fabricated", "/permission-checkouts", "/permission-state"]) {
  if (!permissionVerifier.includes(marker)) throw new Error(`v0.25 live verifier is missing ${marker}.`);
}
if (rootManifest.scripts?.["verify:permission-checkout"] !== "node scripts/verify-permission-checkout.mjs") throw new Error("Root package.json must expose pnpm verify:permission-checkout.");
// v0.26 — Four-Category Financial Execution Adapter Parity.
const financialExecutionAdapters = await readFile(path.join(root, "packages/financial-execution-adapters/src/index.ts"), "utf8");
for (const marker of [
  "FINANCIAL_EXECUTION_ADAPTER_METHOD", "FinancialExecutionAssessmentStore", "MemoryFinancialExecutionAssessmentStore", "PostgresFinancialExecutionAssessmentStore",
  "GRID_SWAP_EXACT_INPUT_SINGLE", "YIELD_SUPPLY", "YIELD_WITHDRAW", "HEALTH_REPAY", "HEALTH_ADD_COLLATERAL",
  "LEGACY_REBALANCING_BOUNDARY", "CATEGORY_GUARDED_CALL", "PERMISSION_GRANT", "SERVICE_FINANCIAL_READINESS", "TARGET_SCOPE",
  "exactInputSingle", "redeemUnderlying", "repayBorrow", "executionEligible:false",
]) {
  if (!financialExecutionAdapters.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.26 financial execution adapter package is missing ${marker}.`);
}
const migration0019 = await readFile(path.join(root, "packages/db/migrations/0019_four_category_financial_execution_adapters.sql"), "utf8");
for (const marker of ["financial_execution_adapter_assessments", "permission_request_id", "PREFLIGHT", "GUARD", "payload"]) {
  if (!migration0019.includes(marker)) throw new Error(`v0.26 execution-adapter migration is missing ${marker}.`);
}
const financialExecutionRoutes = await readFile(path.join(root, "apps/api/src/routes/financial-execution-adapters.ts"), "utf8");
for (const route of [
  "/v1/execution-adapters", "/v1/execution-adapters/:category",
  "/v1/scoped-permission-requests/:permissionRequestId/execution-preflight",
  "/v1/scoped-permission-requests/:permissionRequestId/execution-guard",
  "/v1/scoped-permission-requests/:permissionRequestId/execution-state",
]) {
  if (!financialExecutionRoutes.includes(route)) throw new Error(`Missing v0.26 financial execution route ${route}.`);
}
for (const marker of ["FinancialExecutionAdapterDescriptor", "FinancialExecutionPreflight", "CategoryExecutionGuardReport", "GuardedFinancialCall", "PrepareFinancialExecutionInput"]) {
  if (!domain.includes(marker)) throw new Error(`v0.26 domain model is missing ${marker}.`);
}
for (const marker of ["fourCategoryFinancialExecutionAdapterParityEnabled: true", "categoryArgumentGuardEnabled: true", "categoryExecutionDispatchEnabled: false"]) {
  if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.26 feature ${marker}.`);
}
const financialExecutionRepo = await readFile(path.join(root, "apps/web/src/repositories/financialExecutionAdapterRepository.ts"), "utf8");
for (const marker of ["getAdapter", "preflight", "getState", "/execution-preflight", "/execution-state"]) {
  if (!financialExecutionRepo.includes(marker)) throw new Error(`v0.26 web execution-adapter repository is missing ${marker}.`);
}
for (const marker of ["v0.26 execution adapter", "financialExecutionAdapterRepository.preflight", "Execution dispatch:", "DISABLED"]) {
  if (!permissionUi.includes(marker)) throw new Error(`v0.26 Permission Checkout execution-adapter UI is missing ${marker}.`);
}
const executionAdapterVerifier = await readFile(path.join(root, "scripts/verify-execution-adapter-parity.mjs"), "utf8");
for (const marker of ["rangekeeper", "gridpilot", "yieldpilot", "venusguard", "SERVICE_FINANCIAL_READINESS", "PERMISSION_GRANT", "TARGET_SCOPE", "LEGACY_BOUNDARY_REQUIRED", "no financial dispatch fabricated"]) {
  if (!executionAdapterVerifier.includes(marker)) throw new Error(`v0.26 live verifier is missing ${marker}.`);
}
if (rootManifest.scripts?.["verify:execution-adapter-parity"] !== "node scripts/verify-execution-adapter-parity.mjs") throw new Error("Root package.json must expose pnpm verify:execution-adapter-parity.");
if (!apiApp.includes('version: "0.26.0"')) throw new Error("API metadata must report v0.26.0.");

async function collectPackageJson(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const output = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await collectPackageJson(full));
    else if (entry.name === "package.json") output.push(full);
  }
  return output;
}
const manifests = await collectPackageJson(root);
if (manifests.length !== 28) throw new Error(`v0.26 expects 28 repository package manifests, found ${manifests.length}.`);
for (const manifestPath of manifests) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.version !== "0.26.0") throw new Error(`${path.relative(root, manifestPath)} must be version 0.26.0.`);
}

console.log("Spotriq foundation + accepted v0.22–v0.25 + v0.26 four-category financial execution-adapter parity verification passed.");

