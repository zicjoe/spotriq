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
if (!marketplaceUiRepo.includes("ApiMarketplaceSupplyRepository") || !marketplaceUiRepo.includes("runTests") || !appUi.includes("Normalized financial service candidates") || !appUi.includes("Activation blocked") || !appUi.includes("Run Test Lab")) {
  throw new Error("Explore must render normalized live service candidates separately from sample services and keep activation gated.");
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
if (!appUi.includes("Prepare job") || !appUi.includes("Review the job before authority") || !appUi.includes("Confirm job intent") || !appUi.includes("Nothing is financially executed in v0.17")) {
  throw new Error("The live Rebalancing handoff UI must expose reviewable Job Intent preparation without pretending authority or execution exists.");
}
if (!appUi.includes("jobIntentRepository.prepare") || !appUi.includes("jobIntentId={nav.jobIntentId}")) {
  throw new Error("Explore and Checkout must be wired through the live Job Intent API handoff.");
}
if (!apiApp.includes("rebalancingJobIntentEnabled: true") || !apiApp.includes("marketplaceActivationEnabled: false")) {
  throw new Error("System capabilities must expose Job Intent support while keeping marketplace activation disabled.");
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
if (!apiApp.includes("boundedPermissionAuthorityEnabled: true") || !apiApp.includes("altanaKeystoreVerificationEnabled: true") || !apiApp.includes("marketplaceActivationEnabled: false")) {
  throw new Error("API capabilities must expose bounded authority + Altana verification while keeping marketplace activation disabled.");
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
if (!apiApp.includes("trustedAgentSessionKeyBindingEnabled: true") || !apiApp.includes("argumentLevelExecutionGuardEnabled: true") || !apiApp.includes("altanaTestnetProbeGrantEnabled: true") || !apiApp.includes("marketplaceActivationEnabled: false")) {
  throw new Error("API capabilities must expose v0.16 binding/guard/testnet probe support while keeping marketplace activation disabled.");
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
for (const marker of ["Prepare exact plan", "Review range + refresh quote", "Seal execution boundary", "Fresh preflight", "Future financial signer: boundary-controlled and not provisioned.", "Nothing is financially executed in v0.17"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.17 live execution-plan UI is missing ${marker}.`);
}
if (!apiApp.includes("rebalancingExecutionPlanEnabled: true") || !apiApp.includes("nonBypassableExecutionBoundaryEnabled: true") || !apiApp.includes("liveFinancialSignerEnabled: false") || !apiApp.includes("marketplaceActivationEnabled: false")) {
  throw new Error("API capabilities must expose v0.17 plan/boundary support while keeping the financial signer and activation disabled.");
}
const pancakeSwapAdapter = await readFile(path.join(root, "packages/protocol-pancakeswap/src/index.ts"), "utf8");
const chainAdapter = await readFile(path.join(root, "packages/chain/src/index.ts"), "utf8");
if (!pancakeSwapAdapter.includes("quoteV3DecreaseLiquidity") || !pancakeSwapAdapter.includes("ETH_CALL_SIMULATION") || !chainAdapter.includes("callContractFrom")) {
  throw new Error("v0.17 must obtain independent owner-context expected-output evidence through read-only eth_call simulation.");
}

console.log("Spotriq foundation + four-category financial data + targeted ERC-8004 supply + Marketplace Test Lab + Finding compatibility + Rebalancing Job Intent + bounded Altana authority + trusted service-key binding + calldata guard + Altana BSC Testnet probe + reviewed Rebalancing execution plan + non-bypassable financial execution boundary verification passed.");

