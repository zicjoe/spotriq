import { randomUUID } from "node:crypto";
import type {
  AgentCapabilityClaim,
  AgentCategoryHint,
  AgentListing,
  AgentRegistryChainId,
  AgentService,
  DiscoveredAgent,
  EvidenceEnvelope,
  MarketplaceServiceRecord,
  PermissionProfile,
  ReadinessCheck,
  ReadinessSnapshot,
  ServiceCategory,
  ServiceOffer,
  ServiceRuntimeEndpoint,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { VenusReader } from "@spotriq/protocol-venus";
import type { GridMarketContextReader } from "@spotriq/market-context";

export const REFERENCE_AGENT_CATALOG_METHOD = "marketplace.reference-agent-catalog@1.0.0";
export const REFERENCE_AGENT_RUNTIME_METHOD = "marketplace.reference-agent-runtime@1.0.0";
export const REFERENCE_AGENT_PROTOCOL_VERSION = "1.0.0";

export type ReferenceAgentSlug = "rangekeeper" | "gridpilot" | "yieldpilot" | "venusguard";

export interface ReferenceAgentDefinition {
  slug: ReferenceAgentSlug;
  name: string;
  category: ServiceCategory;
  description: string;
  protocols: string[];
  skillId: string;
  skillName: string;
  skillDescription: string;
  skillTags: string[];
  action: string;
  actionDescription: string;
}

export const REFERENCE_AGENT_DEFINITIONS: readonly ReferenceAgentDefinition[] = [
  {
    slug: "rangekeeper",
    name: "RangeKeeper",
    category: "rebalancing",
    description: "First-party Spotriq reference service for deterministic PancakeSwap concentrated-liquidity position analysis and bounded rebalancing preparation.",
    protocols: ["PancakeSwap"],
    skillId: "pancakeswap-range-management",
    skillName: "PancakeSwap concentrated liquidity rebalancing",
    skillDescription: "Inspect a supported PancakeSwap V3 liquidity position and return current range state. Preparation is read-only unless a later Spotriq authority/execution flow is explicitly used.",
    skillTags: ["rebalancing", "concentrated liquidity", "liquidity position", "lp range", "range management", "PancakeSwap", "BSC"],
    action: "analyze_position",
    actionDescription: "Read and normalize one PancakeSwap V3 position by tokenId.",
  },
  {
    slug: "gridpilot",
    name: "GridPilot",
    category: "grid",
    description: "First-party Spotriq reference service for deterministic PancakeSwap V3 grid-trading market context without profit prediction or autonomous trading authority.",
    protocols: ["PancakeSwap"],
    skillId: "pancakeswap-grid-context",
    skillName: "PancakeSwap grid trading market context",
    skillDescription: "Inspect a supported PancakeSwap V3 pool and return current/TWAP context, regime classification, and explicit limitations for grid strategy review.",
    skillTags: ["grid trading", "price grid", "order ladder", "re-grid", "market context", "PancakeSwap", "BSC"],
    action: "analyze_market",
    actionDescription: "Read deterministic grid market context for a PancakeSwap V3 pool.",
  },
  {
    slug: "yieldpilot",
    name: "YieldPilot",
    category: "yield",
    description: "First-party Spotriq reference service for deterministic Venus supply-yield opportunity discovery using current protocol state rather than projected profit.",
    protocols: ["Venus"],
    skillId: "venus-yield-opportunities",
    skillName: "Venus yield optimisation opportunity scan",
    skillDescription: "Inspect wallet-relevant Venus supply markets and return current base supply APY observations with liquidity and methodology limitations.",
    skillTags: ["yield", "yield optimisation", "APY", "lending supply", "supply market", "Venus", "BSC"],
    action: "scan_opportunities",
    actionDescription: "Read current wallet-relevant Venus yield opportunities.",
  },
  {
    slug: "venusguard",
    name: "VenusGuard",
    category: "health",
    description: "First-party Spotriq reference service for deterministic Venus lending-risk and liquidation-state monitoring without hidden automatic authority.",
    protocols: ["Venus"],
    skillId: "venus-health-monitor",
    skillName: "Venus health factor and liquidation monitoring",
    skillDescription: "Inspect current Venus positions, account liquidity/shortfall, and Spotriq-derived explanatory health state with explicit incomplete-data handling.",
    skillTags: ["health factor", "liquidation", "collateral risk", "borrow risk", "lending risk", "risk monitor", "Venus", "BSC"],
    action: "inspect_health",
    actionDescription: "Read current Venus wallet lending positions and health evidence.",
  },
] as const;

export interface ReferenceAgentCatalogOptions {
  publicBaseUrl: string;
  chainId: AgentRegistryChainId;
  now?: () => Date;
}

function cleanBaseUrl(value: string): string {
  const parsed = new URL(value);
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

export function referenceAgentCardPath(slug: ReferenceAgentSlug): string {
  return `/v1/reference-agents/${slug}/.well-known/agent-card.json`;
}

export function referenceAgentRpcPath(slug: ReferenceAgentSlug): string {
  return `/v1/reference-agents/${slug}/a2a`;
}

export function referenceAgentCard(definition: ReferenceAgentDefinition, publicBaseUrl: string) {
  const base = cleanBaseUrl(publicBaseUrl);
  return {
    name: definition.name,
    description: definition.description,
    protocolVersion: REFERENCE_AGENT_PROTOCOL_VERSION,
    url: `${base}${referenceAgentRpcPath(definition.slug)}`,
    preferredTransport: "JSONRPC",
    supportedInterfaces: [
      {
        url: `${base}${referenceAgentRpcPath(definition.slug)}`,
        protocolBinding: "JSONRPC",
        protocolVersion: REFERENCE_AGENT_PROTOCOL_VERSION,
      },
    ],
    capabilities: { streaming: false, pushNotifications: false },
    defaultInputModes: ["application/json", "text/plain"],
    defaultOutputModes: ["application/json", "text/plain"],
    skills: [
      {
        id: definition.skillId,
        name: definition.skillName,
        description: definition.skillDescription,
        tags: definition.skillTags,
        inputModes: ["application/json"],
        outputModes: ["application/json"],
      },
    ],
    metadata: {
      provider: "Spotriq Reference Agents",
      category: definition.category,
      safeMode: "READ_ONLY",
      methodVersion: REFERENCE_AGENT_RUNTIME_METHOD,
      erc8004Registration: "REQUIRED_AFTER_PUBLIC_DEPLOYMENT",
    },
  };
}

function referenceEvidence(definition: ReferenceAgentDefinition, observedAt: string, runtimeEndpoint: string): EvidenceEnvelope[] {
  return [
    createEvidenceEnvelope({
      subjectType: "agent_service",
      subjectId: `svc:reference:${definition.slug}`,
      metric: "service.reference_definition",
      value: definition.category,
      provenance: "marketplace-derived",
      source: DATA_SOURCES.SPOTRIQ_DERIVED,
      sourceRef: runtimeEndpoint,
      observedAt,
      confidence: "high",
      method: EVIDENCE_METHODS.REFERENCE_AGENT_CATALOG,
      methodInputs: [definition.slug, definition.action],
      limitation: "This proves that Spotriq ships the first-party service/runtime contract. It does not prove ERC-8004 registration, external availability, financial performance, or activation readiness.",
    }),
  ];
}

function referenceReadiness(input: {
  definition: ReferenceAgentDefinition;
  serviceId: string;
  chainId: AgentRegistryChainId;
  runtimeEndpoint: string;
  observedAt: string;
}): ReadinessSnapshot {
  const checks: ReadinessCheck[] = [
    {
      code: "BSC_NETWORK",
      label: "BSC network",
      state: input.chainId === 56 ? "PASS" : "WARN",
      requiredForActivation: true,
      detail: input.chainId === 56
        ? "The reference service is published into Spotriq's BSC Mainnet discovery catalog; its runtime actions remain read-only in this milestone."
        : "The reference service is currently associated with BSC Testnet discovery context.",
    },
    {
      code: "CANONICAL_IDENTITY",
      label: "Canonical ERC-8004 identity",
      state: "UNKNOWN",
      requiredForActivation: true,
      detail: "The first-party runtime is registration-ready, but no ERC-8004 agentId is bundled or fabricated. Register it after deployment and reconcile the resulting identity before activation.",
    },
    {
      code: "ACTIVE_METADATA",
      label: "Reference service active declaration",
      state: "PASS",
      requiredForActivation: true,
      detail: "Spotriq ships this first-party reference service as an active callable runtime.",
    },
    {
      code: "MACHINE_ENDPOINT",
      label: "Machine-callable endpoint declaration",
      state: "PASS",
      requiredForActivation: true,
      detail: `A2A discovery document is declared at ${input.runtimeEndpoint}; it publishes the machine-callable JSON-RPC interface.`,
    },
    {
      code: "RUNTIME_REACHABILITY",
      label: "Runtime reachability",
      state: "UNKNOWN",
      requiredForActivation: true,
      detail: "Deploy Spotriq behind a public HTTPS API URL and run Marketplace Test Lab to produce independent reachability evidence.",
    },
    {
      code: "PERMISSION_PROFILE",
      label: "Permission profile",
      state: "PASS",
      requiredForActivation: true,
      detail: "v0.22 reference services are explicitly read-only and receive no wallet signing or financial authority through this runtime.",
    },
    {
      code: "MARKETPLACE_TESTS",
      label: "Marketplace tests",
      state: "UNKNOWN",
      requiredForActivation: true,
      detail: "No public Marketplace Test Lab observation exists until the deployed endpoint is tested.",
    },
  ];
  return {
    readinessSnapshotId: `ready:${input.serviceId}`,
    serviceId: input.serviceId,
    state: input.chainId === 97 ? "TESTNET_ONLY" : "LIMITED",
    checkedAt: input.observedAt,
    reasons: checks.filter((check) => check.state !== "PASS").map((check) => check.detail),
    checks,
    activationEligible: false,
    limitations: [
      "A real first-party runtime is not the same as an ERC-8004 on-chain identity; Spotriq will not invent registration evidence.",
      "These v0.22 capabilities are read-only decision-support surfaces. Commercial hiring and financial activation remain separate later milestones.",
      "Marketplace Test Lab must observe the deployed HTTPS runtime before operational reachability can pass.",
    ],
    methodVersion: REFERENCE_AGENT_CATALOG_METHOD,
  };
}

function definitionRecord(definition: ReferenceAgentDefinition, options: ReferenceAgentCatalogOptions): MarketplaceServiceRecord {
  const observedAt = (options.now ?? (() => new Date()))().toISOString();
  const base = cleanBaseUrl(options.publicBaseUrl);
  const serviceId = `svc:reference:${definition.slug}`;
  const listingId = `listing:reference:${definition.slug}`;
  const agentId = `reference:${definition.slug}`;
  // The marketplace-advertised A2A endpoint is the discovery document itself.
  // This matches A2A/ERC-8004 discovery semantics and lets Test Lab fetch the
  // card directly; the card then points at the JSON-RPC interaction URL.
  const runtimeEndpoint = `${base}${referenceAgentCardPath(definition.slug)}`;
  const rpcEndpoint = `${base}${referenceAgentRpcPath(definition.slug)}`;
  const cardEndpoint = runtimeEndpoint;
  const hint: AgentCategoryHint = {
    category: definition.category,
    confidence: "high",
    basis: [definition.skillName, definition.skillDescription, ...definition.skillTags],
    provenance: "operator-claimed",
    note: "First-party capability declaration from the versioned Spotriq reference-agent catalog; Marketplace Test Lab remains an independent runtime gate.",
  };
  const identity: DiscoveredAgent = {
    discoveryId: agentId,
    sourceKind: "MARKETPLACE_REFERENCE",
    identity: {
      namespace: "marketplace",
      chainId: options.chainId,
      agentId: definition.slug,
      identifier: `marketplace:spotriq:reference:${definition.slug}`,
    },
    name: definition.name,
    description: definition.description,
    supportedProtocols: [...definition.protocols],
    categoryHints: [hint],
    active: true,
    x402Support: false,
    supportedTrust: ["spotriq-first-party-runtime"],
    registrationServices: [{ name: "A2A", endpoint: runtimeEndpoint, version: REFERENCE_AGENT_PROTOCOL_VERSION, skills: [definition.skillName], domains: definition.protocols }],
    externalReputation: { source: "none", totalFeedbacks: 0, note: "First-party reference service; external reputation is not fabricated." },
    evidence: referenceEvidence(definition, observedAt, runtimeEndpoint),
    listingState: "DISCOVERED",
    marketplaceServiceState: "NOT_CREATED",
    limitations: [
      "This identity is a Spotriq first-party reference identity, not an ERC-8004 identity until an operator performs on-chain registration after public deployment.",
      "External feedback is intentionally absent rather than synthesized.",
    ],
  };
  const listing: AgentListing = {
    listingId,
    agentId,
    slug: definition.slug,
    name: definition.name,
    shortDescription: definition.description,
    categoryTags: [definition.category],
    status: "TESTING",
  };
  const runtimeEndpoints: ServiceRuntimeEndpoint[] = [{
    name: "A2A",
    endpoint: runtimeEndpoint,
    version: REFERENCE_AGENT_PROTOCOL_VERSION,
    interactionKind: "A2A",
    machineCallable: true,
    provenance: "operator-claimed",
  }];
  const permissionProfile: PermissionProfile = {
    permissionProfileId: `perm-profile:${serviceId}`,
    serviceId,
    protocols: [...definition.protocols],
    assets: [],
    executionMode: "READ_ONLY",
    declarationState: "DECLARED",
    intensity: "read-only",
    provenance: "marketplace-derived",
  };
  const offer: ServiceOffer = {
    offerId: `offer:${serviceId}`,
    serviceId,
    state: "UNDECLARED",
    source: "operator-claimed",
    note: "v0.22 establishes real callable supply, not commercial hiring. No price is inferred or fabricated.",
  };
  const readiness = referenceReadiness({ definition, serviceId, chainId: options.chainId, runtimeEndpoint, observedAt });
  const claim: AgentCapabilityClaim = {
    capabilityClaimId: `claim:${serviceId}:${definition.category}`,
    serviceId,
    category: definition.category,
    claim: definition.skillDescription,
    confidence: "high",
    provenance: "operator-claimed",
    basis: [definition.skillId, definition.action, cardEndpoint, rpcEndpoint],
    note: "First-party capability declaration; independent Marketplace Test Lab evidence remains required for runtime readiness.",
  };
  const service: AgentService = {
    serviceId,
    agentId,
    listingId,
    name: definition.name,
    slug: definition.slug,
    category: definition.category,
    description: definition.description,
    readiness: readiness.state,
    readinessNote: readiness.reasons[0],
    permissionIntensity: "read-only",
    pricing: { model: "UNDECLARED", amount: "Not declared", protocolCostsNote: "No commercial offer exists in v0.22. Protocol/network read costs are not converted into an agent fee." },
    supportedProtocols: [...definition.protocols],
    supportedAssets: [],
    supportedPairs: [],
    automationMode: "Read-only deterministic analysis",
    evidenceSummary: { marketplaceObserved: "First-party runtime shipped; public Test Lab observation pending", operatorClaimed: claim.claim, testsPassed: 0 },
    operator: "Spotriq Reference Agents",
    erc8004Verified: false,
    origin: "REFERENCE",
    marketplaceActivationEligible: false,
    runtimeEndpoints,
    readinessSnapshotId: readiness.readinessSnapshotId,
  };
  return {
    identity,
    listing,
    service,
    permissionProfile,
    offer,
    readiness,
    capabilityClaims: [claim],
    evidence: [...identity.evidence],
    normalizedAt: observedAt,
    limitations: [
      "This is a genuine first-party callable reference service, not frontend sample inventory.",
      "ERC-8004 registration must be performed after a public endpoint exists; Spotriq does not fabricate an on-chain agentId.",
      "Commercial hiring/payment and financial activation remain disabled in v0.22.",
    ],
  };
}

export function createReferenceAgentCatalog(options: ReferenceAgentCatalogOptions): MarketplaceServiceRecord[] {
  return REFERENCE_AGENT_DEFINITIONS.map((definition) => definitionRecord(definition, options));
}

export interface ReferenceAgentRuntimeDependencies {
  pancakeSwap: PancakeSwapReader;
  venus: VenusReader;
  marketContext: GridMarketContextReader;
  now?: () => Date;
}

export interface ReferenceAgentRunInput {
  action?: string;
  input?: Record<string, unknown>;
}

function stringValue(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function findDefinition(slug: string): ReferenceAgentDefinition | undefined {
  return REFERENCE_AGENT_DEFINITIONS.find((candidate) => candidate.slug === slug);
}

export function getReferenceAgentDefinition(slug: string): ReferenceAgentDefinition | undefined {
  return findDefinition(slug);
}

function taskResult(definition: ReferenceAgentDefinition, action: string, output: unknown, now: Date) {
  const taskId = `ref-task:${definition.slug}:${randomUUID()}`;
  const messageId = `ref-msg:${randomUUID()}`;
  return {
    task: {
      id: taskId,
      status: { state: "TASK_STATE_COMPLETED", timestamp: now.toISOString(), message: { role: "ROLE_AGENT", messageId, parts: [{ text: `${definition.name} completed ${action} using deterministic Spotriq protocol readers.`, mediaType: "text/plain" }] } },
      artifacts: [{ artifactId: `artifact:${randomUUID()}`, name: `${definition.slug}-${action}`, parts: [{ data: output, mediaType: "application/json" }] }],
      metadata: { spotriq: { referenceAgent: definition.slug, category: definition.category, action, methodVersion: REFERENCE_AGENT_RUNTIME_METHOD, financialAuthorityUsed: false } },
    },
  };
}

function messageParts(params: Record<string, unknown>): Record<string, unknown>[] {
  const message = params.message;
  if (!message || typeof message !== "object" || Array.isArray(message)) return [];
  const parts = (message as Record<string, unknown>).parts;
  return Array.isArray(parts) ? parts.filter((part): part is Record<string, unknown> => Boolean(part) && typeof part === "object" && !Array.isArray(part)) : [];
}

function dataPart(params: Record<string, unknown>): Record<string, unknown> | undefined {
  for (const part of messageParts(params)) {
    const data = part.data;
    if (data && typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  }
  return undefined;
}

async function runDefinition(definition: ReferenceAgentDefinition, input: Record<string, unknown>, deps: ReferenceAgentRuntimeDependencies): Promise<unknown> {
  switch (definition.slug) {
    case "rangekeeper": {
      const tokenId = stringValue(input, "tokenId");
      if (!tokenId) throw new Error("RangeKeeper requires input.tokenId for a PancakeSwap V3 position read.");
      const position = await deps.pancakeSwap.getV3Position(tokenId);
      return {
        capability: "rebalancing",
        action: definition.action,
        position,
        assessment: {
          rangeState: position.rangeState,
          currentTick: position.pool.currentTick,
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          note: "Current deterministic position state only. This is not a profit forecast or authority to rebalance.",
        },
      };
    }
    case "gridpilot": {
      const poolAddress = stringValue(input, "poolAddress");
      if (!poolAddress) throw new Error("GridPilot requires input.poolAddress for a PancakeSwap V3 market-context read.");
      const walletAddress = stringValue(input, "walletAddress");
      const context = await deps.marketContext.getPoolContext(poolAddress, walletAddress);
      return {
        capability: "grid",
        action: definition.action,
        context,
        assessment: { regime: context.regime, confidence: context.confidence, note: "TWAP-based market context is descriptive, not a profit forecast or instruction to trade." },
      };
    }
    case "yieldpilot": {
      const walletAddress = stringValue(input, "walletAddress");
      if (!walletAddress) throw new Error("YieldPilot requires input.walletAddress for Venus opportunity discovery.");
      const snapshot = await deps.venus.getYieldOpportunities(walletAddress);
      return {
        capability: "yield",
        action: definition.action,
        snapshot,
        assessment: { note: "Current protocol/base supply rates only. Incentives, gas-adjusted net yield, taxes and realised performance are not fabricated." },
      };
    }
    case "venusguard": {
      const walletAddress = stringValue(input, "walletAddress");
      if (!walletAddress) throw new Error("VenusGuard requires input.walletAddress for Venus health monitoring.");
      const snapshot = await deps.venus.getWalletPositions(walletAddress);
      return {
        capability: "health",
        action: definition.action,
        snapshot,
        assessment: { note: "Current protocol state with explicit partial-data semantics. No automatic protective transaction is authorized by this read." },
      };
    }
  }
}

export async function runReferenceAgent(slug: string, request: ReferenceAgentRunInput, deps: ReferenceAgentRuntimeDependencies): Promise<unknown> {
  const definition = findDefinition(slug);
  if (!definition) throw new Error(`Unknown Spotriq reference agent: ${slug}`);
  const action = request.action?.trim() || definition.action;
  if (action !== definition.action) throw new Error(`${definition.name} does not support action ${action}. Supported action: ${definition.action}.`);
  return runDefinition(definition, request.input ?? {}, deps);
}

export async function handleReferenceAgentJsonRpc(slug: string, body: unknown, deps: ReferenceAgentRuntimeDependencies): Promise<Record<string, unknown>> {
  const definition = findDefinition(slug);
  if (!definition) throw new Error(`Unknown Spotriq reference agent: ${slug}`);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("A2A request must be a JSON object.");
  const envelope = body as Record<string, unknown>;
  const id = envelope.id ?? null;
  if (envelope.jsonrpc !== "2.0") return { jsonrpc: "2.0", id, error: { code: -32600, message: "Invalid JSON-RPC request." } };
  const method = typeof envelope.method === "string" ? envelope.method : "";
  const params = envelope.params && typeof envelope.params === "object" && !Array.isArray(envelope.params) ? envelope.params as Record<string, unknown> : {};
  try {
    if (method === "spotriq.run") {
      const action = typeof params.action === "string" ? params.action : definition.action;
      const input = params.input && typeof params.input === "object" && !Array.isArray(params.input) ? params.input as Record<string, unknown> : {};
      const output = await runReferenceAgent(slug, { action, input }, deps);
      return { jsonrpc: "2.0", id, result: taskResult(definition, action, output, (deps.now ?? (() => new Date()))()) };
    }
    if (method === "SendMessage" || method === "message/send") {
      const payload = dataPart(params) ?? {};
      const input: Record<string, unknown> = {};
      if (definition.slug === "rangekeeper") {
        const subject = payload.subject && typeof payload.subject === "object" && !Array.isArray(payload.subject) ? payload.subject as Record<string, unknown> : {};
        if (subject.tokenId !== undefined) input.tokenId = String(subject.tokenId);
      }
      const directInput = payload.input && typeof payload.input === "object" && !Array.isArray(payload.input) ? payload.input as Record<string, unknown> : undefined;
      Object.assign(input, directInput ?? {});
      const output = await runDefinition(definition, input, deps);
      return { jsonrpc: "2.0", id, result: taskResult(definition, definition.action, output, (deps.now ?? (() => new Date()))()) };
    }
    if (method === "GetTask" || method === "tasks/get" || method === "CancelTask" || method === "tasks/cancel") {
      return { jsonrpc: "2.0", id, error: { code: -32004, message: "Reference tasks are synchronous in v0.22 and are not persisted by the A2A runtime." } };
    }
    return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method ${method || "<missing>"} is not supported.` } };
  } catch (error) {
    return { jsonrpc: "2.0", id, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } };
  }
}
