import type { AgentRegistryReader } from "@spotriq/agent-registry";
import type {
  AgentCapabilityClaim,
  AgentCategoryHint,
  AgentListing,
  AgentRegistryChainId,
  AgentService,
  DiscoveredAgent,
  EvidenceEnvelope,
  MarketplaceListingPage,
  MarketplaceListingRecord,
  MarketplaceFinancialDiscovery,
  FinancialSupplyDiscoveryMatch,
  FinancialSupplyLead,
  FinancialSupplySearchRun,
  MarketplaceServiceRecord,
  MarketplaceServiceTestCoverage,
  MarketplaceSupplyPage,
  MarketplaceSupplyStatus,
  PermissionProfile,
  ReadinessCheck,
  ReadinessSnapshot,
  ServiceCategory,
  ServiceOffer,
  ServiceRuntimeEndpoint,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";

export const MARKETPLACE_SERVICE_NORMALIZATION_METHOD = "marketplace.agent-service-normalization@1.0.0";
export const MARKETPLACE_SERVICE_READINESS_METHOD = "marketplace.service-readiness@1.0.0";
export const FINANCIAL_SUPPLY_DISCOVERY_METHOD = "marketplace.financial-supply-discovery@1.0.0";

export const FINANCIAL_DISCOVERY_QUERIES: Record<ServiceCategory, string> = {
  rebalancing: "PancakeSwap concentrated liquidity rebalancing LP range management",
  grid: "grid trading price grid limit order automated trading BNB",
  yield: "Venus yield optimisation lending supply APY BSC",
  health: "Venus health factor liquidation monitoring lending risk BSC",
};

const FINANCIAL_CATEGORIES: ServiceCategory[] = ["rebalancing", "grid", "yield", "health"];

export class MarketplaceSupplyError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_INPUT" | "SERVICE_NOT_FOUND" | "NORMALIZATION_FAILED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "MarketplaceSupplyError";
  }
}

export interface MarketplaceSupplyStore {
  saveListings(records: MarketplaceListingRecord[]): Promise<void>;
  saveServices(records: MarketplaceServiceRecord[]): Promise<void>;
  getService(serviceId: string): Promise<MarketplaceServiceRecord | undefined>;
}

export class MemoryMarketplaceSupplyStore implements MarketplaceSupplyStore {
  private readonly listings = new Map<string, MarketplaceListingRecord>();
  private readonly services = new Map<string, MarketplaceServiceRecord>();

  async saveListings(records: MarketplaceListingRecord[]): Promise<void> {
    for (const record of records) this.listings.set(record.listing.listingId, structuredClone(record));
  }
  async saveServices(records: MarketplaceServiceRecord[]): Promise<void> {
    for (const record of records) this.services.set(record.service.serviceId, structuredClone(record));
  }
  async getService(serviceId: string): Promise<MarketplaceServiceRecord | undefined> {
    const record = this.services.get(serviceId);
    return record ? structuredClone(record) : undefined;
  }
}

export interface QueryableDatabase {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export class PostgresMarketplaceSupplyStore implements MarketplaceSupplyStore {
  constructor(private readonly database: QueryableDatabase) {}

  async saveListings(records: MarketplaceListingRecord[]): Promise<void> {
    for (const record of records) {
      const listing = record.listing;
      await this.database.query(`
        insert into agent_listings (listing_id, agent_id, slug, name, short_description, status, category_tags, created_at, updated_at)
        values ($1,$2,$3,$4,$5,$6,$7::jsonb,now(),now())
        on conflict (listing_id) do update set
          slug = excluded.slug,
          name = excluded.name,
          short_description = excluded.short_description,
          status = excluded.status,
          category_tags = excluded.category_tags,
          updated_at = now()
      `, [listing.listingId, listing.agentId, listing.slug, listing.name, listing.shortDescription, listing.status, JSON.stringify(listing.categoryTags)]);
    }
  }

  async saveServices(records: MarketplaceServiceRecord[]): Promise<void> {
    for (const record of records) {
      const service = record.service;
      await this.database.query(`
        insert into agent_services (
          service_id, agent_id, listing_id, slug, name, category, description, readiness_state,
          permission_intensity, pricing, supported_protocols, supported_assets, supported_pairs,
          automation_mode, category_profile, source_kind, marketplace_activation_eligible,
          runtime_endpoints, normalized_at, created_at, updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,$13::jsonb,$14,$15::jsonb,
          'ERC8004',$16,$17::jsonb,$18,now(),now()
        )
        on conflict (service_id) do update set
          listing_id = excluded.listing_id,
          name = excluded.name,
          description = excluded.description,
          readiness_state = excluded.readiness_state,
          permission_intensity = excluded.permission_intensity,
          pricing = excluded.pricing,
          supported_protocols = excluded.supported_protocols,
          supported_assets = excluded.supported_assets,
          supported_pairs = excluded.supported_pairs,
          automation_mode = excluded.automation_mode,
          source_kind = excluded.source_kind,
          marketplace_activation_eligible = excluded.marketplace_activation_eligible,
          runtime_endpoints = excluded.runtime_endpoints,
          normalized_at = excluded.normalized_at,
          updated_at = now()
      `, [
        service.serviceId,
        service.agentId,
        record.listing.listingId,
        service.slug,
        service.name,
        service.category,
        service.description,
        service.readiness,
        service.permissionIntensity,
        JSON.stringify(service.pricing),
        JSON.stringify(service.supportedProtocols),
        JSON.stringify(service.supportedAssets ?? []),
        JSON.stringify(service.supportedPairs ?? []),
        service.automationMode,
        JSON.stringify(service.categoryMetrics ?? {}),
        Boolean(service.marketplaceActivationEligible),
        JSON.stringify(service.runtimeEndpoints ?? []),
        record.normalizedAt,
      ]);

      await this.database.query(`
        insert into service_offers (offer_id, service_id, state, pricing, source, note, observed_at)
        values ($1,$2,$3,$4::jsonb,$5,$6,$7)
        on conflict (offer_id) do update set state=excluded.state, pricing=excluded.pricing, source=excluded.source, note=excluded.note, observed_at=excluded.observed_at
      `, [record.offer.offerId, service.serviceId, record.offer.state, JSON.stringify(record.offer.pricing ?? null), record.offer.source, record.offer.note, record.normalizedAt]);

      await this.database.query(`
        insert into permission_profiles (permission_profile_id, service_id, declaration_state, execution_mode, intensity, protocols, assets, provenance, observed_at)
        values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9)
        on conflict (permission_profile_id) do update set declaration_state=excluded.declaration_state, execution_mode=excluded.execution_mode, intensity=excluded.intensity, protocols=excluded.protocols, assets=excluded.assets, provenance=excluded.provenance, observed_at=excluded.observed_at
      `, [
        record.permissionProfile.permissionProfileId,
        service.serviceId,
        record.permissionProfile.declarationState ?? "UNDECLARED",
        record.permissionProfile.executionMode,
        record.permissionProfile.intensity ?? "unknown",
        JSON.stringify(record.permissionProfile.protocols),
        JSON.stringify(record.permissionProfile.assets),
        record.permissionProfile.provenance ?? "operator-claimed",
        record.normalizedAt,
      ]);

      await this.database.query(`
        insert into service_readiness_snapshots (readiness_snapshot_id, service_id, state, activation_eligible, checks, reasons, limitations, method_version, checked_at)
        values ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8,$9)
        on conflict (readiness_snapshot_id) do update set state=excluded.state, activation_eligible=excluded.activation_eligible, checks=excluded.checks, reasons=excluded.reasons, limitations=excluded.limitations, checked_at=excluded.checked_at
      `, [
        record.readiness.readinessSnapshotId,
        service.serviceId,
        record.readiness.state,
        Boolean(record.readiness.activationEligible),
        JSON.stringify(record.readiness.checks ?? []),
        JSON.stringify(record.readiness.reasons),
        JSON.stringify(record.readiness.limitations ?? []),
        record.readiness.methodVersion ?? MARKETPLACE_SERVICE_READINESS_METHOD,
        record.readiness.checkedAt,
      ]);

      await this.database.query("delete from agent_capability_claims where service_id = $1", [service.serviceId]);
      for (const claim of record.capabilityClaims) {
        await this.database.query(`
          insert into agent_capability_claims (capability_claim_id, service_id, category, claim, confidence, provenance, basis, note, observed_at)
          values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9)
          on conflict (capability_claim_id) do update set claim=excluded.claim, confidence=excluded.confidence, basis=excluded.basis, note=excluded.note, observed_at=excluded.observed_at
        `, [claim.capabilityClaimId, service.serviceId, claim.category, claim.claim, claim.confidence, claim.provenance, JSON.stringify(claim.basis), claim.note, record.normalizedAt]);
      }
      await this.database.query(`
        insert into marketplace_service_cache (service_id, payload, normalized_at, updated_at)
        values ($1,$2::jsonb,$3,now())
        on conflict (service_id) do update set payload=excluded.payload, normalized_at=excluded.normalized_at, updated_at=now()
      `, [service.serviceId, JSON.stringify(record), record.normalizedAt]);
    }
  }

  async getService(serviceId: string): Promise<MarketplaceServiceRecord | undefined> {
    const result = await this.database.query("select payload from marketplace_service_cache where service_id = $1", [serviceId]);
    return result.rows[0]?.payload as MarketplaceServiceRecord | undefined;
  }
}

export interface MarketplaceSupplyReader {
  getStatus(): Promise<MarketplaceSupplyStatus>;
  listListings(input?: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string }): Promise<MarketplaceListingPage>;
  listServices(input?: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string; category?: ServiceCategory }): Promise<MarketplaceSupplyPage>;
  getService(serviceId: string): Promise<MarketplaceServiceRecord>;
  getReadiness(serviceId: string): Promise<ReadinessSnapshot>;
  getEvidence(serviceId: string): Promise<EvidenceEnvelope[]>;
  getTests(serviceId: string): Promise<MarketplaceServiceTestCoverage>;
}

export interface CreateMarketplaceSupplyOptions {
  registry: AgentRegistryReader;
  defaultChainId?: AgentRegistryChainId;
  store?: MarketplaceSupplyStore;
}

function slugPart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return slug || "agent";
}

function serviceIdFor(agent: DiscoveredAgent, category: ServiceCategory): string {
  return `svc:erc8004:${agent.identity.chainId}:${agent.identity.agentId}:${category}`;
}

function listingIdFor(agent: DiscoveredAgent): string {
  return `listing:erc8004:${agent.identity.chainId}:${agent.identity.agentId}`;
}

function parseServiceId(serviceId: string): { chainId: AgentRegistryChainId; agentId: string; category: ServiceCategory } {
  const match = /^svc:erc8004:(56|97):(\d+):(rebalancing|grid|yield|health)$/.exec(serviceId);
  if (!match) throw new MarketplaceSupplyError("serviceId is not a valid Spotriq ERC-8004 service identifier.", "INVALID_INPUT");
  return { chainId: Number(match[1]) as AgentRegistryChainId, agentId: match[2]!, category: match[3]! as ServiceCategory };
}

function normalizeRuntimeEndpoints(agent: DiscoveredAgent): ServiceRuntimeEndpoint[] {
  return agent.registrationServices.map((service) => {
    const normalizedName = service.name.trim().toUpperCase();
    const interactionKind: ServiceRuntimeEndpoint["interactionKind"] = normalizedName === "A2A"
      ? "A2A"
      : normalizedName === "MCP"
        ? "MCP"
        : normalizedName === "WEB"
          ? "WEB"
          : "OTHER";
    return {
      name: service.name,
      endpoint: service.endpoint,
      version: service.version,
      interactionKind,
      machineCallable: interactionKind === "A2A" || interactionKind === "MCP",
      provenance: "operator-claimed",
    };
  });
}

function normalizeProtocols(agent: DiscoveredAgent, hint: AgentCategoryHint): string[] {
  const explicit = [...new Set(agent.supportedProtocols.map((value) => value.trim()).filter(Boolean))];
  const text = [agent.name, agent.description, ...hint.basis, ...agent.registrationServices.flatMap((service) => [service.name, service.endpoint, ...(service.skills ?? []), ...(service.domains ?? [])])].join(" ").toLowerCase();
  if (text.includes("pancake") && !explicit.some((value) => /pancake/i.test(value))) explicit.push("PancakeSwap");
  if (text.includes("venus") && !explicit.some((value) => /venus/i.test(value))) explicit.push("Venus");
  return explicit;
}

function buildListing(agent: DiscoveredAgent): AgentListing {
  const verified = agent.canonicalVerification?.state === "VERIFIED";
  const mismatch = agent.canonicalVerification?.state === "MISMATCH";
  const hasFinancialHint = agent.categoryHints.length > 0;
  const machineEndpoint = normalizeRuntimeEndpoints(agent).some((endpoint) => endpoint.machineCallable);
  const status: AgentListing["status"] = mismatch || agent.active === false
    ? "SUSPENDED"
    : verified && hasFinancialHint && machineEndpoint
      ? "TESTING"
      : hasFinancialHint
        ? "SUBMITTED"
        : "DISCOVERED";
  return {
    listingId: listingIdFor(agent),
    agentId: agent.discoveryId,
    slug: `${slugPart(agent.name)}-${agent.identity.chainId}-${agent.identity.agentId}`,
    name: agent.name,
    shortDescription: agent.description,
    categoryTags: agent.categoryHints.map((hint) => hint.category),
    status,
  };
}

function capabilityClaim(serviceId: string, hint: AgentCategoryHint, protocols: string[]): AgentCapabilityClaim {
  const protocolText = protocols.length ? ` Protocol mentions: ${protocols.join(", ")}.` : "";
  return {
    capabilityClaimId: `claim:${serviceId}:${hint.category}`,
    serviceId,
    category: hint.category,
    claim: `Registry metadata suggests ${hint.category} capability.${protocolText}`,
    confidence: hint.confidence,
    provenance: "operator-claimed",
    basis: hint.basis,
    note: "This is normalized from agent/operator self-description. It is not a Spotriq-tested capability or performance claim.",
  };
}

function permissionProfileFor(serviceId: string, protocols: string[]): PermissionProfile {
  return {
    permissionProfileId: `perm-profile:${serviceId}`,
    serviceId,
    protocols,
    assets: [],
    executionMode: "UNDECLARED",
    declarationState: "UNDECLARED",
    intensity: "unknown",
    provenance: "operator-claimed",
  };
}

function offerFor(serviceId: string): ServiceOffer {
  return {
    offerId: `offer:${serviceId}`,
    serviceId,
    state: "UNDECLARED",
    source: "operator-claimed",
    note: "No normalized commercial terms have been established. Registry prose is not converted into executable pricing without an explicit service offer.",
  };
}

function readinessFor(agent: DiscoveredAgent, serviceId: string, runtimeEndpoints: ServiceRuntimeEndpoint[], permissionProfile: PermissionProfile): ReadinessSnapshot {
  const verification = agent.canonicalVerification?.state ?? "NOT_CHECKED";
  const machineEndpoint = runtimeEndpoints.some((endpoint) => endpoint.machineCallable);
  const checks: ReadinessCheck[] = [
    {
      code: "BSC_NETWORK",
      label: "BSC network",
      state: agent.identity.chainId === 56 ? "PASS" : "WARN",
      requiredForActivation: true,
      detail: agent.identity.chainId === 56 ? "Identity is registered on BSC Mainnet." : "Identity is registered on BSC Testnet; production activation remains unavailable.",
    },
    {
      code: "CANONICAL_IDENTITY",
      label: "Canonical ERC-8004 identity",
      state: verification === "VERIFIED" ? "PASS" : verification === "MISMATCH" ? "FAIL" : "UNKNOWN",
      requiredForActivation: true,
      detail: verification === "VERIFIED" ? "Current ERC-8004 owner and registration backlink are consistent." : verification === "MISMATCH" ? "Canonical identity data conflicts with indexed metadata." : "Canonical onchain verification has not been completed for this service candidate.",
    },
    {
      code: "ACTIVE_METADATA",
      label: "Agent active declaration",
      state: agent.active === true ? "PASS" : agent.active === false ? "FAIL" : "UNKNOWN",
      requiredForActivation: true,
      detail: agent.active === true ? "Registration metadata declares the agent active." : agent.active === false ? "Registration metadata declares the agent inactive." : "No active/inactive declaration has been normalized from registration metadata.",
    },
    {
      code: "MACHINE_ENDPOINT",
      label: "Machine-callable runtime endpoint",
      state: machineEndpoint ? "PASS" : "FAIL",
      requiredForActivation: true,
      detail: machineEndpoint ? "At least one A2A or MCP endpoint is declared in registration metadata." : "No A2A or MCP runtime endpoint is currently normalized for this candidate.",
    },
    {
      code: "PERMISSION_PROFILE",
      label: "Permission profile",
      state: permissionProfile.declarationState === "DECLARED" ? "PASS" : "UNKNOWN",
      requiredForActivation: true,
      detail: permissionProfile.declarationState === "DECLARED" ? "Required authority has been explicitly declared." : "Protocols, assets, execution mode, spend limits and authority scope have not yet been declared as a Spotriq permission profile.",
    },
    {
      code: "MARKETPLACE_TESTS",
      label: "Marketplace tests",
      state: "UNKNOWN",
      requiredForActivation: true,
      detail: "No Spotriq Marketplace Test Lab run exists yet. Registry identity and external reputation cannot substitute for service testing.",
    },
  ];

  const hardFail = checks.some((check) => check.requiredForActivation && check.state === "FAIL");
  const state: ReadinessSnapshot["state"] = agent.canonicalVerification?.state === "MISMATCH" || agent.active === false
    ? "SUSPENDED"
    : agent.identity.chainId === 97
      ? "TESTNET_ONLY"
      : hardFail || checks.some((check) => check.state === "UNKNOWN")
        ? "LIMITED"
        : "LIMITED";
  const reasons = checks.filter((check) => check.state !== "PASS").map((check) => check.detail);
  return {
    readinessSnapshotId: `ready:${serviceId}`,
    serviceId,
    state,
    checkedAt: new Date().toISOString(),
    reasons,
    checks,
    activationEligible: false,
    limitations: [
      "Spotriq does not mark registry-derived services Ready until required marketplace tests and explicit permission/authority declarations exist.",
      "Readiness is operational eligibility, not a prediction of financial performance or profitability.",
    ],
    methodVersion: MARKETPLACE_SERVICE_READINESS_METHOD,
  };
}

function normalizationEvidence(agent: DiscoveredAgent, serviceId: string, category: ServiceCategory, readiness: ReadinessSnapshot): EvidenceEnvelope[] {
  const observedAt = readiness.checkedAt;
  return [
    createEvidenceEnvelope({
      subjectType: "agent_service",
      subjectId: serviceId,
      metric: "service.normalization",
      value: category,
      provenance: "marketplace-derived",
      source: DATA_SOURCES.SPOTRIQ_DERIVED,
      observedAt,
      confidence: "medium",
      method: EVIDENCE_METHODS.AGENT_SERVICE_NORMALIZATION,
      limitation: "Service category is normalized from operator/registry metadata and remains a claim until marketplace testing validates the actual capability.",
    }),
    createEvidenceEnvelope({
      subjectType: "agent_service",
      subjectId: serviceId,
      metric: "service.readiness",
      value: readiness.state,
      provenance: "marketplace-derived",
      source: DATA_SOURCES.SPOTRIQ_DERIVED,
      observedAt,
      confidence: "high",
      method: EVIDENCE_METHODS.SERVICE_READINESS,
      limitation: "Readiness reflects current deterministic gates and is not a trust score or performance rating.",
    }),
    ...agent.evidence,
  ];
}

export function normalizeMarketplaceService(agent: DiscoveredAgent, category: ServiceCategory): MarketplaceServiceRecord | undefined {
  const hint = agent.categoryHints.find((candidate) => candidate.category === category);
  if (!hint) return undefined;
  const serviceId = serviceIdFor(agent, category);
  const listing = buildListing(agent);
  const runtimeEndpoints = normalizeRuntimeEndpoints(agent);
  const protocols = normalizeProtocols(agent, hint);
  const permissionProfile = permissionProfileFor(serviceId, protocols);
  const offer = offerFor(serviceId);
  const readiness = readinessFor(agent, serviceId, runtimeEndpoints, permissionProfile);
  const claim = capabilityClaim(serviceId, hint, protocols);
  const pricing = {
    model: "UNDECLARED",
    amount: "Not declared",
    protocolCostsNote: "No normalized service offer exists yet; protocol/gas costs and agent fees are not inferred from registry prose.",
  };
  const service: AgentService = {
    serviceId,
    agentId: agent.discoveryId,
    listingId: listing.listingId,
    name: `${agent.name} · ${category === "grid" ? "Grid Trading" : category === "yield" ? "Yield Optimisation" : category === "health" ? "Health Factor Monitoring" : "Rebalancing"}`,
    slug: `${listing.slug}-${category}`,
    category,
    description: agent.description,
    readiness: readiness.state,
    readinessNote: readiness.reasons[0],
    permissionIntensity: "unknown",
    pricing,
    supportedProtocols: protocols,
    supportedAssets: [],
    supportedPairs: [],
    automationMode: "Undeclared",
    evidenceSummary: {
      marketplaceObserved: "No marketplace test observations yet",
      externalFeedback: `${agent.externalReputation.totalFeedbacks} external feedback record(s) indexed by 8004scan`,
      operatorClaimed: claim.claim,
      testsPassed: 0,
    },
    operator: agent.ownerAddress ?? "ERC-8004 owner",
    erc8004Verified: agent.canonicalVerification?.state === "VERIFIED",
    origin: "ERC8004",
    marketplaceActivationEligible: false,
    runtimeEndpoints,
    readinessSnapshotId: readiness.readinessSnapshotId,
  };
  const evidence = normalizationEvidence(agent, serviceId, category, readiness);
  return {
    identity: agent,
    listing,
    service,
    permissionProfile,
    offer,
    readiness,
    capabilityClaims: [claim],
    evidence,
    normalizedAt: readiness.checkedAt,
    limitations: [
      "Category/protocol capability is normalized from operator-supplied registry metadata and is not yet marketplace-tested.",
      "Pricing and permission intensity remain undeclared until a structured offer and permission profile are supplied.",
      "Activation is blocked by design in this milestone.",
    ],
  };
}

export function normalizeMarketplaceListing(agent: DiscoveredAgent): MarketplaceListingRecord {
  const listing = buildListing(agent);
  return {
    identity: agent,
    listing,
    serviceCount: agent.categoryHints.length,
    normalizedAt: new Date().toISOString(),
    limitations: agent.categoryHints.length
      ? ["Category tags are normalized from operator-supplied registry metadata and remain untested capability hints."]
      : ["No supported Spotriq financial category could be normalized from the current registry metadata."],
  };
}

function discoveryRelevanceSource(limitations: string[]): FinancialSupplyDiscoveryMatch["relevanceSource"] {
  return limitations.some((item) => /fallback|keyword search/i.test(item))
    ? "8004scan-keyword-fallback"
    : "8004scan-semantic-search";
}

function roundRobinServices(groups: Map<ServiceCategory, MarketplaceServiceRecord[]>, limit: number): MarketplaceServiceRecord[] {
  const output: MarketplaceServiceRecord[] = [];
  const seen = new Set<string>();
  let cursor = 0;
  while (output.length < limit) {
    let added = false;
    for (const category of FINANCIAL_CATEGORIES) {
      const candidate = groups.get(category)?.[cursor];
      if (!candidate || seen.has(candidate.service.serviceId)) continue;
      output.push(candidate);
      seen.add(candidate.service.serviceId);
      added = true;
      if (output.length >= limit) break;
    }
    if (!added) break;
    cursor += 1;
  }
  return output;
}

function createDiscoveryLead(
  agent: DiscoveredAgent,
  match: FinancialSupplyDiscoveryMatch,
  promotedServiceIds: string[],
): FinancialSupplyLead {
  return {
    identity: agent,
    matches: [match],
    promotedServiceIds,
    note: promotedServiceIds.length
      ? "This search result also carries operator-supplied registry metadata supporting at least one normalized Spotriq service candidate. Search relevance itself is not capability proof."
      : "This is a targeted discovery lead only. Search relevance does not establish a financial capability, service readiness, or activation eligibility.",
  };
}

function mergeDiscoveryLead(existing: FinancialSupplyLead | undefined, incoming: FinancialSupplyLead): FinancialSupplyLead {
  if (!existing) return incoming;
  const matches = [...existing.matches];
  for (const match of incoming.matches) {
    if (!matches.some((item) => item.category === match.category && item.query === match.query)) matches.push(match);
  }
  const promotedServiceIds = [...new Set([...existing.promotedServiceIds, ...incoming.promotedServiceIds])];
  return {
    identity: incoming.identity,
    matches,
    promotedServiceIds,
    note: promotedServiceIds.length
      ? "Targeted registry discovery found this identity and operator-supplied metadata supports one or more normalized service candidates. Search relevance remains separate from capability evidence."
      : "Targeted registry discovery found this identity, but no supported financial capability is established by its current operator metadata.",
  };
}

export function createMarketplaceSupply(options: CreateMarketplaceSupplyOptions): MarketplaceSupplyReader {
  const registry = options.registry;
  const defaultChainId = options.defaultChainId ?? 56;
  const store = options.store ?? new MemoryMarketplaceSupplyStore();

  async function listListings(input: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string } = {}): Promise<MarketplaceListingPage> {
    const page = await registry.listAgents({ chainId: input.chainId ?? defaultChainId, page: input.page, limit: input.limit, search: input.search });
    const listings = page.agents.map(normalizeMarketplaceListing);
    try { await store.saveListings(listings); } catch { /* persistence is best effort in discovery */ }
    return {
      listings,
      chainId: page.chainId,
      page: page.page,
      limit: page.limit,
      total: page.total,
      source: page.source,
      fetchedAt: page.fetchedAt,
      limitations: [
        ...page.limitations,
        "A Spotriq listing is a marketplace representation of an identity; it is not itself an activatable financial service.",
      ],
    };
  }

  async function listServices(input: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string; category?: ServiceCategory } = {}): Promise<MarketplaceSupplyPage> {
    const chainId = input.chainId ?? defaultChainId;
    const limit = Math.max(1, Math.min(input.limit ?? 20, 100));
    const searchLimit = Math.max(4, Math.min(limit, 10));
    const userQuery = input.search?.trim();
    const generatedAt = new Date().toISOString();
    const leadMap = new Map<string, FinancialSupplyLead>();
    const servicesByCategory = new Map<ServiceCategory, MarketplaceServiceRecord[]>(FINANCIAL_CATEGORIES.map((category) => [category, []]));
    const searchRuns: FinancialSupplySearchRun[] = [];
    const discoveredAgents = new Map<string, DiscoveredAgent>();
    let sawLiveSource = false;

    if (userQuery) {
      try {
        const page = await registry.searchAgents(userQuery, { chainId, limit: searchLimit });
        sawLiveSource = page.source === "8004scan";
        const targetCategories = input.category ? [input.category] : FINANCIAL_CATEGORIES;
        let matchingCapabilityHints = 0;
        let normalizedServices = 0;
        const relevanceSource = discoveryRelevanceSource(page.limitations);
        for (const agent of page.agents) {
          discoveredAgents.set(agent.discoveryId, agent);
          const promotable = agent.categoryHints.filter((hint) => targetCategories.includes(hint.category));
          if (promotable.length) matchingCapabilityHints += 1;
          const promotedIds: string[] = [];
          for (const hint of promotable) {
            const record = normalizeMarketplaceService(agent, hint.category);
            if (!record) continue;
            servicesByCategory.get(hint.category)!.push(record);
            promotedIds.push(record.service.serviceId);
            normalizedServices += 1;
          }
          const capabilityEstablished = promotable.length > 0;
          leadMap.set(agent.discoveryId, createDiscoveryLead(agent, {
            category: input.category,
            query: userQuery,
            relevanceSource,
            capabilityEvidence: capabilityEstablished ? "OPERATOR_METADATA_HINT" : "NOT_ESTABLISHED",
            note: capabilityEstablished
              ? "The identity matched the user search and carries a supported operator metadata hint. The hint remains untested."
              : "The identity matched the user search, but current registry metadata does not establish the requested supported financial capability.",
          }, promotedIds));
        }
        searchRuns.push({
          category: input.category,
          query: userQuery,
          returned: page.agents.length,
          matchingCapabilityHints,
          normalizedServices,
          source: page.source,
          state: page.source === "cache" ? "PARTIAL" : "COMPLETE",
          limitations: page.limitations,
        });
      } catch (error) {
        searchRuns.push({
          category: input.category,
          query: userQuery,
          returned: 0,
          matchingCapabilityHints: 0,
          normalizedServices: 0,
          source: "8004scan",
          state: "UNAVAILABLE",
          limitations: [`The user-directed registry search failed: ${error instanceof Error ? error.message : String(error)}`],
        });
      }
    } else {
      const categories = input.category ? [input.category] : FINANCIAL_CATEGORIES;
      const outcomes = await Promise.allSettled(categories.map(async (category) => ({
        category,
        query: FINANCIAL_DISCOVERY_QUERIES[category],
        page: await registry.searchAgents(FINANCIAL_DISCOVERY_QUERIES[category], { chainId, limit: searchLimit }),
      })));

      outcomes.forEach((outcome, index) => {
        const category = categories[index]!;
        const query = FINANCIAL_DISCOVERY_QUERIES[category];
        if (outcome.status === "rejected") {
          searchRuns.push({
            category,
            query,
            returned: 0,
            matchingCapabilityHints: 0,
            normalizedServices: 0,
            source: "8004scan",
            state: "UNAVAILABLE",
            limitations: [`Targeted ${category} discovery failed without suppressing other categories: ${outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason)}`],
          });
          return;
        }
        const page = outcome.value.page;
        if (page.source === "8004scan") sawLiveSource = true;
        const relevanceSource = discoveryRelevanceSource(page.limitations);
        let matchingCapabilityHints = 0;
        let normalizedServices = 0;
        for (const agent of page.agents) {
          discoveredAgents.set(agent.discoveryId, agent);
          const hasCapabilityHint = agent.categoryHints.some((hint) => hint.category === category);
          const promotedIds: string[] = [];
          if (hasCapabilityHint) {
            matchingCapabilityHints += 1;
            const record = normalizeMarketplaceService(agent, category);
            if (record) {
              servicesByCategory.get(category)!.push(record);
              promotedIds.push(record.service.serviceId);
              normalizedServices += 1;
            }
          }
          const incoming = createDiscoveryLead(agent, {
            category,
            query,
            relevanceSource,
            capabilityEvidence: hasCapabilityHint ? "OPERATOR_METADATA_HINT" : "NOT_ESTABLISHED",
            note: hasCapabilityHint
              ? `8004scan returned this identity for Spotriq's ${category} search and its current operator metadata independently contains a matching category hint.`
              : `8004scan returned this identity for Spotriq's ${category} search, but its current operator metadata does not independently establish that capability.`,
          }, promotedIds);
          leadMap.set(agent.discoveryId, mergeDiscoveryLead(leadMap.get(agent.discoveryId), incoming));
        }
        searchRuns.push({
          category,
          query,
          returned: page.agents.length,
          matchingCapabilityHints,
          normalizedServices,
          source: page.source,
          state: page.source === "cache" ? "PARTIAL" : "COMPLETE",
          limitations: page.limitations,
        });
      });
    }

    const allNormalized = [...servicesByCategory.values()].flat();
    const uniqueNormalized = [...new Map(allNormalized.map((record) => [record.service.serviceId, record])).values()];
    const balancedGroups = new Map<ServiceCategory, MarketplaceServiceRecord[]>(FINANCIAL_CATEGORIES.map((category) => [
      category,
      uniqueNormalized.filter((record) => record.service.category === category),
    ]));
    const services = roundRobinServices(balancedGroups, limit);
    const listings = [...discoveredAgents.values()].map(normalizeMarketplaceListing);
    try {
      await store.saveListings(listings);
      await store.saveServices(uniqueNormalized);
    } catch { /* persistence is best effort in discovery */ }

    const categoriesRequested = input.category ? [input.category] : FINANCIAL_CATEGORIES;
    const categoriesWithNormalizedSupply = FINANCIAL_CATEGORIES.filter((category) => uniqueNormalized.some((record) => record.service.category === category));
    const discovery: MarketplaceFinancialDiscovery = {
      methodVersion: FINANCIAL_SUPPLY_DISCOVERY_METHOD,
      mode: userQuery ? "USER_QUERY" : "TARGETED",
      chainId,
      searches: searchRuns,
      leads: [...leadMap.values()]
        .sort((a, b) => Number(b.promotedServiceIds.length > 0) - Number(a.promotedServiceIds.length > 0))
        .slice(0, 24),
      categoriesRequested,
      categoriesWithNormalizedSupply,
      generatedAt,
      limitations: [
        "Search relevance is External discovery evidence and does not establish a financial capability.",
        "Only operator metadata carrying a supported category hint can be promoted into an AgentService candidate.",
        "Targeted discovery is bounded to protect the anonymous 8004scan request quota; results are not an exhaustive inventory of all BSC agents.",
      ],
    };

    return {
      services,
      chainId,
      page: 1,
      limit,
      total: uniqueNormalized.length,
      source: sawLiveSource ? "8004scan" : searchRuns.some((run) => run.source === "cache" && run.state !== "UNAVAILABLE") ? "cache" : "8004scan",
      fetchedAt: generatedAt,
      normalizationMethodVersion: MARKETPLACE_SERVICE_NORMALIZATION_METHOD,
      discovery,
      limitations: [
        "Spotriq actively searches the registry for each supported financial category instead of relying on a generic newest-agents page.",
        "Only identities with a supported operator metadata hint become AgentService candidates; targeted search relevance alone remains a discovery lead.",
        "Service candidates remain non-activatable until canonical verification, runtime reachability, explicit authority, and marketplace tests satisfy readiness gates.",
      ],
    };
  }

  async function getService(serviceId: string): Promise<MarketplaceServiceRecord> {
    const parsed = parseServiceId(serviceId);
    const agent = await registry.getAgent(parsed.chainId, parsed.agentId);
    const record = normalizeMarketplaceService(agent, parsed.category);
    if (!record) throw new MarketplaceSupplyError("The requested ERC-8004 identity does not currently carry this supported financial-category hint.", "SERVICE_NOT_FOUND");
    try {
      await store.saveListings([normalizeMarketplaceListing(agent)]);
      await store.saveServices([record]);
    } catch { /* persistence is best effort */ }
    return record;
  }

  async function getReadiness(serviceId: string): Promise<ReadinessSnapshot> {
    return (await getService(serviceId)).readiness;
  }
  async function getEvidence(serviceId: string): Promise<EvidenceEnvelope[]> {
    return (await getService(serviceId)).evidence;
  }
  async function getTests(serviceId: string): Promise<MarketplaceServiceTestCoverage> {
    await getService(serviceId);
    return {
      serviceId,
      coverage: "NOT_RUN",
      tests: [],
      note: "Marketplace Test Lab is not implemented yet. Spotriq will not claim a service is tested merely because ERC-8004 identity or external reputation exists.",
    };
  }
  async function getStatus(): Promise<MarketplaceSupplyStatus> {
    return {
      engine: "Spotriq Marketplace Supply",
      normalizationMethodVersion: MARKETPLACE_SERVICE_NORMALIZATION_METHOD,
      readinessMethodVersion: MARKETPLACE_SERVICE_READINESS_METHOD,
      activationGate: "ENFORCED",
      referenceServicesRemainSample: true,
      checkedAt: new Date().toISOString(),
      capabilities: {
        erc8004IdentityInput: true,
        listingNormalization: true,
        serviceNormalization: true,
        runtimeEndpointNormalization: true,
        permissionProfileNormalization: true,
        offerNormalization: true,
        deterministicReadiness: true,
        targetedFinancialDiscovery: true,
        marketplaceTesting: false,
        activation: false,
      },
      limitations: [
        "ERC-8004 identity proves portable identity/discovery, not functional or safe financial capability.",
        "Spotriq performs bounded targeted registry discovery across all four supported financial categories; search relevance is never treated as capability proof.",
        "Only supported-category candidates are normalized into services; search-relevant identities without matching operator metadata remain discovery leads.",
        "No registry-derived service is activation-eligible until marketplace tests and explicit authority requirements are implemented.",
      ],
    };
  }

  return { getStatus, listListings, listServices, getService, getReadiness, getEvidence, getTests };
}
