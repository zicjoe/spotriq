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
  "packages/db/migrations/0020_four_category_activity_outcomes.sql",
  "apps/api/src/routes/activation-activity-outcomes.ts",
  "apps/web/src/repositories/activationActivityOutcomesRepository.ts",
  "scripts/verify-activity-outcome-parity.mjs",
  "docs/IMPLEMENTATION_REPORT_FOUR_CATEGORY_ACTIVITY_OUTCOMES_v0.27.0.md",
  "packages/my-agents/package.json",
  "packages/my-agents/src/index.ts",
  "packages/my-agents/src/index.test.ts",
  "packages/db/migrations/0021_my_agents_switching.sql",
  "apps/api/src/routes/my-agents.ts",
  "apps/web/src/repositories/myAgentsRepository.ts",
  "apps/web/src/components/LiveMarketplacePages.tsx",
  "scripts/verify-my-agents.mjs",
  "docs/IMPLEMENTATION_REPORT_MY_AGENTS_SWITCHING_v0.28.0.md",
  "packages/smart-money-plans/package.json",
  "packages/smart-money-plans/src/index.ts",
  "packages/smart-money-plans/src/index.test.ts",
  "packages/db/migrations/0022_smart_money_plans.sql",
  "apps/api/src/routes/smart-money-plans.ts",
  "apps/web/src/repositories/smartMoneyPlanRepository.ts",
  "apps/web/src/components/LiveSmartMoneyPlans.tsx",
  "scripts/verify-smart-money-plans.mjs",
  "docs/SPOTRIQ_V0.29_SMART_MONEY_PLANS_REPORT.md",
  "packages/operator-workspace/package.json",
  "packages/operator-workspace/src/index.ts",
  "packages/operator-workspace/src/index.test.ts",
  "packages/db/migrations/0023_operator_supply_lifecycle.sql",
  "apps/api/src/routes/operator-workspace.ts",
  "apps/web/src/repositories/operatorWorkspaceRepository.ts",
  "apps/web/src/components/LiveOperatorWorkspace.tsx",
  "scripts/verify-operator-workspace.mjs",
  "docs/IMPLEMENTATION_REPORT_OPERATOR_SUPPLY_LIFECYCLE_v0.30.0.md",
  "docs/IMPLEMENTATION_REPORT_PAID_COMMERCIAL_RAILS_v0.31.0.md",
  "packages/agent-studio/package.json",
  "packages/agent-studio/src/index.ts",
  "packages/agent-studio/src/index.test.ts",
  "packages/db/migrations/0025_agent_studio_integration.sql",
  "apps/api/src/routes/agent-studio.ts",
  "apps/web/src/repositories/agentStudioRepository.ts",
  "scripts/verify-agent-studio.mjs",
  "docs/AGENT_STUDIO_INTEGRATION.md",
  "docs/IMPLEMENTATION_REPORT_AGENT_STUDIO_v0.32.0.md",
  "packages/grounded-explanations/package.json",
  "packages/grounded-explanations/src/index.ts",
  "packages/grounded-explanations/src/index.test.ts",
  "packages/db/migrations/0026_grounded_ai_explanations.sql",
  "apps/api/src/routes/grounded-explanations.ts",
  "apps/web/src/repositories/groundedExplanationRepository.ts",
  "apps/web/src/components/GroundedExplanationPanel.tsx",
  "scripts/verify-grounded-explanations.mjs",
  "docs/GROUNDED_AI_EXPLANATIONS.md",
  "docs/IMPLEMENTATION_REPORT_GROUNDED_AI_EXPLANATIONS_v0.33.0.md",
  "packages/observability/package.json",
  "packages/observability/src/index.ts",
  "packages/observability/src/index.test.ts",
  "packages/db/migrations/0028_operational_observability.sql",
  "apps/api/src/routes/observability.ts",
  "apps/web/src/repositories/systemHealthRepository.ts",
  "apps/web/src/components/SystemHealthIndicator.tsx",
  "scripts/verify-observability.mjs",
  "docs/OPERATIONAL_OBSERVABILITY.md",
  "docs/IMPLEMENTATION_REPORT_OBSERVABILITY_v0.35.0.md",
  "packages/security-hardening/package.json",
  "packages/security-hardening/src/index.ts",
  "packages/security-hardening/src/index.test.ts",
  "packages/db/migrations/0029_security_failure_injection_hardening.sql",
  "scripts/verify-security-hardening.mjs",
  "docs/SECURITY_FAILURE_INJECTION_HARDENING.md",
  "docs/IMPLEMENTATION_REPORT_SECURITY_FAILURE_INJECTION_v0.36.0.md",
  "packages/production-hardening/package.json",
  "packages/production-hardening/src/index.ts",
  "packages/production-hardening/src/index.test.ts",
  "packages/db/migrations/0030_production_hardening_scale_readiness.sql",
  "scripts/verify-production-hardening.mjs",
  "docs/PRODUCTION_HARDENING.md",
  "docs/runbooks/PRODUCTION_OPERATIONS.md",
  "docs/IMPLEMENTATION_REPORT_PRODUCTION_HARDENING_v0.37.0.md",
  "packages/adoption-readiness/package.json",
  "packages/adoption-readiness/src/index.ts",
  "packages/adoption-readiness/src/index.test.ts",
  "apps/api/src/routes/adoption.ts",
  "apps/web/src/repositories/adoptionReadinessRepository.ts",
  "apps/web/src/components/LaunchReadinessPage.tsx",
  "scripts/verify-adoption-readiness.mjs",
  "scripts/capture-public-launch-evidence.mjs",
  "docs/public/README.md",
  "docs/public/ARCHITECTURE_AND_TRUST_BOUNDARIES.md",
  "docs/public/BNB_ECOSYSTEM_INTEGRATION.md",
  "docs/public/DEMO_PLAYBOOK.md",
  "docs/public/ADOPTION_EVIDENCE.md",
  "docs/public/SECURITY_AND_OPERATIONS.md",
  "docs/public/SCREENSHOT_EVIDENCE_CHECKLIST.md",
  "docs/public/SUBMISSION_CHECKLIST.md",
  "docs/IMPLEMENTATION_REPORT_ECOSYSTEM_ADOPTION_v0.38.0.md",
  "packages/adoption-analytics/package.json",
  "packages/adoption-analytics/src/index.ts",
  "packages/adoption-analytics/src/index.test.ts",
  "apps/api/src/routes/adoption-analytics.ts",
  "apps/web/src/repositories/adoptionAnalyticsRepository.ts",
  "apps/web/src/components/AdminAdoptionAnalyticsDashboard.tsx",
  "apps/web/src/components/AdoptionFeedbackPrompt.tsx",
  "scripts/verify-adoption-analytics.mjs",
  "scripts/capture-adoption-baseline.mjs",
  "packages/db/migrations/0031_production_adoption_analytics.sql",
  "docs/PRODUCTION_ADOPTION_ANALYTICS.md",
  "docs/IMPLEMENTATION_REPORT_PRODUCTION_ADOPTION_ANALYTICS_v0.39.0.md",
  "SECURITY.md",
  "artifacts/README.md",
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
if (!projectState.includes("v0.39 ✅") || !projectState.includes("v0.40.0") || !projectState.includes("Marketplace Supply Discovery + Qualification")) {
  throw new Error("PROJECT_STATE.md must record accepted v0.39 and the evidence-driven v0.40 Marketplace Supply Discovery + Qualification milestone.");
}
const correctedRoadmap = await readFile(path.join(root, "CORRECTED_ROADMAP.md"), "utf8");
for (const marker of ["v0.22.0", "v0.23.0", "v0.24.0", "v0.25.0 — Permission Checkout + Scoped Financial Authority Parity", "v0.26.0 — Four-Category Financial Execution Adapter Parity", "v0.27.0 — Four-Category Activity + Outcome Parity", "v0.28.0 — My Agents + Switching/Revocation + Marketplace UX Completion", "v0.29.0 — Smart Money Plans + Compatibility/Conflict Handling", "v0.30.0 — Operator Supply Lifecycle + Workspace", "v0.31.0 — Paid Commercial Rails + ERC-8183 / x402 / B402 Reconciliation", "v0.32.0 — Deeper BNB Agent Studio Integration", "v0.33.0 — Grounded AI Explanation Layer", "v0.34.0 — Agent Advantage Measurement + Report", "v0.35.0 — Observability + Marketplace/System Health", "v0.36.0 — Security + Failure Injection Hardening", "v0.37.0 — Production Hardening + Scale Readiness", "v0.38.0 — Ecosystem Adoption + Judge/Public Launch Readiness", "v0.39.0 — Production Analytics + Adoption Feedback Loop"]) {
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
if (appUi.includes("0x7F3a...9c2d") || appUi.includes("activeAgents={ACTIVATIONS.length}")) {
  throw new Error("Production navigation must not fabricate a connected wallet or My Agents count from demo fixtures.");
}
for (const marker of ["Activating a marketplace relationship does not itself grant financial authority.", "Ending a Spotriq relationship does not silently revoke an independent PermissionGrant", "Missing transaction or outcome evidence stays explicit."]) {
  if (!appUi.includes(marker)) throw new Error(`Homepage trust copy must preserve the production authority/evidence boundary: ${marker}`);
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
if (!smartMoney.includes('agentCompatibility: "AVAILABLE"') || !(smartMoney.includes('"agent_compatibility", "COMPLETED"') || (smartMoney.includes('candidate.key === "agent_compatibility"') && smartMoney.includes('compatibility.state = "COMPLETED"')))) throw new Error("Smart Money Check must expose the compatibility handoff as available after findings are generated.");
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
const venusProtocolRoutes026 = await readFile(path.join(root, "apps/api/src/routes/venus.ts"), "utf8");
const venusAdapter026 = await readFile(path.join(root, "packages/protocol-venus/src/index.ts"), "utf8");
for (const marker of ["/v1/protocols/venus/markets", "getMarketCatalog"]) {
  if (!venusProtocolRoutes026.includes(marker) && !venusAdapter026.includes(marker)) throw new Error(`v0.26 Venus acceptance-context discovery is missing ${marker}.`);
}
const executionAdapterVerifier = await readFile(path.join(root, "scripts/verify-execution-adapter-parity.mjs"), "utf8");
for (const marker of ["rangekeeper", "gridpilot", "yieldpilot", "venusguard", "SERVICE_FINANCIAL_READINESS", "PERMISSION_GRANT", "TARGET_SCOPE", "LEGACY_BOUNDARY_REQUIRED", "no financial dispatch fabricated", "/v1/protocols/venus/markets", "guard?.preflight?.preflightId", "latest fresh preflight/guard assessment did not persist"]) {
  if (!executionAdapterVerifier.includes(marker)) throw new Error(`v0.26 live verifier is missing ${marker}.`);
}
if (rootManifest.scripts?.["verify:execution-adapter-parity"] !== "node scripts/verify-execution-adapter-parity.mjs") throw new Error("Root package.json must expose pnpm verify:execution-adapter-parity.");


// v0.27 — Four-Category Activity + Outcome Parity.
const activationActivityRoutes = await readFile(path.join(root, "apps/api/src/routes/activation-activity-outcomes.ts"), "utf8");
const activityOutcomes027 = await readFile(path.join(root, "packages/activity-outcomes/src/index.ts"), "utf8");
const migration0020 = await readFile(path.join(root, "packages/db/migrations/0020_four_category_activity_outcomes.sql"), "utf8");
const activationActivityRepo = await readFile(path.join(root, "apps/web/src/repositories/activationActivityOutcomesRepository.ts"), "utf8");
const activityOutcomeVerifier = await readFile(path.join(root, "scripts/verify-activity-outcome-parity.mjs"), "utf8");
for (const marker of ["ActivationActivityEvent", "ActivationOutcomeSnapshot", "ActivationActivityOutcomeBundle", "COULD_NOT_ASSESS", "transactionObserved: boolean"]) {
  if (!domain.replaceAll(" ", "").includes(marker.replaceAll(" ", ""))) throw new Error(`v0.27 domain model is missing ${marker}.`);
}
for (const marker of ["createActivationActivityOutcomesEngine", "replaceActivationActivity", "saveActivationOutcome", "Could Not Assess", "EXECUTION_GUARD_PREPARED"]) {
  if (!activityOutcomes027.includes(marker)) throw new Error(`v0.27 Activity & Outcomes engine is missing ${marker}.`);
}
for (const marker of ["service_task_id", "permission_request_id", "ACTIVATION_SCOPED", "outcome_windows_activation_scoped_idx"]) {
  if (!migration0020.includes(marker)) throw new Error(`v0.27 activity/outcome migration is missing ${marker}.`);
}
for (const route of ["/v1/activations/:activationId/activity-outcomes/sync", "/v1/activations/:activationId/activity-outcomes", "/v1/activations/:activationId/activity", "/v1/activations/:activationId/outcome"]) {
  if (!activationActivityRoutes.includes(route)) throw new Error(`Missing v0.27 Activation Activity & Outcomes route ${route}.`);
}
for (const marker of ["fourCategoryActivityOutcomeParityEnabled: true", "activationOutcomeCouldNotAssessEnabled: true"]) {
  if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.27 feature ${marker}.`);
}
for (const marker of ["activationActivityOutcomesRepository.sync", "Activity & Outcomes", "Financial outcome:"]) {
  if (!appUi.includes(marker)) throw new Error(`v0.27 Explore Activity & Outcomes UI is missing ${marker}.`);
}
for (const marker of ["rangekeeper", "gridpilot", "yieldpilot", "venusguard", "Could Not Assess", "SERVICE_TASK_OBSERVED", "PERMISSION_REQUEST_BLOCKED", "EXECUTION_PREFLIGHT_BLOCKED", "/activity-outcomes/sync"]) {
  if (!activityOutcomeVerifier.includes(marker)) throw new Error(`v0.27 live verifier is missing ${marker}.`);
}
if (!activationActivityRepo.includes("/activity-outcomes")) throw new Error("v0.27 web Activity & Outcomes repository is missing the Activation endpoint.");
if (rootManifest.scripts?.["verify:activity-outcome-parity"] !== "node scripts/verify-activity-outcome-parity.mjs") throw new Error("Root package.json must expose pnpm verify:activity-outcome-parity.");
// v0.28 — My Agents + Switching/Revocation + Marketplace UX Completion.
const myAgents = await readFile(path.join(root, "packages/my-agents/src/index.ts"), "utf8");
const myAgentsRoutes = await readFile(path.join(root, "apps/api/src/routes/my-agents.ts"), "utf8");
const myAgentsRepo = await readFile(path.join(root, "apps/web/src/repositories/myAgentsRepository.ts"), "utf8");
const liveMarketplacePages = await readFile(path.join(root, "apps/web/src/components/LiveMarketplacePages.tsx"), "utf8");
const migration0021 = await readFile(path.join(root, "packages/db/migrations/0021_my_agents_switching.sql"), "utf8");
const myAgentsVerifier = await readFile(path.join(root, "scripts/verify-my-agents.mjs"), "utf8");
for (const marker of ["MyAgentsPortfolio", "MyAgentPortfolioItem", "MyAgentSwitchRecord", "MyAgentAlternative"]) {
  if (!domain.includes(marker)) throw new Error(`v0.28 domain model is missing ${marker}.`);
}
for (const marker of ["createMyAgentsEngine", "PostgresMyAgentsStore", "switchService", "revokeRelationship", "ACTIVE_PERMISSION_GRANT", "IDEMPOTENCY_CONFLICT", "replacement Activation was established"]) {
  if (!myAgents.includes(marker)) throw new Error(`v0.28 My Agents engine is missing ${marker}.`);
}
for (const marker of ["my_agent_switches", "idempotency_key", "source_activation_id", "target_service_id"]) {
  if (!migration0021.includes(marker)) throw new Error(`v0.28 migration is missing ${marker}.`);
}
for (const route of ["/v1/accounts/:address/my-agents", "/v1/accounts/:address/my-agents/switches", "/v1/accounts/:address/my-agents/:activationId/switch", "/v1/accounts/:address/my-agents/:activationId/revoke"]) {
  if (!myAgentsRoutes.includes(route)) throw new Error(`Missing v0.28 My Agents route ${route}.`);
}
for (const marker of ["getPortfolio", "switchService", "revokeRelationship"]) {
  if (!myAgentsRepo.includes(marker)) throw new Error(`v0.28 web My Agents repository is missing ${marker}.`);
}
for (const marker of ["LiveAgentProfilePage", "LiveComparePage", "LiveTryAgentPage", "Marketplace Test Lab", "live services"]) {
  if (!liveMarketplacePages.includes(marker)) throw new Error(`v0.28 live marketplace UX is missing ${marker}.`);
}
for (const marker of ["myAgentsPortfolioEnabled: true", "myAgentsSwitchingEnabled: true", "liveMarketplaceProfileCompareTryEnabled: true"]) {
  if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.28 feature ${marker}.`);
}
for (const marker of ["same-service switch", "BLOCKED", "/my-agents", "/switches", "/revoke", "without merging commercial, permission, runtime or outcome state"]) {
  if (!myAgentsVerifier.includes(marker)) throw new Error(`v0.28 live verifier is missing ${marker}.`);
}
if (rootManifest.scripts?.["verify:my-agents"] !== "node scripts/verify-my-agents.mjs") throw new Error("Root package.json must expose pnpm verify:my-agents.");
if (!apiApp.includes('version: "0.40.0"')) throw new Error("API metadata must report v0.40.0.");


// v0.29 — Smart Money Plans + Compatibility/Conflict Handling.
const smartMoneyPlans = await readFile(path.join(root, "packages/smart-money-plans/src/index.ts"), "utf8");
const smartMoneyPlanRoutes = await readFile(path.join(root, "apps/api/src/routes/smart-money-plans.ts"), "utf8");
const smartMoneyPlanRepo = await readFile(path.join(root, "apps/web/src/repositories/smartMoneyPlanRepository.ts"), "utf8");
const smartMoneyPlanUi = await readFile(path.join(root, "apps/web/src/components/LiveSmartMoneyPlans.tsx"), "utf8");
const migration0022 = await readFile(path.join(root, "packages/db/migrations/0022_smart_money_plans.sql"), "utf8");
const smartMoneyPlanVerifier = await readFile(path.join(root, "scripts/verify-smart-money-plans.mjs"), "utf8");
const legacyMarketplaceRepo = await readFile(path.join(root, "apps/web/src/repositories/marketplaceRepository.ts"), "utf8");
const legacyApiMarketplaceRepo = await readFile(path.join(root, "apps/web/src/repositories/apiMarketplaceRepository.ts"), "utf8");
for (const marker of ["SmartMoneyPlan", "SmartMoneyPlanMember", "SmartMoneyPlanConflict", "SmartMoneyPlanConflictReport", "BuyerSmartMoneyPlans", "NO_SHARED_EXECUTION"]) {
  if (!domain.includes(marker)) throw new Error(`v0.29 domain model is missing ${marker}.`);
}
for (const marker of ["createSmartMoneyPlanEngine", "PostgresSmartMoneyPlanStore", "ASSET_OVERLAP", "AUTHORITY_OVERLAP", "NETWORK_MISMATCH", "SAME_SERVICE_MULTI_ROLE", "INDEPENDENT_PER_SERVICE", "NO_SHARED_EXECUTION", "IDEMPOTENCY_CONFLICT"]) {
  if (!smartMoneyPlans.includes(marker)) throw new Error(`v0.29 Smart Money Plan engine is missing ${marker}.`);
}
for (const marker of ["smart_money_plans", "composition_hash", "idempotency_key", "check_session_id"]) {
  if (!migration0022.includes(marker)) throw new Error(`v0.29 migration is missing ${marker}.`);
}
for (const route of ["/v1/checks/:checkSessionId/plans", "/v1/plans/:planId", "/v1/accounts/:address/plans"]) {
  if (!smartMoneyPlanRoutes.includes(route)) throw new Error(`Missing v0.29 Smart Money Plan route ${route}.`);
}
for (const marker of ["create", "get", "listForBuyer"]) {
  if (!smartMoneyPlanRepo.includes(marker)) throw new Error(`v0.29 web Smart Money Plan repository is missing ${marker}.`);
}
for (const marker of ["Plan ≠ Super-agent", "Independent per service", "No shared execution", "Compatibility & conflicts", "Review service independently"]) {
  if (!smartMoneyPlanUi.includes(marker)) throw new Error(`v0.29 Smart Money Plan UI is missing ${marker}.`);
}
for (const marker of ["smartMoneyPlansEnabled: true", "planCompatibilityConflictHandlingEnabled: true"]) {
  if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.29 feature ${marker}.`);
}
for (const marker of ["NO_SHARED_EXECUTION", "INDEPENDENT_PER_SERVICE", "/plans", "idempotent", "without creating a shared signer"]) {
  if (!smartMoneyPlanVerifier.includes(marker)) throw new Error(`v0.29 live verifier is missing ${marker}.`);
}
if (legacyMarketplaceRepo.includes("listPlans()") || legacyApiMarketplaceRepo.includes("listPlans()") || legacyApiMarketplaceRepo.includes('apiRequest<SmartMoneyPlanTemplate[]>("/v1/plans")')) throw new Error("Legacy marketplace repositories must not reuse the persisted /v1/plans namespace for mock plan templates.");
if (rootManifest.scripts?.["verify:smart-money-plans"] !== "node scripts/verify-smart-money-plans.mjs") throw new Error("Root package.json must expose pnpm verify:smart-money-plans.");
if (!apiApp.includes('version: "0.40.0"')) throw new Error("API metadata must report v0.40.0.");



// v0.30 — Operator Supply Lifecycle + Workspace.
const operatorWorkspace = await readFile(path.join(root, "packages/operator-workspace/src/index.ts"), "utf8");
const operatorRoutes = await readFile(path.join(root, "apps/api/src/routes/operator-workspace.ts"), "utf8");
const operatorRepo = await readFile(path.join(root, "apps/web/src/repositories/operatorWorkspaceRepository.ts"), "utf8");
const operatorUi = await readFile(path.join(root, "apps/web/src/components/LiveOperatorWorkspace.tsx"), "utf8");
const migration0023 = await readFile(path.join(root, "packages/db/migrations/0023_operator_supply_lifecycle.sql"), "utf8");
const operatorVerifier = await readFile(path.join(root, "scripts/verify-operator-workspace.mjs"), "utf8");
for (const marker of ["OperatorAuthChallenge", "OperatorSession", "OperatorAgentClaim", "OperatorServiceDeclaration", "OperatorSuppliedEvidenceRecord", "OperatorWorkspaceSnapshot"]) {
  if (!domain.includes(marker)) throw new Error(`v0.30 domain model is missing ${marker}.`);
}
for (const marker of ["recoverMessageAddress", "consumeChallenge", "CANONICAL_OWNER_REQUIRED", "DRAFT", "SUBMITTED", "PAUSED", "SUSPENDED", "operator-claimed", "runMarketplaceTests"]) {
  if (!operatorWorkspace.includes(marker)) throw new Error(`v0.30 Operator Workspace engine is missing ${marker}.`);
}
for (const marker of ["operator_auth_challenges", "operator_sessions", "operator_agent_claims", "operator_service_declarations", "operator_supplied_evidence"]) {
  if (!migration0023.includes(marker)) throw new Error(`v0.30 migration is missing ${marker}.`);
}
for (const route of ["/v1/operator/auth/challenge", "/v1/operator/auth/verify", "/v1/operator/workspace", "/v1/operator/claims", "/v1/operator/services", "/v1/operator/evidence", "/test-lab"]) {
  if (!operatorRoutes.includes(route)) throw new Error(`Missing v0.30 operator route ${route}.`);
}
for (const marker of ["challenge", "verify", "workspace", "claim", "saveService", "transition", "test"]) {
  if (!operatorRepo.includes(marker)) throw new Error(`v0.30 web operator repository is missing ${marker}.`);
}
for (const marker of ["Authenticate operator wallet", "Canonical on-chain owner", "Operator Supplied", "Run Test Lab"]) {
  if (!operatorUi.includes(marker)) throw new Error(`v0.30 live Operator Workspace UI is missing ${marker}.`);
}
for (const marker of ["operatorWorkspaceEnabled: true", "operatorSignedSessionAuthEnabled: true", "operatorCanonicalOwnerClaimEnabled: true", "operatorSupplyLifecycleEnabled: true", "operatorTestLabTriggerEnabled: true"]) {
  if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.30 feature ${marker}.`);
}
for (const marker of ["invalid operator signature", "unauthenticated", "does not grant financial authority", "Operator Supply Lifecycle + Workspace security contract passed"]) {
  if (!operatorVerifier.toLowerCase().includes(marker.toLowerCase())) throw new Error(`v0.30 live verifier is missing ${marker}.`);
}
if (rootManifest.scripts?.["verify:operator-workspace"] !== "node scripts/verify-operator-workspace.mjs") throw new Error("Root package.json must expose pnpm verify:operator-workspace.");

// v0.31 — Paid Commercial Rails + ERC-8183/x402/B402 reconciliation.
const paymentRails = await readFile(path.join(root, "packages/payment-rails/src/index.ts"), "utf8");
const paymentRailRoutes = await readFile(path.join(root, "apps/api/src/routes/payment-rails.ts"), "utf8");
const migration0024 = await readFile(path.join(root, "packages/db/migrations/0024_paid_commercial_payment_rails.sql"), "utf8");
const paidRailsVerifier = await readFile(path.join(root, "scripts/verify-paid-rails.mjs"), "utf8");
for (const marker of ["createX402PaymentAdapter", "createB402PaymentAdapter", "ONCHAIN_ERC20_SETTLEMENT", "transferMatched", "timingSatisfied", "settlementDispatchEnabled:false"]) {
  if (!paymentRails.includes(marker)) throw new Error(`v0.31 paid payment rails are missing ${marker}.`);
}
for (const marker of ["Http402SettlementObservation", "PaymentRailStatus", "payToAddress", "transactionHash"]) {
  if (!domain.includes(marker)) throw new Error(`v0.31 domain model is missing ${marker}.`);
}
if (!paymentRailRoutes.includes("/v1/payment-rails/status")) throw new Error("Missing v0.31 payment rail status route.");
for (const marker of ["settlement_tx_hash", "settlement_block_number"]) { if (!migration0024.includes(marker)) throw new Error(`v0.31 migration is missing ${marker}.`); }
for (const marker of ["x402B402PaymentAdaptersEnabled: true", "paidCommercialRailsReconciliationEnabled: true", "paymentSettlementDispatchEnabled: false"]) { if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.31 feature ${marker}.`); }
for (const marker of ["ERC8183", "X402", "B402", "settlementDispatchEnabled", "paid commercial rails contract passed"]) { if (!paidRailsVerifier.includes(marker)) throw new Error(`v0.31 live verifier is missing ${marker}.`); }
if (rootManifest.scripts?.["verify:paid-rails"] !== "node scripts/verify-paid-rails.mjs") throw new Error("Root package.json must expose pnpm verify:paid-rails.");

// v0.32 — Deeper BNB Agent Studio normalized integration.
const agentStudio = await readFile(path.join(root, "packages/agent-studio/src/index.ts"), "utf8");
const agentStudioRoutes = await readFile(path.join(root, "apps/api/src/routes/agent-studio.ts"), "utf8");
const agentStudioRepo = await readFile(path.join(root, "apps/web/src/repositories/agentStudioRepository.ts"), "utf8");
const operatorStudioUi = await readFile(path.join(root, "apps/web/src/components/LiveOperatorWorkspace.tsx"), "utf8");
const migration0025 = await readFile(path.join(root, "packages/db/migrations/0025_agent_studio_integration.sql"), "utf8");
const agentStudioVerifier = await readFile(path.join(root, "scripts/verify-agent-studio.mjs"), "utf8");
for (const marker of ["AgentStudioDeploymentDeclaration", "AgentStudioDeploymentReconciliation", "AgentStudioIntegrationStatus", "AgentStudioOperatorState"]) { if (!domain.includes(marker)) throw new Error(`v0.32 domain model is missing ${marker}.`); }
for (const marker of ["createAgentStudioEngine", "CANONICAL_OWNER_REQUIRED", "A2A_REGISTRATION", "MARKETPLACE_TEST_LAB", "COMMERCE_ALIGNMENT", "studioCliDispatchEnabled:false", "paymentOrExecutionDispatchEnabled:false"]) { if (!agentStudio.includes(marker)) throw new Error(`v0.32 Agent Studio engine is missing ${marker}.`); }
for (const route of ["/v1/agent-studio/status", "/v1/operator/agent-studio/deployments", "/reconcile"]) { if (!agentStudioRoutes.includes(route)) throw new Error(`Missing v0.32 Agent Studio route ${route}.`); }
for (const marker of ["agent_studio_deployments", "reconciliation", "operator_address", "service_id"]) { if (!migration0025.includes(marker)) throw new Error(`v0.32 migration is missing ${marker}.`); }
for (const marker of ["importDeployment", "reconcile", "list"]) { if (!agentStudioRepo.includes(marker)) throw new Error(`v0.32 web Agent Studio repository is missing ${marker}.`); }
for (const marker of ["BNB Agent Studio", "Import Studio deployment", "Reconcile identity + runtime", "never runs"]) { if (!operatorStudioUi.includes(marker)) throw new Error(`v0.32 Operator Workspace Studio UI is missing ${marker}.`); }
for (const marker of ["agentStudioIntegrationEnabled: true", "agentStudioDeploymentReconciliationEnabled: true", "agentStudioCliDispatchEnabled: false"]) { if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.32 feature ${marker}.`); }
for (const marker of ["NORMALIZED_ADAPTER", "canonical-owner", "studioCliDispatchEnabled", "paymentOrExecutionDispatchEnabled", "Agent Studio normalized integration contract passed"]) { if (!agentStudioVerifier.toLowerCase().includes(marker.toLowerCase())) throw new Error(`v0.32 live verifier is missing ${marker}.`); }
if (rootManifest.scripts?.["verify:agent-studio"] !== "node scripts/verify-agent-studio.mjs") throw new Error("Root package.json must expose pnpm verify:agent-studio.");


// v0.33 — Grounded AI Explanation Layer.
const groundedExplanations = await readFile(path.join(root, "packages/grounded-explanations/src/index.ts"), "utf8");
const groundedExplanationRoutes = await readFile(path.join(root, "apps/api/src/routes/grounded-explanations.ts"), "utf8");
const groundedExplanationRepo = await readFile(path.join(root, "apps/web/src/repositories/groundedExplanationRepository.ts"), "utf8");
const groundedExplanationUi = await readFile(path.join(root, "apps/web/src/components/GroundedExplanationPanel.tsx"), "utf8");
const migration0026 = await readFile(path.join(root, "packages/db/migrations/0026_grounded_ai_explanations.sql"), "utf8");
const groundedExplanationVerifier = await readFile(path.join(root, "scripts/verify-grounded-explanations.mjs"), "utf8");
const groundedExplanationTests = await readFile(path.join(root, "packages/grounded-explanations/src/index.test.ts"), "utf8");
const permissionCheckoutUi = await readFile(path.join(root, "apps/web/src/components/PermissionCheckoutPage.tsx"), "utf8");
for (const marker of ["GroundedExplanationPacket", "GroundedExplanationFact", "GroundedExplanationRecord", "GroundedExplanationStatus", "DETERMINISTIC_FALLBACK"]) { if (!domain.includes(marker)) throw new Error(`v0.33 domain model is missing ${marker}.`); }
for (const marker of ["OpenAiResponsesExplanationProvider", "store: false", "json_schema", "deterministicFallback", "validateContent", "unsupportedTokens", "citedDecisionMaterial", "DECISION_GRADE_TERMS", "decisionGradeTerms", "webSearchEnabled: false", "decisionAuthorityEnabled: false"]) { if (!groundedExplanations.includes(marker)) throw new Error(`v0.33 grounded explanation engine is missing ${marker}.`); }
for (const route of ["/v1/explanations/status", "/v1/explanations/grounding", "/v1/explanations", "/v1/explanations/:explanationId"]) { if (!groundedExplanationRoutes.includes(route)) throw new Error(`Missing v0.33 grounded explanation route ${route}.`); }
for (const marker of ["grounded_ai_explanations", "grounding_packet_hash", "payload", "subject_type"]) { if (!migration0026.includes(marker)) throw new Error(`v0.33 migration is missing ${marker}.`); }
for (const marker of ["explain", "grounding", "status"]) { if (!groundedExplanationRepo.includes(marker)) throw new Error(`v0.33 web explanation repository is missing ${marker}.`); }
for (const marker of ["Grounded explanation", "Show grounding packet", "No web/tools or write-back authority", "DETERMINISTIC FALLBACK"]) { if (!groundedExplanationUi.includes(marker)) throw new Error(`v0.33 grounded explanation UI is missing ${marker}.`); }
if (!appUi.includes('subjectType="ACTIVATION"') || !permissionCheckoutUi.includes('subjectType="PERMISSION_REQUEST"')) throw new Error("v0.33 contextual explanation surfaces must cover Activation activity/payment/outcome and Permission Checkout state.");
for (const marker of ["grounding packet preserves finding evidence references", "decision-grade words require cited deterministic DECISION facts", "prompt-injection text remains inert context", "provider failure degrades safely", "Could Not Assess", "transaction occurred", "provider receives a clone", "fabricate a PermissionGrant"]) { if (!groundedExplanationTests.includes(marker)) throw new Error(`v0.33 grounded explanation tests are missing ${marker}.`); }
for (const marker of ["groundedAiExplanationEnabled: true", "groundedAiStructuredOutputEnabled: true", "groundedAiWebSearchEnabled: false", "groundedAiDecisionAuthorityEnabled: false"]) { if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.33 feature ${marker}.`); }
for (const marker of ["deterministic grounding packet", "citation validation", "no decision/write authority", "groundedAiWebSearchEnabled"]) { if (!groundedExplanationVerifier.toLowerCase().includes(marker.toLowerCase())) throw new Error(`v0.33 live verifier is missing ${marker}.`); }
if (groundedExplanationRoutes.includes("prompt")) throw new Error("v0.33 public explanation API must not expose an arbitrary prompt field.");
if (groundedExplanations.includes('"web_search"') || groundedExplanations.includes("'web_search'")) throw new Error("v0.33 explanation provider must not enable web search tools.");
if (rootManifest.scripts?.["verify:grounded-explanations"] !== "node scripts/verify-grounded-explanations.mjs") throw new Error("Root package.json must expose pnpm verify:grounded-explanations.");

// v0.34 — Agent Advantage Measurement + Report.
const agentAdvantage = await readFile(path.join(root, "packages/agent-advantage/src/index.ts"), "utf8");
const agentAdvantageTests = await readFile(path.join(root, "packages/agent-advantage/src/index.test.ts"), "utf8");
const agentAdvantageRoutes = await readFile(path.join(root, "apps/api/src/routes/agent-advantage.ts"), "utf8");
const agentAdvantageRepo = await readFile(path.join(root, "apps/web/src/repositories/agentAdvantageRepository.ts"), "utf8");
const agentAdvantageUi = await readFile(path.join(root, "apps/web/src/components/AgentAdvantageReportPanel.tsx"), "utf8");
const migration0027 = await readFile(path.join(root, "packages/db/migrations/0027_agent_advantage_reports.sql"), "utf8");
const agentAdvantageVerifier = await readFile(path.join(root, "scripts/verify-agent-advantage.mjs"), "utf8");
for (const marker of ["AgentAdvantageReport", "AgentAdvantageMeasurementWindow", "AgentAdvantageAssessmentState", "BuyerAgentAdvantageState", "PARTIAL_EVIDENCE"]) { if (!domain.includes(marker)) throw new Error(`v0.34 domain model is missing ${marker}.`); }
for (const marker of ["createAgentAdvantageEngine", "PostgresAgentAdvantageStore", "explicitMeasurementWindowsEnabled:true", "financialAdvantageInferenceEnabled:false", "transactionSuccessImpliesAdvantage:false", "ADVANTAGE_METRICS", "Could Not Assess", "Transaction success is not financial advantage"]) { if (!agentAdvantage.replaceAll(" ","").includes(marker.replaceAll(" ",""))) throw new Error(`v0.34 Agent Advantage engine is missing ${marker}.`); }
for (const route of ["/v1/agent-advantage/status", "/v1/activations/:activationId/advantage-reports/sync", "/v1/activations/:activationId/advantage-reports/latest", "/v1/activations/:activationId/advantage-reports", "/v1/accounts/:address/advantage-reports"]) { if (!agentAdvantageRoutes.includes(route)) throw new Error(`Missing v0.34 Agent Advantage route ${route}.`); }
for (const marker of ["agent_advantage_reports", "source_fingerprint", "window_started_at", "window_ended_at", "unique (activation_id, source_fingerprint)"]) { if (!migration0027.includes(marker)) throw new Error(`v0.34 migration is missing ${marker}.`); }
for (const marker of ["sync", "latest", "history", "forBuyer"]) { if (!agentAdvantageRepo.includes(marker)) throw new Error(`v0.34 web Agent Advantage repository is missing ${marker}.`); }
for (const marker of ["Agent Advantage", "Service contribution", "Transaction evidence", "Financial outcome", "Could Not Assess", "Measurement window"]) { if (!agentAdvantageUi.includes(marker)) throw new Error(`v0.34 Agent Advantage UI is missing ${marker}.`); }
for (const marker of ["read-only runtime contribution does not become financial Agent Advantage", "transaction success alone never becomes Agent Advantage", "advantage-shaped metric without evidence", "same source facts are idempotent", "revoked relationship closes its explicit measurement window"]) { if (!agentAdvantageTests.includes(marker)) throw new Error(`v0.34 Agent Advantage tests are missing ${marker}.`); }
for (const marker of ["agentAdvantageMeasurementEnabled: true", "agentAdvantageReportHistoryEnabled: true", "agentAdvantageFinancialInferenceEnabled: false", "agentAdvantageTransactionSuccessImpliesAdvantage: false"]) { if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.34 feature ${marker}.`); }
for (const marker of ["explicit window", "Transaction success is not financial advantage", "Could Not Assess", "service contribution, transaction evidence, financial outcome and Agent Advantage remain separate"]) { if (!agentAdvantageVerifier.toLowerCase().includes(marker.toLowerCase())) throw new Error(`v0.34 live verifier is missing ${marker}.`); }
if (rootManifest.scripts?.["verify:agent-advantage"] !== "node scripts/verify-agent-advantage.mjs") throw new Error("Root package.json must expose pnpm verify:agent-advantage.");

// v0.35 — Observability + Marketplace/System Health.
const observability = await readFile(path.join(root, "packages/observability/src/index.ts"), "utf8");
const observabilityTests = await readFile(path.join(root, "packages/observability/src/index.test.ts"), "utf8");
const observabilityRoutes = await readFile(path.join(root, "apps/api/src/routes/observability.ts"), "utf8");
const systemHealthRepo = await readFile(path.join(root, "apps/web/src/repositories/systemHealthRepository.ts"), "utf8");
const systemHealthUi = await readFile(path.join(root, "apps/web/src/components/SystemHealthIndicator.tsx"), "utf8");
const migration0028 = await readFile(path.join(root, "packages/db/migrations/0028_operational_observability.sql"), "utf8");
const observabilityVerifier = await readFile(path.join(root, "scripts/verify-observability.mjs"), "utf8");
for (const marker of ["OperationalHealthSnapshot", "PublicOperationalHealthSnapshot", "WorkerOperationalHeartbeat", "OperationalHealthComponent", "operationalOnly"]) { if (!domain.includes(marker)) throw new Error(`v0.35 domain model is missing ${marker}.`); }
for (const marker of ["OPERATIONAL_HEALTH_METHOD", "PostgresOperationalHealthStore", "RequestMetricsTracker", "publicCurrent", "marketplaceReadinessAuthority:false", "financialReadinessAuthority:false", "paymentAuthority:false", "permissionAuthority:false", "executionAuthority:false", "outcomeAuthority:false", "sanitizeDiagnostic", "publicCacheTtlMs"]) { if (!observability.replaceAll(" ","").includes(marker.replaceAll(" ",""))) throw new Error(`v0.35 observability engine is missing ${marker}.`); }
for (const route of ["/v1/system/health", "/v1/admin/observability", "/v1/admin/observability/snapshots"]) { if (!observabilityRoutes.includes(route)) throw new Error(`Missing v0.35 observability route ${route}.`); }
for (const marker of ["ADMIN_DIAGNOSTICS_NOT_CONFIGURED", "ADMIN_DIAGNOSTICS_AUTH_REQUIRED", "timingSafeEqual", "Bearer"]) { if (!observabilityRoutes.includes(marker)) throw new Error(`v0.35 admin diagnostics boundary is missing ${marker}.`); }
for (const marker of ["operational_health_snapshots", "operational_worker_heartbeats", "platform_state", "marketplace_state", "observed_at"]) { if (!migration0028.includes(marker)) throw new Error(`v0.35 migration is missing ${marker}.`); }
for (const marker of ["getPublic", "/v1/system/health"]) { if (!systemHealthRepo.includes(marker)) throw new Error(`v0.35 web system-health repository is missing ${marker}.`); }
for (const marker of ["Platform", "Marketplace", "Operational only", "not an agent trust/readiness score"]) { if (!systemHealthUi.includes(marker)) throw new Error(`v0.35 system-health UI is missing ${marker}.`); }
for (const marker of ["healthy operational snapshot remains separate from readiness/payment/permission authority", "missing platform dependency configuration degrades aggregate health", "public projection redacts endpoint diagnostics and credentials", "elevated API 5xx rate degrades platform health", "stale Test Lab evidence degrades marketplace/runtime observability", "worker heartbeat persistence has freshness semantics", "sync persists immutable health samples and history"]) { if (!observabilityTests.includes(marker)) throw new Error(`v0.35 observability tests are missing ${marker}.`); }
for (const marker of ["operationalObservabilityEnabled: true", "publicSystemHealthEnabled: true", "operationalHealthMarketplaceReadinessAuthority: false", "operationalHealthFinancialReadinessAuthority: false"]) { if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.35 feature ${marker}.`); }
for (const marker of ["structured/redacted", "fail closed", "readiness", "trust", "payment", "permission", "execution", "outcome authority"]) { if (!observabilityVerifier.toLowerCase().includes(marker.toLowerCase())) throw new Error(`v0.35 live verifier is missing ${marker}.`); }
if (!observabilityVerifier.includes("versionAtLeast") || !observabilityVerifier.includes('"0.35.0"')) throw new Error("v0.35 historical observability verifier must accept current/future Spotriq releases using a >=0.35.0 live-version floor.");
if (!appUi.includes("SystemHealthIndicator")) throw new Error("v0.35 public web shell must expose the non-authoritative system-health indicator.");
if (rootManifest.scripts?.["verify:observability"] !== "node scripts/verify-observability.mjs") throw new Error("Root package.json must expose pnpm verify:observability.");

// v0.36 — Security + Failure Injection Hardening.
const securityHardening = await readFile(path.join(root, "packages/security-hardening/src/index.ts"), "utf8");
const securityHardeningTests = await readFile(path.join(root, "packages/security-hardening/src/index.test.ts"), "utf8");
const chainTestsV036 = await readFile(path.join(root, "packages/chain/src/index.test.ts"), "utf8");
const testLabV036 = await readFile(path.join(root, "packages/marketplace-supply/src/test-lab.ts"), "utf8");
const testLabTestsV036 = await readFile(path.join(root, "packages/marketplace-supply/src/test-lab.test.ts"), "utf8");
const commercialV036 = await readFile(path.join(root, "packages/commercial/src/index.ts"), "utf8");
const commercialTestsV036 = await readFile(path.join(root, "packages/commercial/src/index.test.ts"), "utf8");
const paymentRailsV036 = await readFile(path.join(root, "packages/payment-rails/src/index.ts"), "utf8");
const operatorV036 = await readFile(path.join(root, "packages/operator-workspace/src/index.ts"), "utf8");
const studioV036 = await readFile(path.join(root, "packages/agent-studio/src/index.ts"), "utf8");
const migration0029 = await readFile(path.join(root, "packages/db/migrations/0029_security_failure_injection_hardening.sql"), "utf8");
const securityVerifier = await readFile(path.join(root, "scripts/verify-security-hardening.mjs"), "utf8");
for (const marker of ["validateExternalHttpUrl", "isPublicNetworkAddress", "normalizeUntrustedText", "assertStructuredJsonBudget", "isDatabaseUniqueViolation", "UNSAFE_URL", "UNTRUSTED_TEXT", "STRUCTURE_LIMIT"]) { if (!securityHardening.includes(marker)) throw new Error(`v0.36 security-hardening package is missing ${marker}.`); }
for (const marker of ["pinnedNodeFetch", "assertPublicResolution", 'redirect: "manual"', "maxResponseBytes", "validateA2aCard", "assertStructuredJsonBudget"]) { if (!testLabV036.includes(marker)) throw new Error(`v0.36 Test Lab hostile-network boundary is missing ${marker}.`); }
for (const marker of ["blocks localhost/private targets", "revalidates redirects", "maliciously deep or oversized Agent Card"]) { if (!testLabTestsV036.includes(marker)) throw new Error(`v0.36 Test Lab adversarial tests are missing ${marker}.`); }
for (const marker of ["rpcResponseMaxBytes", "RPC_RESPONSE_INVALID", "body.id !== requestId", "blockDivergence", "rpcDivergenceToleranceBlocks", "validate?.(result)"]) { if (!chainAdapter.includes(marker)) throw new Error(`v0.36 BSC RPC hardening is missing ${marker}.`); }
for (const marker of ["mismatched JSON-RPC id", "material block divergence", "transaction evidence for a different hash"]) { if (!chainTestsV036.includes(marker)) throw new Error(`v0.36 BSC adversarial tests are missing ${marker}.`); }
for (const marker of ["claimActivationIdempotency", "commercial_activation_idempotency_claims", "isDatabaseUniqueViolation", "PAYMENT_MISMATCH", "IDEMPOTENCY_CONFLICT", "validateExternalHttpUrl"]) { const source = marker === "commercial_activation_idempotency_claims" ? migration0029 : commercialV036; if (!source.includes(marker)) throw new Error(`v0.36 commercial race/input hardening is missing ${marker}.`); }
for (const marker of ["transactionReceiptBlockCoherent", "transferLogIndexPresent", "futureLimit", "receipt.transactionHash", "tx.hash"]) { if (!paymentRailsV036.includes(marker)) throw new Error(`v0.36 payment evidence hardening is missing ${marker}.`); }
for (const marker of ["normalizeUntrustedText", "validateExternalHttpUrl", "boundedTextArray", "permission authority flags must be booleans"]) { if (!operatorV036.includes(marker)) throw new Error(`v0.36 Operator Workspace hostile-input hardening is missing ${marker}.`); }
for (const marker of ["validateExternalHttpUrl", "normalizeUntrustedText", "studioVersion"]) { if (!studioV036.includes(marker)) throw new Error(`v0.36 Agent Studio hostile-input hardening is missing ${marker}.`); }
if (!studioV036.includes('runtimeUrl: string=https(input.runtimeUrl,"runtimeUrl").toString()') || !studioV036.includes('agentCardUrl: string=https(input.agentCardUrl,"agentCardUrl").toString()')) throw new Error("v0.36 Agent Studio validated URLs must cross the domain boundary as explicit strings.");
if (chainAdapter.includes("toSorted(")) throw new Error("v0.36 BSC provider hardening must remain compatible with the repository TypeScript target; Array.prototype.toSorted() is not allowed.");
if (!chainAdapter.includes("[...observedBlocks].sort(")) throw new Error("v0.36 BSC provider divergence ordering must use a copied target-compatible sort.");
for (const marker of ["commercial_activation_idempotency_claims", "primary key (buyer_address, idempotency_key)", "unique (activation_id)"]) { if (!migration0029.includes(marker)) throw new Error(`v0.36 migration is missing ${marker}.`); }
for (const marker of ["public-address policy blocks", "untrusted URL policy rejects", "untrusted text rejects", "structured response budget rejects", "database unique violation detection"]) { if (!securityHardeningTests.includes(marker)) throw new Error(`v0.36 shared security tests are missing ${marker}.`); }
for (const marker of ["securityFailureHardeningEnabled: true", "ssrfPinnedTransportEnabled: true", "maliciousMetadataValidationEnabled: true", "rpcResponseValidationEnabled: true", "rpcDivergenceDetectionEnabled: true", "paymentReplayRaceProtectionEnabled: true", "activationIdempotencyClaimEnabled: true", "runtimeFailureInjectionEndpointEnabled: false"]) { if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.36 feature ${marker}.`); }
for (const marker of ["hostile URLs/metadata/provider payloads", "RPC divergence", "payment replay races", "Activation idempotency races", "failure-injection endpoint must not exist", "runtimeFailureInjectionEndpointEnabled=false"]) { if (!securityVerifier.includes(marker)) throw new Error(`v0.36 live verifier is missing ${marker}.`); }
if (!securityVerifier.includes("versionAtLeast") || !securityVerifier.includes('"0.36.0"') || !securityVerifier.includes("Deploy the current v0.36 repository before running this live verifier")) throw new Error("v0.36 live verifier must enforce a >=0.36.0 deployed-version floor and explain deployment lag explicitly.");
if (rootManifest.scripts?.["verify:security-hardening"] !== "node scripts/verify-security-hardening.mjs") throw new Error("Root package.json must expose pnpm verify:security-hardening.");
if (securityVerifier.includes('method:"POST"') && !securityVerifier.includes('/v1/admin/failure-injection')) throw new Error("v0.36 verifier must not add a hidden production fault-injection path.");


// v0.37 — Production Hardening + Scale Readiness.
const productionHardening = await readFile(path.join(root, "packages/production-hardening/src/index.ts"), "utf8");
const productionHardeningTests = await readFile(path.join(root, "packages/production-hardening/src/index.test.ts"), "utf8");
const migration0030 = await readFile(path.join(root, "packages/db/migrations/0030_production_hardening_scale_readiness.sql"), "utf8");
const migrateV037 = await readFile(path.join(root, "packages/db/src/migrate.ts"), "utf8");
const dbV037 = await readFile(path.join(root, "packages/db/src/index.ts"), "utf8");
const workerV037 = await readFile(path.join(root, "apps/worker/src/index.ts"), "utf8");
const productionVerifier = await readFile(path.join(root, "scripts/verify-production-hardening.mjs"), "utf8");
const productionRunbook = await readFile(path.join(root, "docs/runbooks/PRODUCTION_OPERATIONS.md"), "utf8");
for (const marker of ["PostgresRateLimitStore", "MemoryRateLimitStore", "PostgresDurableWorkQueue", "FOR UPDATE SKIP LOCKED".toLowerCase(), "DEAD_LETTER", "cacheControlFor", "retryDelayMs"]) { const hay=productionHardening.toLowerCase(); if (!hay.includes(marker.toLowerCase())) throw new Error(`v0.37 production-hardening package is missing ${marker}.`); }
for (const marker of ["production_rate_limit_buckets", "production_work_queue", "DEAD_LETTER", "idx_production_work_queue_claim", "idx_activations_buyer_started_v037"]) if (!migration0030.includes(marker)) throw new Error(`v0.37 migration is missing ${marker}.`);
for (const marker of ["pg_try_advisory_lock", "checksum_sha256", "Migration drift detected", "pg_advisory_unlock"]) if (!migrateV037.includes(marker)) throw new Error(`v0.37 migration runner hardening is missing ${marker}.`);
for (const marker of ["statement_timeout", "application_name", "databasePoolMax"]) { const hay=dbV037+apiApp; if (!hay.includes(marker)) throw new Error(`v0.37 database/runtime tuning is missing ${marker}.`); }
for (const marker of ["CLEANUP_RATE_LIMIT_BUCKETS", "queue.claim", "queue.fail", "API_INLINE"]) if (!workerV037.includes(marker)) throw new Error(`v0.37 worker maturity is missing ${marker}.`);
for (const marker of ["rate limiting fails closed", "durable work enqueue is idempotent", "dead letters", "cache policy never publicly caches authority/commercial state", "client keys are stable hashes", "retry backoff is bounded"]) if (!productionHardeningTests.includes(marker)) throw new Error(`v0.37 production hardening tests are missing ${marker}.`);
for (const marker of ["productionHardeningEnabled: true", "distributedRateLimitEnabled:", "degradedLocalRateLimitFallbackEnabled:", "boundedRequestBodyEnabled: true", "requestTimeoutGuardEnabled: true", "cachePolicyEnabled: true", "durableWorkQueueEnabled:", "workerFinancialJobDispatchEnabled: false", "migrationAdvisoryLockEnabled: true", "migrationChecksumGuardEnabled: true", "backupRecoveryRunbookEnabled: true"]) if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.37 feature ${marker}.`);
for (const marker of ["distributed rate limiting", "durable maintenance queue", "workerFinancialJobDispatchEnabled=false", "API_INLINE", "migration resilience"]) if (!productionVerifier.includes(marker)) throw new Error(`v0.37 live verifier is missing ${marker}.`);
for (const marker of ["pg_dump", "pg_restore", "Rollback", "Queue recovery", "Mainnet policy"]) if (!productionRunbook.includes(marker)) throw new Error(`v0.37 production runbook is missing ${marker}.`);
if (rootManifest.scripts?.["verify:production-hardening"] !== "node scripts/verify-production-hardening.mjs") throw new Error("Root package.json must expose pnpm verify:production-hardening.");
if (!apiApp.includes("bodyLimit: config.apiBodyLimitBytes") || !apiApp.includes("requestTimeout: config.apiRequestTimeoutMs") || !apiApp.includes("trustProxy: config.trustProxyHops")) throw new Error("v0.37 Fastify request/trust budgets must be wired at server construction.");
if (!apiApp.includes("distributed rate limiter unavailable; using process-local degraded limiter")) throw new Error("v0.37 must preserve abuse protection when distributed rate-limit persistence degrades.");

// v0.38 — Ecosystem Adoption + Judge/Public Launch Readiness.
const adoptionReadiness = await readFile(path.join(root, "packages/adoption-readiness/src/index.ts"), "utf8");
const adoptionTests = await readFile(path.join(root, "packages/adoption-readiness/src/index.test.ts"), "utf8");
const adoptionRoutes = await readFile(path.join(root, "apps/api/src/routes/adoption.ts"), "utf8");
const adoptionUi = await readFile(path.join(root, "apps/web/src/components/LaunchReadinessPage.tsx"), "utf8");
const adoptionRepo = await readFile(path.join(root, "apps/web/src/repositories/adoptionReadinessRepository.ts"), "utf8");
const adoptionVerifier = await readFile(path.join(root, "scripts/verify-adoption-readiness.mjs"), "utf8");
const adoptionCapture = await readFile(path.join(root, "scripts/capture-public-launch-evidence.mjs"), "utf8");
const publicArchitecture = await readFile(path.join(root, "docs/public/ARCHITECTURE_AND_TRUST_BOUNDARIES.md"), "utf8");
const publicBnb = await readFile(path.join(root, "docs/public/BNB_ECOSYSTEM_INTEGRATION.md"), "utf8");
const demoPlaybook = await readFile(path.join(root, "docs/public/DEMO_PLAYBOOK.md"), "utf8");
const submissionChecklist = await readFile(path.join(root, "docs/public/SUBMISSION_CHECKLIST.md"), "utf8");
for (const marker of ["spotriq.public-adoption@1.0.0", "PUBLIC_LAUNCH_CANDIDATE", "BSC Mainnet", "BSC Testnet", "bscMainnetFinancialExecutionApproved: false", "ERC8004", "BNB_AGENT_STUDIO", "ERC8183", "X402_B402", "AI explains. Deterministic systems decide."]) if (!adoptionReadiness.includes(marker)) throw new Error(`v0.38 adoption manifest is missing ${marker}.`);
for (const marker of ["public adoption manifest preserves product and network truth", "keeps integrations distinct from authority", "mainnetFinancialExecutionApproved"]) if (!adoptionTests.includes(marker)) throw new Error(`v0.38 adoption tests are missing ${marker}.`);
if (!adoptionRoutes.includes('/v1/public/adoption') || !apiApp.includes('registerAdoptionRoutes(app)')) throw new Error("v0.38 public adoption route is not registered.");
if (!adoptionRepo.includes('/v1/public/adoption') || !adoptionUi.includes('Why Spotriq') && !adoptionUi.includes('BNB ecosystem adoption package')) throw new Error("v0.38 web adoption surface is incomplete.");
for (const marker of ["publicAdoptionManifestEnabled: true", "publicLaunchDocumentationEnabled: true", "publicEvidenceCaptureEnabled: true", "bscMainnetFinancialExecutionApproved: false"]) if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.38 feature ${marker}.`);
for (const marker of ["v0.38 adoption acceptance requires deployed Spotriq >=0.38.0", "BSC Mainnet discovery=56", "mainnet financial execution remains unapproved", "four reference categories"]) if (!adoptionVerifier.includes(marker)) throw new Error(`v0.38 live verifier is missing ${marker}.`);
for (const marker of ["spotriq.public-launch-evidence@1.0.0", "/v1/public/adoption", "/v1/reference-agents", "Production must be >=0.38.0", "bscMainnetFinancialExecutionApproved"]) if (!adoptionCapture.includes(marker)) throw new Error(`v0.38 evidence capture is missing ${marker}.`);
for (const marker of ["AgentIdentity ≠ AgentListing ≠ AgentService ≠ Offer", "BSC Mainnet", "BSC Testnet", "AI explains. Deterministic systems decide."]) if (!publicArchitecture.includes(marker)) throw new Error(`v0.38 public architecture brief is missing ${marker}.`);
for (const marker of ["ERC-8004", "BNB Agent Studio", "ERC-8183", "x402 / B402", "PancakeSwap", "Venus"]) if (!publicBnb.includes(marker)) throw new Error(`v0.38 BNB integration brief is missing ${marker}.`);
for (const marker of ["Production proof", "Permission boundary", "Agent Advantage", "Grounded AI", "Operator + BNB story"]) if (!demoPlaybook.includes(marker)) throw new Error(`v0.38 demo playbook is missing ${marker}.`);
for (const marker of ["final demo video URL", "public frontend URL", "GitHub repository URL", "These external values are intentionally not fabricated"]) if (!submissionChecklist.includes(marker)) throw new Error(`v0.38 submission checklist is missing ${marker}.`);
if (rootManifest.scripts?.["verify:adoption-readiness"] !== "node scripts/verify-adoption-readiness.mjs") throw new Error("Root package.json must expose pnpm verify:adoption-readiness.");
if (rootManifest.scripts?.["capture:public-launch-evidence"] !== "node scripts/capture-public-launch-evidence.mjs") throw new Error("Root package.json must expose pnpm capture:public-launch-evidence.");
if (!apiApp.includes('version: "0.40.0"') || !workerV037.includes('version: "0.40.0"')) throw new Error("API and worker release metadata must report v0.40.0.");
if (!gitignore.includes("artifacts/*.json")) throw new Error("Generated public launch evidence must be ignored by default to avoid accidental canonicalization.");


// v0.39 — Production Analytics + Adoption Feedback Loop.
const adoptionAnalytics = await readFile(path.join(root, "packages/adoption-analytics/src/index.ts"), "utf8");
const adoptionAnalyticsTests = await readFile(path.join(root, "packages/adoption-analytics/src/index.test.ts"), "utf8");
const adoptionAnalyticsRoutes = await readFile(path.join(root, "apps/api/src/routes/adoption-analytics.ts"), "utf8");
const adoptionAnalyticsRepo = await readFile(path.join(root, "apps/web/src/repositories/adoptionAnalyticsRepository.ts"), "utf8");
const adoptionAnalyticsDashboard = await readFile(path.join(root, "apps/web/src/components/AdminAdoptionAnalyticsDashboard.tsx"), "utf8");
const adoptionFeedbackPrompt = await readFile(path.join(root, "apps/web/src/components/AdoptionFeedbackPrompt.tsx"), "utf8");
const migration0031 = await readFile(path.join(root, "packages/db/migrations/0031_production_adoption_analytics.sql"), "utf8");
const adoptionAnalyticsVerifier = await readFile(path.join(root, "scripts/verify-adoption-analytics.mjs"), "utf8");
const adoptionBaselineCapture = await readFile(path.join(root, "scripts/capture-adoption-baseline.mjs"), "utf8");
const adoptionAnalyticsDoc = await readFile(path.join(root, "docs/PRODUCTION_ADOPTION_ANALYTICS.md"), "utf8");
for (const marker of ["ADOPTION_EVENT_NAMES", "HOME_VIEWED", "EXPLORE_VIEWED", "SERVICE_PROFILE_VIEWED", "ACCEPTANCE", "sessionHash", "PostgresAdoptionAnalyticsStore", "financialTruth:false", "Wallet-connect conversion is not reported"]) if (!adoptionAnalytics.replaceAll(" ","").includes(marker.replaceAll(" ",""))) throw new Error(`v0.39 adoption analytics package is missing ${marker}.`);
for (const marker of ["raw wallet addresses are rejected", "acceptance events are excluded", "domain facts remain authoritative", "Agent Advantage coverage cannot become financial truth", "invalid vocabulary"]) if (!adoptionAnalyticsTests.includes(marker)) throw new Error(`v0.39 adoption analytics tests are missing ${marker}.`);
for (const route of ["/v1/analytics/events", "/v1/analytics/feedback", "/v1/admin/adoption-analytics", "/v1/admin/adoption-analytics/export"]) if (!adoptionAnalyticsRoutes.includes(route)) throw new Error(`Missing v0.39 adoption analytics route ${route}.`);
for (const marker of ["adoption_analytics_events", "adoption_feedback", "PRODUCT", "ACCEPTANCE", "session_hash", "reason_code"]) if (!migration0031.includes(marker)) throw new Error(`v0.39 analytics migration is missing ${marker}.`);
for (const marker of ["spotriq:analytics-session:v1", "/v1/analytics/events", "/v1/analytics/feedback"]) if (!adoptionAnalyticsRepo.includes(marker)) throw new Error(`v0.39 web analytics repository is missing ${marker}.`);
for (const marker of ["Production adoption analytics", "Privacy-bounded", "financial truth", "All categories"]) if (!adoptionAnalyticsDashboard.includes(marker)) throw new Error(`v0.39 private dashboard is missing ${marker}.`);
if (!adoptionFeedbackPrompt.includes("feedback is recorded separately") || !appUi.includes('get("admin") === "analytics"')) throw new Error("v0.39 feedback/dashboard surfaces must remain contextual and outside normal public navigation.");
for (const marker of ["adoptionAnalyticsEnabled: true", "privacyBoundedProductTelemetryEnabled: true", "adoptionFeedbackEnabled: true", "adoptionAnalyticsFinancialTruthAuthority: false"]) if (!apiApp.includes(marker)) throw new Error(`API capabilities must expose truthful v0.39 feature ${marker}.`);
for (const marker of ["raw wallet", "ACCEPTANCE traffic separation", "deterministic domain records", "deployed Spotriq >=0.39.0"]) if (!adoptionAnalyticsVerifier.includes(marker)) throw new Error(`v0.39 live verifier is missing ${marker}.`);
for (const marker of ["spotriq.adoption-baseline@1.0.0", "/v1/admin/adoption-analytics", "financialTruth", "Private production measurement artifact"]) if (!adoptionBaselineCapture.includes(marker)) throw new Error(`v0.39 baseline capture is missing ${marker}.`);
for (const marker of ["Domain facts remain authoritative", "Acceptance traffic", "raw wallet", "Agent Advantage", "not financial truth"]) if (!adoptionAnalyticsDoc.includes(marker)) throw new Error(`v0.39 analytics documentation is missing ${marker}.`);
if (rootManifest.scripts?.["verify:adoption-analytics"] !== "node scripts/verify-adoption-analytics.mjs") throw new Error("Root package.json must expose pnpm verify:adoption-analytics.");
if (rootManifest.scripts?.["capture:adoption-baseline"] !== "node scripts/capture-adoption-baseline.mjs") throw new Error("Root package.json must expose pnpm capture:adoption-baseline.");
if (!apiApp.includes('version: "0.40.0"') || !workerV037.includes('version: "0.40.0"')) throw new Error("API and worker release metadata must report v0.40.0.");
if (!apiApp.includes("PostgresAdoptionAnalyticsStore") || !apiApp.includes("MemoryAdoptionAnalyticsStore") || !apiApp.includes("registerAdoptionAnalyticsRoutes")) throw new Error("v0.39 analytics engine is not wired into the API.");

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
if (manifests.length !== 40) throw new Error(`v0.39 expects 40 repository package manifests, found ${manifests.length}.`);
for (const manifestPath of manifests) {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.version !== "0.40.0") throw new Error(`${path.relative(root, manifestPath)} must be version 0.40.0.`);
}

console.log("Spotriq foundation + accepted v0.22–v0.39 baseline + evidence-driven v0.40 Marketplace Supply Discovery + Qualification verification passed.");

