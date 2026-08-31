import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type {
  ApiErrorBody,
  ApiEnvelope,
  CapabilityResponse,
  HealthResponse,
  MetaResponse,
} from "@spotriq/api-contracts";
import { BscChainError, createBscChainAdapter, type BscChainReader } from "@spotriq/chain";
import { AgentRegistryError, createAgentRegistry, MemoryAgentRegistryStore, PostgresAgentRegistryStore, type AgentRegistryReader } from "@spotriq/agent-registry";
import { loadServerConfig, type ServerConfig } from "@spotriq/config";
import { getDatabaseHealth, getDatabasePool } from "@spotriq/db";
import {
  createPancakeSwapAdapter,
  PancakeSwapAdapterError,
  type PancakeSwapReader,
} from "@spotriq/protocol-pancakeswap";
import { createGridMarketContextEngine, GridMarketContextError, type GridMarketContextReader } from "@spotriq/market-context";
import { createSmartMoneyEngine, MemorySmartMoneyStore, PostgresSmartMoneyStore, type SmartMoneyEngine } from "@spotriq/smart-money";
import { createMarketplaceSupply, createMarketplaceTestLab, MemoryMarketplaceSupplyStore, MarketplaceSupplyError, PostgresMarketplaceSupplyStore, type MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { createJobIntentEngine, JobIntentError, MemoryJobIntentStore, PostgresJobIntentStore, type JobIntentEngine } from "@spotriq/job-intents";
import { AuthorityError, createAuthorityEngine, MemoryAuthorityStore, PostgresAuthorityStore, type AuthorityEngine } from "@spotriq/authority";
import { createAltanaKeystoreVerifier } from "@spotriq/authority/altana";
import { createExecutionPlanEngine, ExecutionPlanError, MemoryExecutionPlanStore, PostgresExecutionPlanStore, type ExecutionPlanEngine } from "@spotriq/execution-plans";
import { createExecutionBoundaryEngine, ExecutionBoundaryError, MemoryExecutionBoundaryStore, PostgresExecutionBoundaryStore, type ExecutionBoundaryEngine } from "@spotriq/execution-boundary";
import { ControlledExecutionError, createControlledExecutionEngine, MemoryControlledExecutionStore, PostgresControlledExecutionStore, type ControlledExecutionEngine } from "@spotriq/controlled-execution";
import { ActivityOutcomesError, createActivityOutcomesEngine, MemoryActivityOutcomesStore, PostgresActivityOutcomesStore, type ActivityOutcomesEngine } from "@spotriq/activity-outcomes";
import { createServiceTaskEngine, MemoryServiceTaskStore, PostgresServiceTaskStore, ServiceTaskError, type ServiceTaskEngine } from "@spotriq/service-tasks";
import { CommercialError, createCommercialEngine, createErc8183PaymentAdapter, MemoryCommercialStore, PostgresCommercialStore, type CommercialEngine } from "@spotriq/commercial";
import { createVenusAdapter, VenusAdapterError, type VenusReader } from "@spotriq/protocol-venus";
import { ApiInputError } from "./errors.js";
import { registerChainRoutes } from "./routes/chain.js";
import { registerEvidenceRoutes } from "./routes/evidence.js";
import { registerPancakeSwapRoutes } from "./routes/pancakeswap.js";
import { registerVenusRoutes } from "./routes/venus.js";
import { registerCheckRoutes } from "./routes/checks.js";
import { registerMarketContextRoutes } from "./routes/market-context.js";
import { registerAgentRoutes } from "./routes/agents.js";
import { registerMarketplaceRoutes } from "./routes/marketplace.js";
import { registerJobIntentRoutes } from "./routes/job-intents.js";
import { registerAuthorityRoutes } from "./routes/authority.js";
import { registerExecutionPlanRoutes } from "./routes/execution-plans.js";
import { registerControlledExecutionRoutes } from "./routes/controlled-execution.js";
import { registerActivityOutcomeRoutes } from "./routes/activity-outcomes.js";
import { registerServiceTaskRoutes } from "./routes/service-tasks.js";
import { registerReferenceAgentRoutes } from "./routes/reference-agents.js";
import { registerCommercialRoutes } from "./routes/commercial.js";
import { createReferenceAgentCatalog, type ReferenceAgentIdentityBinding, type ReferenceAgentSlug } from "@spotriq/reference-agents";

export interface BuildServerOptions {
  config?: ServerConfig;
  logger?: boolean;
  chain?: BscChainReader;
  pancakeSwap?: PancakeSwapReader;
  venus?: VenusReader;
  marketContext?: GridMarketContextReader;
  smartMoney?: SmartMoneyEngine;
  agentRegistry?: AgentRegistryReader;
  marketplaceSupply?: MarketplaceSupplyReader;
  jobIntents?: JobIntentEngine;
  authority?: AuthorityEngine;
  executionPlans?: ExecutionPlanEngine;
  executionBoundary?: ExecutionBoundaryEngine;
  controlledExecution?: ControlledExecutionEngine;
  activityOutcomes?: ActivityOutcomesEngine;
  serviceTasks?: ServiceTaskEngine;
  commercial?: CommercialEngine;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadServerConfig();
  const chain = options.chain ?? createBscChainAdapter({
    network: config.bscNetwork,
    primaryRpcUrl: config.bscRpcPrimary,
    secondaryRpcUrl: config.bscRpcSecondary,
    timeoutMs: config.bscRpcTimeoutMs,
  });
  const pancakeSwap = options.pancakeSwap ?? createPancakeSwapAdapter({ chain });
  const venus = options.venus ?? createVenusAdapter({ chain });
  const marketContext = options.marketContext ?? createGridMarketContextEngine({ chain, pancakeSwap });
  const database = getDatabasePool(config.databaseUrl);
  const sqlDatabase = database
    ? {
        query: async <Row = Record<string, unknown>>(text: string, values?: unknown[]) => {
          const result = await database.query(text, values);
          return {
            rows: result.rows as unknown as Row[],
            rowCount: result.rowCount,
          };
        },
      }
    : undefined;
  const registryMainnetChain = config.bscNetwork === "mainnet"
    ? chain
    : createBscChainAdapter({ network: "mainnet", primaryRpcUrl: config.agentRegistryMainnetRpc, timeoutMs: config.bscRpcTimeoutMs });
  const registryTestnetChain = config.bscNetwork === "testnet"
    ? chain
    : createBscChainAdapter({ network: "testnet", primaryRpcUrl: config.agentRegistryTestnetRpc, timeoutMs: config.bscRpcTimeoutMs });
  const agentRegistryStore = sqlDatabase
    ? new PostgresAgentRegistryStore(sqlDatabase)
    : new MemoryAgentRegistryStore();
  const agentRegistry = options.agentRegistry ?? createAgentRegistry({
    defaultChainId: config.agentDiscoveryChainId,
    apiBaseUrl: config.scan8004BaseUrl,
    apiKey: config.scan8004ApiKey,
    timeoutMs: config.scan8004TimeoutMs,
    chainReaders: { 56: registryMainnetChain, 97: registryTestnetChain },
    store: agentRegistryStore,
  });
  const marketplaceSupplyStore = sqlDatabase
    ? new PostgresMarketplaceSupplyStore(sqlDatabase)
    : new MemoryMarketplaceSupplyStore();

  const referenceIdentityBindings: Partial<Record<ReferenceAgentSlug, ReferenceAgentIdentityBinding>> = {};
  for (const slug of ["rangekeeper", "gridpilot", "yieldpilot", "venusguard"] as const) {
    const agentId = config.referenceAgentIds[slug];
    if (!agentId) continue;
    const verification = await agentRegistry.verifyIdentity(config.referenceAgentRegistryChainId, agentId);
    referenceIdentityBindings[slug] = {
      chainId: config.referenceAgentRegistryChainId,
      agentId,
      verification,
    };
  }

  const referenceServices = createReferenceAgentCatalog({
    publicBaseUrl: config.publicApiBaseUrl,
    chainId: config.agentDiscoveryChainId,
    identityBindings: referenceIdentityBindings,
  });
  const marketplaceSupply = options.marketplaceSupply ?? createMarketplaceSupply({
    registry: agentRegistry,
    defaultChainId: config.agentDiscoveryChainId,
    store: marketplaceSupplyStore,
    referenceServices,
    testLab: createMarketplaceTestLab({
      timeoutMs: config.marketplaceTestTimeoutMs,
      maxResponseBytes: config.marketplaceTestMaxResponseBytes,
      maxRedirects: config.marketplaceTestMaxRedirects,
    }),
  });
  const commercialStore = sqlDatabase
    ? new PostgresCommercialStore(sqlDatabase)
    : new MemoryCommercialStore();
  const commercial = options.commercial ?? createCommercialEngine({
    marketplace: marketplaceSupply,
    store: commercialStore,
    paymentAdapters: [createErc8183PaymentAdapter({ chain })],
  });

  const smartMoneyStore = sqlDatabase
    ? new PostgresSmartMoneyStore(sqlDatabase)
    : new MemorySmartMoneyStore();
  const smartMoney = options.smartMoney ?? createSmartMoneyEngine({ chain, pancakeSwap, venus, marketContext, store: smartMoneyStore });
  const jobIntentStore = sqlDatabase
    ? new PostgresJobIntentStore(sqlDatabase)
    : new MemoryJobIntentStore();
  const jobIntents = options.jobIntents ?? createJobIntentEngine(jobIntentStore);
  const serviceTaskStore = sqlDatabase
    ? new PostgresServiceTaskStore(sqlDatabase)
    : new MemoryServiceTaskStore();
  const serviceTasks = options.serviceTasks ?? createServiceTaskEngine({
    store: serviceTaskStore,
    marketplace: marketplaceSupply,
    http: {
      timeoutMs: config.serviceTaskTimeoutMs,
      maxResponseBytes: config.serviceTaskMaxResponseBytes,
      maxRedirects: config.serviceTaskMaxRedirects,
    },
  });
  const authorityStore = sqlDatabase
    ? new PostgresAuthorityStore(sqlDatabase)
    : new MemoryAuthorityStore();
  const authority = options.authority ?? createAuthorityEngine({
    store: authorityStore,
    verifier: createAltanaKeystoreVerifier({ mainnet: registryMainnetChain, testnet: registryTestnetChain }),
    chain,
  });
  const executionPlanStore = sqlDatabase
    ? new PostgresExecutionPlanStore(sqlDatabase)
    : new MemoryExecutionPlanStore();
  const executionPlans = options.executionPlans ?? createExecutionPlanEngine({ store: executionPlanStore, pancakeSwap });
  const executionBoundaryStore = sqlDatabase
    ? new PostgresExecutionBoundaryStore(sqlDatabase)
    : new MemoryExecutionBoundaryStore();
  const executionBoundary = options.executionBoundary ?? createExecutionBoundaryEngine({ store: executionBoundaryStore, plans: executionPlans, pancakeSwap });
  const controlledExecutionStore = sqlDatabase
    ? new PostgresControlledExecutionStore(sqlDatabase)
    : new MemoryControlledExecutionStore();
  const controlledExecution = options.controlledExecution ?? createControlledExecutionEngine({ store: controlledExecutionStore, boundaries: executionBoundary, plans: executionPlans, authority, chain, pancakeSwap });
  const activityOutcomesStore = sqlDatabase
    ? new PostgresActivityOutcomesStore(sqlDatabase)
    : new MemoryActivityOutcomesStore();
  const activityOutcomes = options.activityOutcomes ?? createActivityOutcomesEngine({ store: activityOutcomesStore, executions: controlledExecution, jobs: jobIntents, plans: executionPlans, boundaries: executionBoundary, authority, pancakeSwap });
  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: "x-request-id",
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.get("/health", async (_request, reply) => {
    const [database, bsc] = await Promise.all([
      getDatabaseHealth(config.databaseUrl),
      chain.getHealth(),
    ]);
    const dependencies = [database, bsc];
    const status = dependencies.some((dependency) => dependency.state === "unavailable") ? "degraded" : "ok";
    const body: HealthResponse = {
      service: "spotriq-api",
      version: "0.23.0",
      status,
      environment: config.appEnv,
      network: config.bscNetwork,
      checkedAt: new Date().toISOString(),
      dependencies,
    };
    return reply.code(status === "ok" ? 200 : 503).send(body);
  });

  app.get("/v1/meta", async (_request, reply) => {
    const data: MetaResponse = {
      brand: "Spotriq",
      descriptor: "BSC financial-agent marketplace",
      environment: config.appEnv,
      network: config.bscNetwork,
      apiVersion: "v1",
    };
    const body: ApiEnvelope<MetaResponse> = { data, meta: { generatedAt: new Date().toISOString() } };
    return reply.send(body);
  });

  app.get("/v1/system/capabilities", async (_request, reply) => {
    const data: CapabilityResponse = {
      persistenceConfigured: Boolean(config.databaseUrl),
      redisConfigured: Boolean(config.redisUrl),
      bscRpcConfigured: Boolean(config.bscRpcPrimary),
      liveMarketplaceData: true,
      chainAdapterEnabled: true,
      evidenceEngineEnabled: true,
      pancakeSwapAdapterEnabled: true,
      venusAdapterEnabled: true,
      yieldDataEnabled: true,
      gridMarketContextEnabled: true,
      smartMoneyCheckEnabled: true,
      agentRegistryEnabled: true,
      externalAgentDiscoveryEnabled: true,
      canonicalAgentIdentityVerificationEnabled: true,
      marketplaceServiceNormalizationEnabled: true,
      marketplaceReadinessEngineEnabled: true,
      marketplaceTestingEnabled: true,
      findingServiceCompatibilityEnabled: true,
      liveReferenceAgentSupplyEnabled: true,
      referenceAgentRuntimeEnabled: true,
      rebalancingJobIntentEnabled: true,
      boundedPermissionAuthorityEnabled: true,
      trustedAgentSessionKeyBindingEnabled: true,
      argumentLevelExecutionGuardEnabled: true,
      altanaTestnetProbeGrantEnabled: true,
      altanaKeystoreVerificationEnabled: true,
      rebalancingExecutionPlanEnabled: true,
      nonBypassableExecutionBoundaryEnabled: true,
      boundaryControlledAltanaFinancialSessionEnabled: true,
      financialAssetReadinessEnabled: true,
      liveFinancialSignerEnabled: true,
      boundedTokenApprovalFlowEnabled: true,
      controlledBscTestnetExecutionEnabled: true,
      executionActivityOutcomesEnabled: true,
      serviceTaskOriginProofEnabled: true,
      commercialOfferEnabled: true,
      commercialQuoteEnabled: true,
      commercialHireEnabled: true,
      commercialPaymentReconciliationEnabled: true,
      erc8183PaymentObservationEnabled: true,
      x402B402PaymentAdaptersEnabled: false,
      freeReadOnlyActivationEnabled: true,
      marketplaceActivationEnabled: true,
      smartMoneyPersistence: database ? "postgres" : "memory",
      notes: [
        config.bscRpcPrimary
          ? "BSC reads use configured RPC endpoints with failover."
          : "Development BSC reads use official public BSC RPC fallbacks; configure BSC_RPC_PRIMARY for production-grade access.",
        "Canonical BSC blocks, transactions, native balances, and requested ERC-20 balances now return evidence envelopes.",
        "PancakeSwap V3 and Infinity CL current-state reads normalize concentrated-liquidity positions with evidence-backed range state.",
        database ? "Smart Money Check sessions, portfolio snapshots, evidence, findings, and events persist in PostgreSQL." : "Smart Money Check uses in-memory persistence until DATABASE_URL is configured; configure Railway PostgreSQL for durable sessions.",
        "Smart Money Check generates deterministic Rebalancing findings from supported PancakeSwap positions, Health findings from Venus lending state, and Yield findings from wallet-relevant Venus supply markets.",
        "Yield current rates are base Venus supply APY derived from onchain supplyRatePerBlock; incentives, estimated net yield, and realised performance remain separate and are not fabricated.",
        "Venus protocol shortfall is canonical for current liquidation eligibility; Spotriq health factor is a derived explanation and incomplete inputs never become Healthy.",
        "Grid market context now uses supported PancakeSwap V3 onchain 1h/6h/24h oracle averages. TWAP dispersion is not realised volatility and the regime is not a profit forecast.",
        "ERC-8004 identities can be discovered through 8004scan and individual identities can be canonically verified onchain. Identity remains distinct from listing and service.",
        "Financial-category identity hints are now normalized into Spotriq AgentListing and AgentService candidates with explicit Offer, PermissionProfile, runtime-endpoint, and deterministic Readiness resources.",
        "Marketplace Test Lab performs bounded A2A/MCP endpoint-policy, reachability, protocol-contract, and category-capability checks without invoking financial actions.",
        "Smart Money Findings now support deterministic AgentService compatibility ranking using explicit category/protocol/context rules plus evidence quality and operational readiness; no opaque trust or profitability score is produced.",
        "v0.22 ships four genuine first-party, read-only A2A reference services—RangeKeeper, GridPilot, YieldPilot and VenusGuard—through the same marketplace supply/readiness pipeline. Public HTTPS Test Lab evidence and ERC-8004 registration remain independent gates and are never fabricated.",
        "A selected compatible Rebalancing service can become an idempotent, reviewable PREPARE_ONLY Job Intent carrying exact LP contract/token context and user bounds.",
        "v0.16 can verify service-owned Altana-compatible session-key control through a Spotriq A2A extension and fresh runtime challenge; browser-entered keys never satisfy the binding.",
        "A deterministic V3 calldata guard decodes proposed calls and checks target, LP token ID, recipients, token caps, slippage/deadline bounds, fee tier, and tick alignment against reviewed evidence.",
        "v0.17 builds a user-reviewed three-step decrease → collect → mint execution plan from a fresh V3 position plus independent owner-context eth_call simulation, and seals exact call hashes/order behind a non-bypassable execution boundary.",
        "The external AgentService is an authenticated proposer only. v0.18 can provision a distinct boundary-controlled Altana BSC Testnet financial session whose exact scope and Keystore validity are independently reconciled; the financial signer is never handed to the external service.",
        "A real BSC Testnet Altana passkey/grant/revoke probe remains available for read-only provider testing, and v0.18 adds a separate real financial session bound to the sealed execution boundary. That read-only probe itself remains non-financial; v0.19 added a separate, tightly gated controlled BSC Testnet transaction path.",
        "v0.18 reads current token balances and ERC-20 allowances to the exact V3 Position Manager, distinguishes current balance from projected post-collect balance, and never auto-creates unlimited approvals.",
        "v0.19 can prepare explicitly reviewed exact ERC-20 allowance calls through the wallet-admin/passkey path and independently re-read allowances after the action; the external AgentService and financial session never receive approve authority.",
        "v0.19 can prepare a short-lived one-shot controlled BSC Testnet dispatch only after fresh Altana Keystore verification, financial readiness, LP/quote preflight, and exact call-hash/order authorization. Confirmed receipt evidence consumes the sealed boundary to prevent replay.",
        "v0.20 persists execution-scoped Activity & Outcomes evidence from the confirmed controlled dispatch: lifecycle events, BSC receipt/gas evidence, replacement LP state, boundary consumption, Job Intent completion and current Altana revocation state. It does not fabricate PnL, fees earned or marketplace agent activation.",
        "v0.21 invokes a selected, tested AgentService through its supported A2A task/message interface, binds the exact server-derived Job Intent context to the request, requires a fresh service-owned key proof, persists the remote task/message and structured proposal, and blocks Job confirmation until proposal origin is verified. Invocation remains distinct from hiring, payment and activation.",
        "v0.23 adds explicit Offer → immutable Quote → idempotent Hire → Payment/Funding Evidence → Marketplace Activation resources. The four accepted first-party services publish FREE / READ_ONLY_SERVICE offers that can be commercially activated without fabricating payment or permission.",
        "Marketplace activation in v0.23 means an ACTIVE read-only Spotriq service relationship. It does not grant wallet signing, financial execution, autonomous transaction, or fund-movement authority; existing financial readiness/permission/execution gates remain independent.",
        "Paid rails are provider-neutral adapters. ERC-8183 is observed from BSC job/funding state; X402/B402 are represented in the domain but no live adapter is enabled yet, so Spotriq cannot falsely mark those payments verified.",
        "Permission scope is selector-scoped to the PancakeSwap V3 Position Manager with explicit token spend caps and expiry; approve, router swap, withdrawal, arbitrary target, and multicall authority are not granted by the live flow.",
        "Registry-derived services remain non-activatable until canonical identity, tested runtime reachability, explicit authority requirements, marketplace tests, and a later real testnet activation path satisfy all gates.",
      ],
    };
    const body: ApiEnvelope<CapabilityResponse> = { data, meta: { generatedAt: new Date().toISOString() } };
    return reply.send(body);
  });

  await registerChainRoutes(app, chain);
  await registerEvidenceRoutes(app);
  await registerPancakeSwapRoutes(app, pancakeSwap);
  await registerVenusRoutes(app, venus);
  await registerMarketContextRoutes(app, marketContext);
  await registerCheckRoutes(app, smartMoney, marketplaceSupply);
  await registerAgentRoutes(app, agentRegistry, config.agentDiscoveryChainId);
  await registerMarketplaceRoutes(app, marketplaceSupply, config.agentDiscoveryChainId);
  await registerCommercialRoutes(app, commercial);
  await registerReferenceAgentRoutes(app, { publicBaseUrl: config.publicApiBaseUrl, pancakeSwap, venus, marketContext, identityBindings: referenceIdentityBindings });
  await registerJobIntentRoutes(app, smartMoney, marketplaceSupply, jobIntents);
  await registerServiceTaskRoutes(app, serviceTasks, jobIntents, commercial);
  await registerAuthorityRoutes(app, authority, jobIntents, marketplaceSupply);
  await registerExecutionPlanRoutes(app, executionPlans, executionBoundary, authority, jobIntents);
  await registerControlledExecutionRoutes(app, controlledExecution, jobIntents, activityOutcomes);
  await registerActivityOutcomeRoutes(app, activityOutcomes);

  app.setNotFoundHandler(async (request, reply) => {
    const body: ApiErrorBody = {
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `No Spotriq API route matches ${request.method} ${request.url}.`,
        recoverable: true,
        retryable: false,
        correlationId: request.id,
      },
    };
    return reply.code(404).send(body);
  });

  app.setErrorHandler(async (error, request, reply) => {
    if (error instanceof ApiInputError) {
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          recoverable: true,
          retryable: false,
          correlationId: request.id,
          details: error.details,
        },
      };
      return reply.code(400).send(body);
    }

    if (error instanceof AgentRegistryError) {
      const statusCode = error.code === "INVALID_INPUT" || error.code === "UNSUPPORTED_CHAIN"
        ? 400
        : error.code === "AGENT_NOT_FOUND"
          ? 404
          : 502;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }


    if (error instanceof AuthorityError) {
      const statusCode = error.code === "PERMISSION_REQUEST_NOT_FOUND" || error.code === "PERMISSION_GRANT_NOT_FOUND" ? 404
        : error.code === "ONCHAIN_VERIFICATION_FAILED" ? 502
          : error.code === "INVALID_STATE" || error.code === "UNSUPPORTED_JOB" ? 422
            : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof JobIntentError) {
      const statusCode = error.code === "JOB_INTENT_NOT_FOUND" ? 404 : error.code === "MATCH_REQUIRED" || error.code === "UNSUPPORTED_FINDING" || error.code === "INVALID_STATE" ? 422 : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof CommercialError) {
      const statusCode = error.code === "OFFER_NOT_FOUND" || error.code === "QUOTE_NOT_FOUND" || error.code === "HIRE_NOT_FOUND" || error.code === "ACTIVATION_NOT_FOUND" ? 404
        : error.code === "IDEMPOTENCY_CONFLICT" || error.code === "OFFER_STALE" ? 409
          : error.code === "ONCHAIN_OBSERVATION_FAILED" ? 502
            : error.code === "QUOTE_EXPIRED" || error.code === "NETWORK_MISMATCH" || error.code === "PAYMENT_REQUIRED" || error.code === "PAYMENT_MISMATCH" || error.code === "PAYMENT_ADAPTER_UNAVAILABLE" || error.code === "PERMISSION_REQUIRED" || error.code === "SERVICE_NOT_READY" || error.code === "WRONG_BUYER" || error.code === "WRONG_SERVICE" ? 422
              : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof ServiceTaskError) {
      const statusCode = error.code === "TASK_NOT_FOUND" ? 404
        : error.code === "REMOTE_ERROR" ? 502
          : error.code === "AUTH_REQUIRED" || error.code === "SERVICE_NOT_READY" || error.code === "UNSUPPORTED_INTERFACE" || error.code === "ORIGIN_PROOF_FAILED" || error.code === "INVALID_STATE" ? 422
            : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof ExecutionPlanError) {
      const statusCode = error.code === "PLAN_NOT_FOUND" ? 404 : error.code === "QUOTE_FAILED" ? 502 : error.code === "STALE_CONTEXT" || error.code === "INVALID_STATE" ? 422 : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }
    if (error instanceof ExecutionBoundaryError) {
      const statusCode = error.code === "BOUNDARY_NOT_FOUND" ? 404 : error.code === "STALE_CONTEXT" || error.code === "INVALID_STATE" ? 422 : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof ActivityOutcomesError) {
      const statusCode = error.code === "EXECUTION_NOT_FOUND" ? 404 : error.code === "EXECUTION_NOT_CONFIRMED" || error.code === "OUTCOME_UNAVAILABLE" ? 422 : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: false, correlationId: request.id } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof ControlledExecutionError) {
      const statusCode = error.code === "EXECUTION_NOT_FOUND" || error.code === "APPROVAL_PLAN_NOT_FOUND" ? 404
        : error.code === "CHAIN_EVIDENCE_UNAVAILABLE" ? 502
          : error.code === "INVALID_STATE" || error.code === "APPROVAL_REQUIRED" || error.code === "INSUFFICIENT_BALANCE" || error.code === "SESSION_INVALID" || error.code === "STALE_CONTEXT" ? 422
            : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof MarketplaceSupplyError) {
      const statusCode = error.code === "INVALID_INPUT" ? 400 : error.code === "SERVICE_NOT_FOUND" ? 404 : 422;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof GridMarketContextError) {
      const body: ApiErrorBody = { error: { code: "GRID_MARKET_CONTEXT_ERROR", message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id } };
      return reply.code(502).send(body);
    }

    if (error instanceof PancakeSwapAdapterError) {
      const statusCode = error.code === "INVALID_TOKEN_ID"
        ? 400
        : error.code === "POSITION_NOT_FOUND" || error.code === "POOL_NOT_FOUND"
          ? 404
          : error.code === "POOL_MANAGER_MISMATCH"
            ? 422
            : 502;
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          recoverable: true,
          retryable: error.retryable,
          correlationId: request.id,
          details: config.appEnv === "production" ? undefined : error.details,
        },
      };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof VenusAdapterError) {
      const statusCode = error.code === "BOOTSTRAP_FAILED" || error.code === "POOL_DISCOVERY_FAILED" || error.code === "CONTRACT_READ_FAILED" ? 502 : 422;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof BscChainError) {
      const statusCode = error.code === "INVALID_ADDRESS" || error.code === "INVALID_HASH"
        ? 400
        : error.code === "RPC_UNAVAILABLE"
          ? 503
          : 502;
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          recoverable: true,
          retryable: error.retryable,
          correlationId: request.id,
          details: config.appEnv === "production" ? undefined : error.details,
        },
      };
      return reply.code(statusCode).send(body);
    }

    const frameworkStatusCode = typeof (error as { statusCode?: unknown }).statusCode === "number"
      ? (error as { statusCode: number }).statusCode
      : undefined;
    if (frameworkStatusCode && frameworkStatusCode >= 400 && frameworkStatusCode < 500) {
      const frameworkCode = typeof (error as { code?: unknown }).code === "string" ? String((error as { code: string }).code) : "REQUEST_REJECTED";
      const body: ApiErrorBody = { error: { code: frameworkCode, message: error instanceof Error ? error.message : "The request was rejected.", recoverable: true, retryable: false, correlationId: request.id } };
      return reply.code(frameworkStatusCode).send(body);
    }

    request.log.error({ err: error }, "request failed");
    const body: ApiErrorBody = {
      error: {
        code: "INTERNAL_ERROR",
        message: config.appEnv === "production" ? "The request could not be completed." : error instanceof Error ? error.message : String(error),
        recoverable: true,
        retryable: false,
        correlationId: request.id,
      },
    };
    return reply.code(500).send(body);
  });

  return app;
}
