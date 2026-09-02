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
import { ActivityOutcomesError, createActivityOutcomesEngine, createActivationActivityOutcomesEngine, MemoryActivityOutcomesStore, PostgresActivityOutcomesStore, type ActivityOutcomesEngine, type ActivationActivityOutcomesEngine } from "@spotriq/activity-outcomes";
import { createServiceTaskEngine, MemoryServiceTaskStore, PostgresServiceTaskStore, ServiceTaskError, type ServiceTaskEngine } from "@spotriq/service-tasks";
import { CommercialError, createCommercialEngine, createErc8183PaymentAdapter, MemoryCommercialStore, PostgresCommercialStore, type CommercialEngine } from "@spotriq/commercial";
import { createB402PaymentAdapter, createX402PaymentAdapter, readPaymentRailsStatus } from "@spotriq/payment-rails";
import { createPermissionCheckoutEngine, MemoryPermissionCheckoutStore, PermissionCheckoutError, PostgresPermissionCheckoutStore, type PermissionCheckoutEngine } from "@spotriq/permission-checkout";
import { createFinancialExecutionAdapterEngine, FinancialExecutionAdapterError, MemoryFinancialExecutionAssessmentStore, PostgresFinancialExecutionAssessmentStore, type FinancialExecutionAdapterEngine } from "@spotriq/financial-execution-adapters";
import { createMyAgentsEngine, MemoryMyAgentsStore, MyAgentsError, PostgresMyAgentsStore, type MyAgentsEngine } from "@spotriq/my-agents";
import { createSmartMoneyPlanEngine, MemorySmartMoneyPlanStore, PostgresSmartMoneyPlanStore, SmartMoneyPlanError, type SmartMoneyPlanEngine } from "@spotriq/smart-money-plans";
import { createOperatorWorkspaceEngine, MemoryOperatorWorkspaceStore, OperatorWorkspaceError, PostgresOperatorWorkspaceStore, type OperatorWorkspaceEngine } from "@spotriq/operator-workspace";
import { AgentStudioError, createAgentStudioEngine, MemoryAgentStudioStore, PostgresAgentStudioStore, type AgentStudioEngine } from "@spotriq/agent-studio";
import { createGroundedExplanationEngine, GroundedExplanationError, MemoryGroundedExplanationStore, OpenAiResponsesExplanationProvider, PostgresGroundedExplanationStore, type GroundedExplanationEngine } from "@spotriq/grounded-explanations";
import { AgentAdvantageError, createAgentAdvantageEngine, MemoryAgentAdvantageStore, PostgresAgentAdvantageStore, type AgentAdvantageEngine } from "@spotriq/agent-advantage";
import { createOperationalHealthEngine, MemoryOperationalHealthStore, PostgresOperationalHealthStore, type OperationalHealthEngine } from "@spotriq/observability";
import { cacheControlFor, MemoryRateLimitStore, PostgresRateLimitStore, stableClientKey } from "@spotriq/production-hardening";
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
import { registerActivationActivityOutcomeRoutes } from "./routes/activation-activity-outcomes.js";
import { registerServiceTaskRoutes } from "./routes/service-tasks.js";
import { registerReferenceAgentRoutes } from "./routes/reference-agents.js";
import { registerCommercialRoutes } from "./routes/commercial.js";
import { registerPermissionCheckoutRoutes } from "./routes/permission-checkout.js";
import { registerFinancialExecutionAdapterRoutes } from "./routes/financial-execution-adapters.js";
import { registerMyAgentsRoutes } from "./routes/my-agents.js";
import { registerSmartMoneyPlanRoutes } from "./routes/smart-money-plans.js";
import { registerOperatorWorkspaceRoutes } from "./routes/operator-workspace.js";
import { registerPaymentRailRoutes } from "./routes/payment-rails.js";
import { registerAgentStudioRoutes } from "./routes/agent-studio.js";
import { registerGroundedExplanationRoutes } from "./routes/grounded-explanations.js";
import { registerAgentAdvantageRoutes } from "./routes/agent-advantage.js";
import { registerObservabilityRoutes } from "./routes/observability.js";
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
  activationActivityOutcomes?: ActivationActivityOutcomesEngine;
  serviceTasks?: ServiceTaskEngine;
  commercial?: CommercialEngine;
  permissionCheckout?: PermissionCheckoutEngine;
  financialExecutionAdapters?: FinancialExecutionAdapterEngine;
  myAgents?: MyAgentsEngine;
  smartMoneyPlans?: SmartMoneyPlanEngine;
  operatorWorkspace?: OperatorWorkspaceEngine;
  agentStudio?: AgentStudioEngine;
  groundedExplanations?: GroundedExplanationEngine;
  agentAdvantage?: AgentAdvantageEngine;
  observability?: OperationalHealthEngine;
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
  const dbPoolOptions = {
    max: config.databasePoolMax,
    idleTimeoutMs: config.databaseIdleTimeoutMs,
    connectionTimeoutMs: config.databaseConnectionTimeoutMs,
    statementTimeoutMs: config.databaseStatementTimeoutMs,
    applicationName: "spotriq-api",
  };
  const database = getDatabasePool(config.databaseUrl, dbPoolOptions);
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
  const operatorWorkspaceStore = sqlDatabase ? new PostgresOperatorWorkspaceStore(sqlDatabase) : new MemoryOperatorWorkspaceStore();
  const operatorWorkspace = options.operatorWorkspace ?? createOperatorWorkspaceEngine({ store: operatorWorkspaceStore, registry: agentRegistry, marketplace: marketplaceSupply });
  const agentStudioStore = sqlDatabase ? new PostgresAgentStudioStore(sqlDatabase) : new MemoryAgentStudioStore();
  const agentStudio = options.agentStudio ?? createAgentStudioEngine({ store: agentStudioStore, registry: agentRegistry, marketplace: marketplaceSupply, operatorWorkspace });
  const commercialStore = sqlDatabase
    ? new PostgresCommercialStore(sqlDatabase)
    : new MemoryCommercialStore();
  const commercial = options.commercial ?? createCommercialEngine({
    marketplace: marketplaceSupply,
    store: commercialStore,
    paymentAdapters: [createErc8183PaymentAdapter({ chain }), createX402PaymentAdapter({ chain }), createB402PaymentAdapter({ chain })],
    offerOverlay: (serviceId) => operatorWorkspace.resolvePublishedOffer(serviceId),
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
  const permissionCheckoutStore = sqlDatabase
    ? new PostgresPermissionCheckoutStore(sqlDatabase)
    : new MemoryPermissionCheckoutStore();
  const permissionCheckout = options.permissionCheckout ?? createPermissionCheckoutEngine({
    store: permissionCheckoutStore,
    commercial,
    marketplace: marketplaceSupply,
    jobs: jobIntents,
    authority,
  });
  const financialExecutionAssessmentStore = sqlDatabase
    ? new PostgresFinancialExecutionAssessmentStore(sqlDatabase)
    : new MemoryFinancialExecutionAssessmentStore();
  const financialExecutionAdapters = options.financialExecutionAdapters ?? createFinancialExecutionAdapterEngine({
    chain,
    pancakeSwap,
    venus,
    commercial,
    marketplace: marketplaceSupply,
    permissionCheckout,
    store: financialExecutionAssessmentStore,
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
  const activationActivityOutcomes = options.activationActivityOutcomes ?? createActivationActivityOutcomesEngine({ store: activityOutcomesStore, commercial, tasks: serviceTasks, permissionCheckout, executionAdapters: financialExecutionAdapters });
  const myAgentsStore = sqlDatabase ? new PostgresMyAgentsStore(sqlDatabase) : new MemoryMyAgentsStore();
  const myAgents = options.myAgents ?? createMyAgentsEngine({ store: myAgentsStore, commercial, marketplace: marketplaceSupply, permissionCheckout, activityOutcomes: activationActivityOutcomes });
  const smartMoneyPlanStore = sqlDatabase ? new PostgresSmartMoneyPlanStore(sqlDatabase) : new MemorySmartMoneyPlanStore();
  const smartMoneyPlans = options.smartMoneyPlans ?? createSmartMoneyPlanEngine({ store: smartMoneyPlanStore, smartMoney, marketplace: marketplaceSupply, myAgents });
  const groundedExplanationStore = sqlDatabase ? new PostgresGroundedExplanationStore(sqlDatabase) : new MemoryGroundedExplanationStore();
  const groundedExplanationProvider = config.openAiApiKey
    ? new OpenAiResponsesExplanationProvider(config.openAiApiKey, config.groundedExplanationModel, config.groundedExplanationTimeoutMs)
    : undefined;
  const groundedExplanations = options.groundedExplanations ?? createGroundedExplanationEngine({
    store: groundedExplanationStore,
    smartMoney,
    marketplace: marketplaceSupply,
    commercial,
    permissionCheckout,
    activationActivityOutcomes,
    smartMoneyPlans,
    provider: groundedExplanationProvider,
  });
  const agentAdvantageStore = sqlDatabase ? new PostgresAgentAdvantageStore(sqlDatabase) : new MemoryAgentAdvantageStore();
  const agentAdvantage = options.agentAdvantage ?? createAgentAdvantageEngine({ store: agentAdvantageStore, activityOutcomes: activationActivityOutcomes });
  const observabilityStore = sqlDatabase ? new PostgresOperationalHealthStore(sqlDatabase) : new MemoryOperationalHealthStore();
  const observability = options.observability ?? createOperationalHealthEngine({
    release: "0.37.0",
    chain,
    marketplace: marketplaceSupply,
    referenceServiceIds: referenceServices.map(record => record.service.serviceId),
    databaseHealth: () => getDatabaseHealth(config.databaseUrl, dbPoolOptions),
    paymentRailsStatus: () => readPaymentRailsStatus(chain),
    agentStudioStatus: () => agentStudio.getStatus(),
    localServiceIds: sqlDatabase ? async () => (await sqlDatabase.query<{service_id:string}>("select service_id from agent_services order by updated_at desc limit 100")).rows.map(row => row.service_id) : undefined,
    store: observabilityStore,
    testLabTargetAgeSeconds: config.observabilityTestLabTargetAgeSeconds,
    testLabStaleAfterSeconds: config.observabilityTestLabStaleAfterSeconds,
    workerStaleAfterSeconds: config.observabilityWorkerStaleAfterSeconds,
    workerUnavailableAfterSeconds: config.observabilityWorkerUnavailableAfterSeconds,
    jobExecutionMode: "API_INLINE",
  });
  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: "x-request-id",
    bodyLimit: config.apiBodyLimitBytes,
    requestTimeout: config.apiRequestTimeoutMs,
    connectionTimeout: config.apiConnectionTimeoutMs,
    trustProxy: config.trustProxyHops > 0 ? config.trustProxyHops : false,
  });
  const primaryRateLimitStore = sqlDatabase ? new PostgresRateLimitStore(sqlDatabase) : new MemoryRateLimitStore();
  const degradedRateLimitStore = new MemoryRateLimitStore();
  const readRateLimitPolicy = { windowMs: config.rateLimitWindowMs, maxRequests: config.rateLimitReadMax, keyPrefix: "read" };
  const writeRateLimitPolicy = { windowMs: config.rateLimitWindowMs, maxRequests: config.rateLimitWriteMax, keyPrefix: "write" };
  const requestStartedAt = new Map<string,number>();
  let rateLimitDegradedLoggedAt = 0;
  app.addHook("onRequest", async (request, reply) => {
    requestStartedAt.set(request.id, Date.now());
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    reply.header("Cache-Control", cacheControlFor(request.method, request.url));
    if (!config.rateLimitEnabled || request.method === "OPTIONS" || request.url.split("?")[0] === "/health") return;
    const write = !["GET","HEAD"].includes(request.method);
    const policy = write ? writeRateLimitPolicy : readRateLimitPolicy;
    const key = stableClientKey(request.ip);
    let result;
    try { result = await primaryRateLimitStore.consume(key, policy); } catch (error) {
      if (Date.now() - rateLimitDegradedLoggedAt >= 30_000) {
        rateLimitDegradedLoggedAt = Date.now();
        request.log.warn({ err:error }, "distributed rate limiter unavailable; using process-local degraded limiter");
      }
      result = await degradedRateLimitStore.consume(key, policy);
    }
    reply.header("X-RateLimit-Limit", String(result.limit));
    reply.header("X-RateLimit-Remaining", String(result.remaining));
    reply.header("X-RateLimit-Reset", result.resetAt);
    if (!result.allowed) {
      reply.header("Retry-After", String(Math.max(1, Math.ceil((Date.parse(result.resetAt)-Date.now())/1000))));
      return reply.code(429).send({error:{code:"RATE_LIMITED",message:"Too many requests. Retry after the current rate-limit window.",recoverable:true,retryable:true,correlationId:request.id}});
    }
  });
  app.addHook("onResponse", async (request, reply) => {
    const started = requestStartedAt.get(request.id);
    requestStartedAt.delete(request.id);
    observability.requestMetrics.observe(reply.statusCode, started === undefined ? 0 : Date.now() - started);
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.get("/health", async (_request, reply) => {
    const [database, bsc] = await Promise.all([
      getDatabaseHealth(config.databaseUrl, dbPoolOptions),
      chain.getHealth(),
    ]);
    const dependencies = [database, bsc];
    const status = dependencies.some((dependency) => dependency.state === "unavailable") ? "degraded" : "ok";
    const body: HealthResponse = {
      service: "spotriq-api",
      version: "0.37.0",
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
      x402B402PaymentAdaptersEnabled: true,
      freeReadOnlyActivationEnabled: true,
      marketplaceActivationEnabled: true,
      fourCategoryActivationTaskParityEnabled: true,
      activationControlRevocationEnabled: true,
      healthMonitoringSnapshotEnabled: true,
      permissionCheckoutEnabled: true,
      fourCategoryAuthorityScopeParityEnabled: true,
      scopedPermissionRequestEnabled: true,
      permissionGrantReconciliationBridgeEnabled: true,
      fourCategoryFinancialExecutionAdapterParityEnabled: true,
      categoryArgumentGuardEnabled: true,
      categoryExecutionDispatchEnabled: false,
      fourCategoryActivityOutcomeParityEnabled: true,
      activationOutcomeCouldNotAssessEnabled: true,
      myAgentsPortfolioEnabled: true,
      myAgentsSwitchingEnabled: true,
      liveMarketplaceProfileCompareTryEnabled: true,
      smartMoneyPlansEnabled: true,
      planCompatibilityConflictHandlingEnabled: true,
      operatorWorkspaceEnabled: true,
      operatorSignedSessionAuthEnabled: true,
      operatorCanonicalOwnerClaimEnabled: true,
      operatorSupplyLifecycleEnabled: true,
      operatorTestLabTriggerEnabled: true,
      paidCommercialRailsReconciliationEnabled: true,
      paymentSettlementDispatchEnabled: false,
      agentStudioIntegrationEnabled: true,
      agentStudioDeploymentReconciliationEnabled: true,
      agentStudioCliDispatchEnabled: false,
      groundedAiExplanationEnabled: true,
      groundedAiExternalProviderConfigured: Boolean(config.openAiApiKey),
      groundedAiStructuredOutputEnabled: true,
      groundedAiWebSearchEnabled: false,
      groundedAiDecisionAuthorityEnabled: false,
      agentAdvantageMeasurementEnabled: true,
      agentAdvantageReportHistoryEnabled: true,
      agentAdvantageFinancialInferenceEnabled: false,
      agentAdvantageTransactionSuccessImpliesAdvantage: false,
      operationalObservabilityEnabled: true,
      publicSystemHealthEnabled: true,
      adminDiagnosticsConfigured: Boolean(config.adminDiagnosticsToken),
      operationalHealthMarketplaceReadinessAuthority: false,
      operationalHealthFinancialReadinessAuthority: false,
      securityFailureHardeningEnabled: true,
      ssrfPinnedTransportEnabled: true,
      maliciousMetadataValidationEnabled: true,
      rpcResponseValidationEnabled: true,
      rpcDivergenceDetectionEnabled: true,
      paymentReplayRaceProtectionEnabled: true,
      activationIdempotencyClaimEnabled: true,
      runtimeFailureInjectionEndpointEnabled: false,
      productionHardeningEnabled: true,
      distributedRateLimitEnabled: config.rateLimitEnabled && Boolean(config.databaseUrl),
      degradedLocalRateLimitFallbackEnabled: config.rateLimitEnabled,
      boundedRequestBodyEnabled: true,
      requestTimeoutGuardEnabled: true,
      cachePolicyEnabled: true,
      durableWorkQueueEnabled: Boolean(config.databaseUrl),
      workerFinancialJobDispatchEnabled: false,
      migrationAdvisoryLockEnabled: true,
      migrationChecksumGuardEnabled: true,
      backupRecoveryRunbookEnabled: true,
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
        "v0.24 generalizes Activation-bound ServiceTask semantics across Rebalancing, Grid, Yield and Health without forcing non-Rebalancing categories through the Rebalancing JobIntent/execution model. Current category tasks are read-only observations only.",
        "Each active reference relationship exposes category-specific controls and can be revoked independently. Grid observations do not become trading P&L, Yield rates do not become realised yield, and Health snapshots do not become protective-write authority.",
        "v0.25 adds a dedicated Permission Checkout that snapshots category-specific authority, limits, cost/risk disclosures and blockers before creating an immutable ScopedPermissionRequest. Current read-only reference services remain blocked from write authority rather than being silently upgraded.",
        "v0.26 implements category-specific guarded execution adapters for Grid, Yield and Health while preserving the existing Rebalancing boundary stack. Exact protocol targets, argument limits and fresh-state checks are modeled, but current read-only services still cannot receive a financial signer or dispatch transactions.",
        "A category adapter does not create a PermissionGrant. Grid/Yield/Health provider reconciliation remains a separate future authority-provider bridge, and category dispatch remains disabled until a non-bypassable signer consumes an exact reconciled grant.",
        "v0.27 adds Activation-scoped Activity & Outcomes parity across Rebalancing, Grid, Yield and Health. Runtime observations, permission review, execution preflight/guard state and relationship revocation are reconciled into one deterministic timeline without converting technical success into financial success.",
        "When no independently reconciled transaction and defensible measurement window exist, financial outcome is explicitly Could Not Assess. Grid PnL/fills, realised yield and Health protective effects are never inferred from read-only runtime output or guarded calldata preparation.",
        "v0.28 replaces sample My Agents state with a buyer-scoped portfolio aggregated from real commercial Activation, Permission Checkout, runtime/activity and outcome resources. Same-category switching is persisted and idempotent, and relationship ending fails closed when an independently reconciled PermissionGrant would be stranded.",
        "Agent profile, comparison and Try surfaces use live marketplace/Test Lab resources rather than fabricated reviews, fills, PnL or example performance claims.",
        "v0.29 Smart Money Plans deterministically compose specific findings with compatible specialist services and explicitly surface asset, protocol, authority, readiness and network conflicts. Plans never share a signer, PermissionGrant or execution session.",
        "v0.30 adds a signed-wallet Operator Workspace. Operator writes require a one-time EIP-191 challenge, an expiring server session, and canonical ERC-8004 ownership matching the authenticated wallet. Operator declarations remain Operator Supplied evidence and cannot force Marketplace Test Lab evidence or readiness to READY.",
        "v0.31 paid rails remain provider-neutral: ERC-8183 observes BSC job/escrow state and x402/B402 reconcile canonical BSC ERC-20 settlement; Spotriq does not sign or dispatch payments.",
        "v0.32 normalizes BNB Agent Studio deployment declarations for canonically owned operator services, then reconciles A2A registration and Marketplace Test Lab evidence. Spotriq does not run the bag CLI, ingest Studio wallet secrets, override readiness, or dispatch payment/financial execution.",
        "v0.33 adds a grounded explanation layer. The optional OpenAI Responses provider receives only server-built deterministic fact packets, uses structured output without web/tools, and every claim must cite known fact IDs. Invalid provider output falls back to a deterministic cited summary; AI cannot mutate financial truth or decision resources.",
        "v0.34 adds persisted Agent Advantage reports with explicit Activation measurement windows. Service contribution, transaction evidence, financial outcome and Agent Advantage remain separate; transaction success never becomes financial advantage and missing evidence remains Could Not Assess.",
        "v0.35 adds operational observability for API/database, BSC RPC, persisted Marketplace Test Lab/runtime evidence, payment adapters, Agent Studio and worker heartbeat posture. Operational health is explicitly not marketplace readiness, trust, payment, permission, execution or financial-outcome authority; public health is redacted and admin diagnostics fail closed behind a server-side bearer token.",
        "v0.37 adds production-scale request budgets, bounded body/request timeouts, conservative cache headers, database pool tuning, migration serialization/checksum drift detection, targeted indexes and a durable lease/retry/dead-letter worker queue. Smart Money financial work remains API_INLINE until a separate queue cutover is explicitly accepted.",
        "v0.36 hardens hostile failure boundaries: Test Lab requests pin DNS-validated public addresses and revalidate redirects; provider payloads are bounded/validated; BSC RPC responses are schema/coherence checked with divergence detection; operator/Agent Studio metadata rejects unsafe URL/control-text tricks; payment replay races and Activation idempotency races fail closed. Failure injection remains test/verifier-only and no production chaos endpoint is exposed.",
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
  await registerCommercialRoutes(app, commercial, permissionCheckout);
  await registerPaymentRailRoutes(app, chain);
  await registerPermissionCheckoutRoutes(app, permissionCheckout);
  await registerFinancialExecutionAdapterRoutes(app, financialExecutionAdapters);
  await registerReferenceAgentRoutes(app, { publicBaseUrl: config.publicApiBaseUrl, pancakeSwap, venus, marketContext, identityBindings: referenceIdentityBindings });
  await registerJobIntentRoutes(app, smartMoney, marketplaceSupply, jobIntents);
  await registerServiceTaskRoutes(app, serviceTasks, jobIntents, commercial);
  await registerAuthorityRoutes(app, authority, jobIntents, marketplaceSupply);
  await registerExecutionPlanRoutes(app, executionPlans, executionBoundary, authority, jobIntents);
  await registerControlledExecutionRoutes(app, controlledExecution, jobIntents, activityOutcomes);
  await registerActivityOutcomeRoutes(app, activityOutcomes);
  await registerActivationActivityOutcomeRoutes(app, activationActivityOutcomes);
  await registerMyAgentsRoutes(app, myAgents);
  await registerSmartMoneyPlanRoutes(app, smartMoneyPlans);
  await registerOperatorWorkspaceRoutes(app, operatorWorkspace);
  await registerAgentStudioRoutes(app, agentStudio, operatorWorkspace);
  await registerGroundedExplanationRoutes(app, groundedExplanations);
  await registerAgentAdvantageRoutes(app, agentAdvantage);
  await registerObservabilityRoutes(app, observability, config.adminDiagnosticsToken);

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

    if (error instanceof GroundedExplanationError) {
      const statusCode = error.code === "SUBJECT_NOT_FOUND" ? 404
        : error.code === "WRONG_BUYER" || error.code === "CONTEXT_REQUIRED" ? 422
          : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: false, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof AgentAdvantageError) {
      const statusCode = error.code === "REPORT_NOT_FOUND" ? 404 : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: false, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof AgentStudioError) {
      const statusCode = error.code === "AUTH_REQUIRED" ? 401
        : error.code === "DEPLOYMENT_NOT_FOUND" ? 404
          : error.code === "CANONICAL_OWNER_REQUIRED" || error.code === "SERVICE_NOT_OWNED" || error.code === "NETWORK_MISMATCH" ? 422
            : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof OperatorWorkspaceError) {
      const statusCode = error.code === "AUTH_REQUIRED" || error.code === "SESSION_EXPIRED" || error.code === "SIGNATURE_INVALID" ? 401
        : error.code === "CHALLENGE_NOT_FOUND" || error.code === "CLAIM_NOT_FOUND" || error.code === "DECLARATION_NOT_FOUND" ? 404
          : error.code === "CHALLENGE_USED" || error.code === "CANONICAL_OWNER_REQUIRED" || error.code === "INVALID_LIFECYCLE" || error.code === "SERVICE_NOT_OWNED" ? 422
            : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof SmartMoneyPlanError) {
      const statusCode = error.code === "NOT_FOUND" ? 404 : error.code === "IDEMPOTENCY_CONFLICT" ? 409 : error.code === "WRONG_BUYER" ? 422 : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: false, correlationId: request.id } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof MyAgentsError) {
      const statusCode = error.code === "IDEMPOTENCY_CONFLICT" ? 409
        : error.code === "WRONG_BUYER" || error.code === "ACTIVATION_NOT_ACTIVE" || error.code === "SAME_SERVICE" || error.code === "CATEGORY_MISMATCH" || error.code === "NETWORK_MISMATCH" || error.code === "TARGET_NOT_ELIGIBLE" || error.code === "ACTIVE_PERMISSION_GRANT" ? 422
          : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof FinancialExecutionAdapterError) {
      const statusCode = error.code === "ADAPTER_NOT_FOUND" ? 404
        : error.code === "PROTOCOL_READ_FAILED" ? 502
          : error.code === "WRONG_BUYER" || error.code === "WRONG_CATEGORY" || error.code === "INVALID_STATE" || error.code === "TARGET_NOT_ALLOWED" || error.code === "LIMIT_EXCEEDED" ? 422
            : 400;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof PermissionCheckoutError) {
      const statusCode = error.code === "CHECKOUT_NOT_FOUND" || error.code === "REQUEST_NOT_FOUND" ? 404
        : error.code === "IDEMPOTENCY_CONFLICT" ? 409
          : error.code === "WRONG_BUYER" || error.code === "WRONG_SERVICE" || error.code === "INVALID_STATE" || error.code === "GRANT_MISMATCH" || error.code === "GRANT_NOT_ACTIVE" ? 422
            : 400;
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
