import type { AgentRegistryReader } from "@spotriq/agent-registry";
import type {
  AgentAuthorityBinding,
  AgentCapabilityClaim,
  AgentCategoryHint,
  AgentListing,
  AgentRegistryChainId,
  AgentService,
  DiscoveredAgent,
  EvidenceEnvelope,
  Finding,
  FindingCompatibilityContext,
  FindingServiceCompatibilityCheck,
  FindingServiceMatch,
  FindingServiceMatchPage,
  MarketplaceListingPage,
  MarketplaceListingRecord,
  MarketplaceFinancialDiscovery,
  FinancialSupplyDiscoveryMatch,
  FinancialSupplyLead,
  FinancialSupplySearchRun,
  MarketplaceServiceRecord,
  MarketplaceServiceTestCoverage,
  MarketplaceServiceTestRun,
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
import { coverageFromRun, createMarketplaceTestLab, emptyMarketplaceTestCoverage, type MarketplaceTestLab } from "./test-lab.js";
import { createAgentAuthorityBindingVerifier, type AgentAuthorityBindingVerifier } from "./authority-binding.js";

export * from "./test-lab.js";
export * from "./authority-binding.js";

export const MARKETPLACE_SERVICE_NORMALIZATION_METHOD = "marketplace.agent-service-normalization@1.0.0";
export const MARKETPLACE_SERVICE_READINESS_METHOD = "marketplace.service-readiness@1.0.0";
export const FINANCIAL_SUPPLY_DISCOVERY_METHOD = "marketplace.financial-supply-discovery@1.0.0";
export const FINDING_SERVICE_COMPATIBILITY_METHOD = "marketplace.finding-service-compatibility@1.0.0";

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
  saveTestRun(run: MarketplaceServiceTestRun): Promise<void>;
  getLatestTestRun(serviceId: string): Promise<MarketplaceServiceTestRun | undefined>;
  saveAuthorityBinding(binding: AgentAuthorityBinding): Promise<void>;
  getAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding | undefined>;
}

export class MemoryMarketplaceSupplyStore implements MarketplaceSupplyStore {
  private readonly listings = new Map<string, MarketplaceListingRecord>();
  private readonly services = new Map<string, MarketplaceServiceRecord>();
  private readonly testRuns = new Map<string, MarketplaceServiceTestRun[]>();
  private readonly authorityBindings = new Map<string, AgentAuthorityBinding>();

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
  async saveTestRun(run: MarketplaceServiceTestRun): Promise<void> {
    const existing = this.testRuns.get(run.serviceId) ?? [];
    existing.push(structuredClone(run));
    existing.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    this.testRuns.set(run.serviceId, existing.slice(0, 20));
  }
  async getLatestTestRun(serviceId: string): Promise<MarketplaceServiceTestRun | undefined> {
    const run = this.testRuns.get(serviceId)?.[0];
    return run ? structuredClone(run) : undefined;
  }
  async saveAuthorityBinding(binding: AgentAuthorityBinding): Promise<void> { this.authorityBindings.set(binding.serviceId, structuredClone(binding)); }
  async getAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding | undefined> { const value = this.authorityBindings.get(serviceId); return value ? structuredClone(value) : undefined; }
}

export interface QueryableDatabase {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export class PostgresMarketplaceSupplyStore implements MarketplaceSupplyStore {
  constructor(private readonly database: QueryableDatabase) {}

  async saveListings(records: MarketplaceListingRecord[]): Promise<void> {
    for (const record of records) {
      const listing = record.listing;
      if (record.identity.sourceKind === "MARKETPLACE_REFERENCE" || record.identity.identity.namespace === "marketplace") {
        await this.database.query(`
          insert into agent_operators (operator_id, display_name, status, created_at)
          values ('spotriq-reference-agents','Spotriq Reference Agents','ACTIVE',now())
          on conflict (operator_id) do update set display_name=excluded.display_name, status=excluded.status
        `);
        await this.database.query(`
          insert into agent_identities (agent_id, operator_id, network, registry, identifier, registration_status, chain_id, canonical_status, metadata_status, active, supported_protocols, supported_trust, category_hints, external_source, external_feedback_count, synced_at)
          values ($1,'spotriq-reference-agents','BSC','MARKETPLACE_REFERENCE',$2,'DISCOVERED',$3,'NOT_CHECKED','UNAVAILABLE',true,$4::jsonb,$5::jsonb,$6::jsonb,'NONE',0,now())
          on conflict (agent_id) do update set identifier=excluded.identifier, chain_id=excluded.chain_id, active=true, supported_protocols=excluded.supported_protocols, supported_trust=excluded.supported_trust, category_hints=excluded.category_hints, synced_at=now()
        `, [record.identity.discoveryId, record.identity.identity.identifier, record.identity.identity.chainId, JSON.stringify(record.identity.supportedProtocols), JSON.stringify(record.identity.supportedTrust), JSON.stringify(record.identity.categoryHints)]);
      }
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
          $19,$16,$17::jsonb,$18,now(),now()
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
        service.origin ?? "ERC8004",
      ]);

      await this.database.query(`
        insert into service_offers (offer_id, service_id, state, pricing, terms, terms_version, source, note, observed_at)
        values ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9)
        on conflict (offer_id) do update set state=excluded.state, pricing=excluded.pricing, terms=excluded.terms, terms_version=excluded.terms_version, source=excluded.source, note=excluded.note, observed_at=excluded.observed_at
      `, [record.offer.offerId, service.serviceId, record.offer.state, JSON.stringify(record.offer.pricing ?? null), JSON.stringify(record.offer.terms ?? null), record.offer.terms?.termsVersion ?? null, record.offer.source, record.offer.note, record.normalizedAt]);

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

  async saveTestRun(run: MarketplaceServiceTestRun): Promise<void> {
    await this.database.query(`
      insert into marketplace_service_test_runs (run_id, service_id, state, coverage, method_version, payload, started_at, completed_at)
      values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8)
      on conflict (run_id) do update set state=excluded.state, coverage=excluded.coverage, method_version=excluded.method_version, payload=excluded.payload, completed_at=excluded.completed_at
    `, [run.runId, run.serviceId, run.state, run.coverage, run.methodVersion, JSON.stringify(run), run.startedAt, run.completedAt]);
  }

  async getLatestTestRun(serviceId: string): Promise<MarketplaceServiceTestRun | undefined> {
    const result = await this.database.query(`
      select payload from marketplace_service_test_runs
      where service_id = $1
      order by completed_at desc
      limit 1
    `, [serviceId]);
    return result.rows[0]?.payload as MarketplaceServiceTestRun | undefined;
  }

  async saveAuthorityBinding(binding: AgentAuthorityBinding): Promise<void> {
    await this.database.query(`
      insert into agent_authority_bindings (binding_id, service_id, state, session_public_key, payload, observed_at, updated_at)
      values ($1,$2,$3,$4,$5::jsonb,$6,now())
      on conflict (service_id) do update set binding_id=excluded.binding_id, state=excluded.state, session_public_key=excluded.session_public_key, payload=excluded.payload, observed_at=excluded.observed_at, updated_at=now()
    `, [binding.bindingId, binding.serviceId, binding.state, binding.sessionPublicKey ?? null, JSON.stringify(binding), binding.observedAt]);
  }

  async getAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding | undefined> {
    const result = await this.database.query("select payload from agent_authority_bindings where service_id = $1", [serviceId]);
    return result.rows[0]?.payload as AgentAuthorityBinding | undefined;
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
  runTests(serviceId: string): Promise<{ tests: MarketplaceServiceTestCoverage; readiness: ReadinessSnapshot }>;
  matchFinding(finding: Finding, input?: { chainId?: AgentRegistryChainId; limit?: number }): Promise<FindingServiceMatchPage>;
  getAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding | undefined>;
  verifyAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding>;
}

export interface CreateMarketplaceSupplyOptions {
  registry: AgentRegistryReader;
  defaultChainId?: AgentRegistryChainId;
  store?: MarketplaceSupplyStore;
  testLab?: MarketplaceTestLab;
  authorityBindingVerifier?: AgentAuthorityBindingVerifier;
  referenceServices?: MarketplaceServiceRecord[];
}

function slugPart(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 72);
  return slug || "agent";
}

function isReferenceAgent(agent: DiscoveredAgent): boolean {
  return agent.sourceKind === "MARKETPLACE_REFERENCE" || agent.identity.namespace === "marketplace";
}

function serviceIdFor(agent: DiscoveredAgent, category: ServiceCategory): string {
  return isReferenceAgent(agent) ? `svc:reference:${agent.identity.agentId}` : `svc:erc8004:${agent.identity.chainId}:${agent.identity.agentId}:${category}`;
}

function listingIdFor(agent: DiscoveredAgent): string {
  return isReferenceAgent(agent) ? `listing:reference:${agent.identity.agentId}` : `listing:erc8004:${agent.identity.chainId}:${agent.identity.agentId}`;
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
  const reference = isReferenceAgent(agent);
  const status: AgentListing["status"] = mismatch || agent.active === false
    ? "SUSPENDED"
    : reference && machineEndpoint
      ? "TESTING"
      : verified && hasFinancialHint && machineEndpoint
        ? "TESTING"
        : hasFinancialHint
          ? "SUBMITTED"
          : "DISCOVERED";
  return {
    listingId: listingIdFor(agent),
    agentId: agent.discoveryId,
    slug: reference ? slugPart(agent.name) : `${slugPart(agent.name)}-${agent.identity.chainId}-${agent.identity.agentId}`,
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

function readinessFor(
  agent: DiscoveredAgent,
  serviceId: string,
  runtimeEndpoints: ServiceRuntimeEndpoint[],
  permissionProfile: PermissionProfile,
  testCoverage: MarketplaceServiceTestCoverage = emptyMarketplaceTestCoverage(serviceId),
  referenceObservationChainId?: AgentRegistryChainId,
): ReadinessSnapshot {
  const reference = isReferenceAgent(agent);
  const observationChainId = reference ? (referenceObservationChainId ?? agent.identity.chainId) : agent.identity.chainId;
  const verification = agent.canonicalVerification?.state ?? "NOT_CHECKED";
  const machineEndpoint = runtimeEndpoints.some((endpoint) => endpoint.machineCallable);
  const reachabilityTests = testCoverage.tests.filter((test) => test.code === "ENDPOINT_REACHABILITY");
  const runtimeReachable = reachabilityTests.some((test) => test.state === "PASS");
  const runtimeFailed = reachabilityTests.length > 0 && reachabilityTests.every((test) => test.state === "FAIL");
  const testState: ReadinessCheck["state"] = testCoverage.coverage === "PASS"
    ? "PASS"
    : testCoverage.coverage === "FAIL"
      ? "FAIL"
      : testCoverage.coverage === "PARTIAL"
        ? "WARN"
        : "UNKNOWN";
  const runtimeState: ReadinessCheck["state"] = runtimeReachable
    ? "PASS"
    : runtimeFailed
      ? "FAIL"
      : testCoverage.coverage === "PARTIAL"
        ? "WARN"
        : "UNKNOWN";
  const checks: ReadinessCheck[] = [
    {
      code: "BSC_NETWORK",
      label: "BSC network",
      state: reference ? "PASS" : agent.identity.chainId === 56 ? "PASS" : "WARN",
      requiredForActivation: true,
      detail: reference
        ? (observationChainId === 56
          ? `This first-party service supports BSC Mainnet read-only observation (chain 56). Its canonical identity is independently evidenced on chain ${agent.identity.chainId}; Mainnet financial execution remains disabled.`
          : `This first-party service supports BSC Testnet read-only observation (chain 97). Its canonical identity is independently evidenced on chain ${agent.identity.chainId}.`)
        : (agent.identity.chainId === 56 ? "Identity is registered on BSC Mainnet." : "Identity is registered on BSC Testnet; production activation remains unavailable."),
    },
    {
      code: "CANONICAL_IDENTITY",
      label: "Canonical ERC-8004 identity",
      state: verification === "VERIFIED" ? "PASS" : verification === "MISMATCH" ? "FAIL" : "UNKNOWN",
      requiredForActivation: true,
      detail: reference
        ? verification === "VERIFIED"
          ? "The first-party service is bound to a canonically verified ERC-8004 identity whose registration metadata matches the expected Spotriq reference runtime."
          : verification === "MISMATCH"
            ? "The configured first-party ERC-8004 identity failed canonical reconciliation."
            : "This first-party runtime is registration-ready, but no reconciled ERC-8004 identity is currently bound."
        : verification === "VERIFIED" ? "Current ERC-8004 owner and registration backlink are consistent." : verification === "MISMATCH" ? "Canonical identity data conflicts with indexed metadata." : "Canonical onchain verification has not been completed for this service candidate.",
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
      label: "Machine-callable endpoint declaration",
      state: machineEndpoint ? "PASS" : "FAIL",
      requiredForActivation: true,
      detail: machineEndpoint ? "At least one A2A or MCP endpoint is declared in registration metadata." : "No A2A or MCP runtime endpoint is currently normalized for this candidate.",
    },
    {
      code: "RUNTIME_REACHABILITY",
      label: "Runtime reachability",
      state: runtimeState,
      requiredForActivation: true,
      detail: runtimeReachable
        ? "Spotriq Marketplace Test Lab observed at least one declared machine runtime responding through its protocol discovery surface."
        : runtimeFailed
          ? "Spotriq could not reach any tested machine runtime through the bounded marketplace probe."
          : testCoverage.coverage === "PARTIAL"
            ? "Runtime evidence is incomplete; no endpoint has a complete reachability observation yet."
            : "Runtime reachability has not been observed by Spotriq yet.",
      evidenceIds: testCoverage.tests.filter((test) => test.code === "ENDPOINT_REACHABILITY").flatMap((test) => test.evidenceIds ?? []),
    },
    {
      code: "PERMISSION_PROFILE",
      label: "Permission profile",
      state: permissionProfile.declarationState === "DECLARED" ? "PASS" : "UNKNOWN",
      requiredForActivation: true,
      detail: permissionProfile.declarationState === "DECLARED"
        ? (reference && permissionProfile.executionMode === "READ_ONLY" ? "The reference runtime explicitly declares read-only authority and receives no wallet signing capability." : "Required authority has been explicitly declared.")
        : "Protocols, assets, execution mode, spend limits and authority scope have not yet been declared as a Spotriq permission profile.",
    },
    {
      code: "MARKETPLACE_TESTS",
      label: "Marketplace tests",
      state: testState,
      requiredForActivation: true,
      detail: testCoverage.coverage === "PASS"
        ? "At least one machine endpoint passed Spotriq endpoint-policy, reachability, protocol-contract and category-capability checks."
        : testCoverage.coverage === "FAIL"
          ? "The latest Marketplace Test Lab run failed required contract-level checks."
          : testCoverage.coverage === "PARTIAL"
            ? "The latest Marketplace Test Lab run produced useful runtime evidence but did not satisfy every required contract-level check."
            : "No Spotriq Marketplace Test Lab run exists yet. Registry identity and external reputation cannot substitute for service testing.",
      evidenceIds: testCoverage.evidence.map((item) => item.evidenceId),
    },
  ];

  const required = checks.filter((check) => check.requiredForActivation);
  const allRequiredPass = required.every((check) => check.state === "PASS");
  const state: ReadinessSnapshot["state"] = agent.canonicalVerification?.state === "MISMATCH" || agent.active === false
    ? "SUSPENDED"
    : reference
      ? runtimeFailed ? "OFFLINE" : testCoverage.coverage === "FAIL" ? "DEGRADED" : "LIMITED"
      : agent.identity.chainId === 97
        ? "TESTNET_ONLY"
        : allRequiredPass
          ? "READY"
          : runtimeFailed
            ? "OFFLINE"
            : testCoverage.coverage === "FAIL"
              ? "DEGRADED"
              : "LIMITED";
  const reasons = checks.filter((check) => check.state !== "PASS").map((check) => check.detail);
  return {
    readinessSnapshotId: `ready:${serviceId}`,
    serviceId,
    state,
    checkedAt: new Date().toISOString(),
    reasons,
    checks,
    activationEligible: !reference && state === "READY",
    limitations: [
      "Marketplace Test Lab verifies bounded runtime contracts and advertised machine capability; it does not execute financial actions or establish profitability.",
      reference
        ? (verification === "VERIFIED"
          ? "The first-party runtime has passed canonical ERC-8004 reconciliation. FREE read-only commercial activation is supported independently from financial activation, permission, and execution authority."
          : "The first-party runtime may support FREE read-only observation, but its public ERC-8004 identity remains unreconciled; identity evidence stays separate from commercial activation and financial authority.")
        : "A service cannot become Ready unless identity, active state, endpoint declaration/reachability, explicit permission profile and marketplace tests all pass independently.",
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
    marketplaceActivationEligible: Boolean(readiness.activationEligible),
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

function applyTestCoverageToRecord(record: MarketplaceServiceRecord, coverage: MarketplaceServiceTestCoverage): MarketplaceServiceRecord {
  const readiness = readinessFor(
    record.identity, record.service.serviceId, record.service.runtimeEndpoints ?? [], record.permissionProfile, coverage,
    isReferenceAgent(record.identity) ? record.offer.terms?.chainId : undefined,
  );
  const listingStatus: AgentListing["status"] = readiness.state === "SUSPENDED"
    ? "SUSPENDED"
    : readiness.state === "READY"
      ? "READY"
      : readiness.state === "OFFLINE" || readiness.state === "DEGRADED"
        ? "DEGRADED"
        : record.listing.status;
  const testsPassed = coverage.tests.filter((test) => test.state === "PASS").length;
  return {
    ...record,
    listing: { ...record.listing, status: listingStatus },
    service: {
      ...record.service,
      readiness: readiness.state,
      readinessNote: isReferenceAgent(record.identity) && record.offer.terms?.chainId === 56
        ? `BSC Mainnet read-only observation is supported; canonical identity remains separate on chain ${record.identity.identity.chainId}. Mainnet financial execution is disabled.`
        : readiness.reasons[0],
      marketplaceActivationEligible: Boolean(readiness.activationEligible),
      readinessSnapshotId: readiness.readinessSnapshotId,
      evidenceSummary: {
        ...record.service.evidenceSummary,
        marketplaceObserved: coverage.coverage === "NOT_RUN"
          ? "No marketplace test observations yet"
          : `${testsPassed} contract-level marketplace test check(s) passed; latest coverage ${coverage.coverage}`,
        testsPassed,
      },
    },
    readiness,
    evidence: [...normalizationEvidence(record.identity, record.service.serviceId, record.service.category, readiness), ...coverage.evidence],
    normalizedAt: readiness.checkedAt,
    limitations: [
      ...record.limitations.filter((item) => !/Activation is blocked by design in this milestone|not yet marketplace-tested/i.test(item)),
      coverage.coverage === "NOT_RUN"
        ? (isReferenceAgent(record.identity) ? "First-party capability is declared by the versioned reference-agent catalog and has not yet been observed through the public Marketplace Test Lab." : "Category/protocol capability is normalized from operator metadata and has not yet been observed by Marketplace Test Lab.")
        : "Marketplace Test Lab evidence is contract-level only and does not establish profitability, execution quality, or authority safety.",
      "Activation remains independently gated by explicit permission/authority requirements and the marketplace activation engine.",
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

function textValue(subject: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = subject?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeComparable(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function valuesCompatible(target: string, candidates: string[]): boolean {
  const normalizedTarget = normalizeComparable(target);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeComparable(candidate);
    return normalizedCandidate === normalizedTarget || normalizedCandidate.includes(normalizedTarget) || normalizedTarget.includes(normalizedCandidate);
  });
}

function compatibilityContext(finding: Finding): FindingCompatibilityContext {
  const subject = finding.subject;
  return {
    category: finding.category,
    protocol: textValue(subject, "protocol"),
    asset: textValue(subject, "asset"),
    assetAddress: textValue(subject, "underlyingAddress"),
    pair: textValue(subject, "pair"),
    network: textValue(subject, "network"),
    findingState: finding.state,
    severity: finding.severity,
  };
}

function readinessCheck(record: MarketplaceServiceRecord, code: string): ReadinessCheck | undefined {
  return record.readiness.checks?.find((check) => check.code === code);
}

function mappedReadinessState(check: ReadinessCheck | undefined): FindingServiceCompatibilityCheck["state"] {
  if (!check) return "UNKNOWN";
  if (check.state === "PASS") return "PASS";
  if (check.state === "FAIL") return "FAIL";
  if (check.state === "WARN") return "WARN";
  return "UNKNOWN";
}

function contextCheck(
  code: FindingServiceCompatibilityCheck["code"],
  label: string,
  target: string | undefined,
  candidates: string[],
): FindingServiceCompatibilityCheck {
  if (!target) return { code, label, state: "UNKNOWN", requiredForCompatibility: false, detail: `The finding does not define a ${label.toLowerCase()} constraint.` };
  if (candidates.length === 0) return { code, label, state: "UNKNOWN", requiredForCompatibility: false, detail: `The finding requires ${target}, but this service does not publish structured ${label.toLowerCase()} coverage yet.` };
  const compatible = valuesCompatible(target, candidates);
  return {
    code,
    label,
    state: compatible ? "PASS" : "FAIL",
    requiredForCompatibility: true,
    detail: compatible
      ? `Structured service metadata includes ${target}.`
      : `The finding requires ${target}, while the service declares ${candidates.join(", ")}.`,
  };
}

function readinessCompatibilityCheck(record: MarketplaceServiceRecord, code: "CANONICAL_IDENTITY" | "RUNTIME_REACHABILITY" | "MARKETPLACE_TESTS" | "PERMISSION_PROFILE", label: string): FindingServiceCompatibilityCheck {
  const readiness = readinessCheck(record, code);
  return {
    code,
    label,
    state: mappedReadinessState(readiness),
    requiredForCompatibility: false,
    detail: readiness?.detail ?? `${label} has not been established for this service candidate.`,
  };
}

function readinessOrder(record: MarketplaceServiceRecord): number {
  return ({ READY: 6, LIMITED: 5, TESTNET_ONLY: 4, DEGRADED: 3, OFFLINE: 2, SUSPENDED: 0 } as const)[record.readiness.state];
}

function evidenceOrder(checks: FindingServiceCompatibilityCheck[]): number {
  const observedCodes = ["CANONICAL_IDENTITY", "RUNTIME_REACHABILITY", "MARKETPLACE_TESTS"];
  return checks.filter((check) => observedCodes.includes(check.code) && check.state === "PASS").length;
}

function tierOrder(tier: FindingServiceMatch["tier"]): number {
  return tier === "EXACT_CONTEXT" ? 3 : tier === "CONTEXT_COMPATIBLE" ? 2 : 1;
}

function buildFindingServiceMatch(finding: Finding, record: MarketplaceServiceRecord): FindingServiceMatch | undefined {
  if (record.service.category !== finding.category || record.readiness.state === "SUSPENDED") return undefined;
  const context = compatibilityContext(finding);
  const categoryCheck: FindingServiceCompatibilityCheck = {
    code: "CATEGORY",
    label: "Financial category",
    state: "PASS",
    requiredForCompatibility: true,
    detail: `Finding and service both target ${finding.category}.`,
  };
  const protocolCheck = contextCheck("PROTOCOL", "Protocol", context.protocol, record.service.supportedProtocols);
  const assetTargets = [context.asset, context.assetAddress].filter((value): value is string => Boolean(value));
  const assetCheck = assetTargets.length === 0
    ? contextCheck("ASSET", "Asset", undefined, record.service.supportedAssets ?? [])
    : record.service.supportedAssets?.length
      ? {
          code: "ASSET" as const,
          label: "Asset",
          state: assetTargets.some((target) => valuesCompatible(target, record.service.supportedAssets ?? [])) ? "PASS" as const : "FAIL" as const,
          requiredForCompatibility: true,
          detail: assetTargets.some((target) => valuesCompatible(target, record.service.supportedAssets ?? []))
            ? `Structured service metadata covers the finding asset (${assetTargets.join(" / ")}).`
            : `The finding asset (${assetTargets.join(" / ")}) is not present in the service's declared asset coverage (${record.service.supportedAssets.join(", ")}).`,
        }
      : {
          code: "ASSET" as const,
          label: "Asset",
          state: "UNKNOWN" as const,
          requiredForCompatibility: false,
          detail: `The finding concerns ${assetTargets.join(" / ")}, but this service does not publish structured asset coverage yet.`,
        };
  const pairCheck = contextCheck("PAIR", "Pair", context.pair, record.service.supportedPairs ?? []);
  const checks: FindingServiceCompatibilityCheck[] = [
    categoryCheck,
    protocolCheck,
    assetCheck,
    pairCheck,
    readinessCompatibilityCheck(record, "CANONICAL_IDENTITY", "Canonical ERC-8004 identity"),
    readinessCompatibilityCheck(record, "RUNTIME_REACHABILITY", "Observed runtime reachability"),
    readinessCompatibilityCheck(record, "MARKETPLACE_TESTS", "Marketplace Test Lab"),
    readinessCompatibilityCheck(record, "PERMISSION_PROFILE", "Permission authority"),
  ];
  if (checks.some((check) => check.requiredForCompatibility && check.state === "FAIL")) return undefined;

  const applicableContext = [protocolCheck, assetCheck, pairCheck].filter((check) => check.state !== "UNKNOWN");
  const contextPasses = applicableContext.filter((check) => check.state === "PASS").length;
  const hasUnknownContext = [protocolCheck, assetCheck, pairCheck].some((check) => check.state === "UNKNOWN" && (check.code === "PROTOCOL" ? Boolean(context.protocol) : check.code === "ASSET" ? assetTargets.length > 0 : Boolean(context.pair)));
  const tier: FindingServiceMatch["tier"] = contextPasses > 0 && !hasUnknownContext
    ? "EXACT_CONTEXT"
    : contextPasses > 0
      ? "CONTEXT_COMPATIBLE"
      : "CATEGORY_ONLY";

  const strengths: string[] = [`Matches the ${finding.category} financial category.`];
  if (protocolCheck.state === "PASS" && context.protocol) strengths.push(`Declares ${context.protocol} protocol compatibility.`);
  if (assetCheck.state === "PASS" && assetTargets.length) strengths.push(`Declares coverage for the finding asset.`);
  if (pairCheck.state === "PASS" && context.pair) strengths.push(`Declares coverage for ${context.pair}.`);
  if (mappedReadinessState(readinessCheck(record, "CANONICAL_IDENTITY")) === "PASS") strengths.push("Canonical ERC-8004 identity is verified.");
  if (mappedReadinessState(readinessCheck(record, "RUNTIME_REACHABILITY")) === "PASS") strengths.push("Spotriq observed the declared machine runtime as reachable.");
  if (mappedReadinessState(readinessCheck(record, "MARKETPLACE_TESTS")) === "PASS") strengths.push("Marketplace Test Lab contract/category checks passed.");

  const limitations = checks.filter((check) => check.state === "UNKNOWN" || check.state === "WARN" || check.state === "FAIL").map((check) => check.detail);
  if (!record.service.marketplaceActivationEligible) limitations.push(`This service is ${record.readiness.state} and is not currently activation-eligible.`);
  limitations.push("Compatibility is deterministic context matching, not a prediction of profit, execution quality, or financial suitability.");

  const tierLabel = tier === "EXACT_CONTEXT" ? "matches the available structured finding context" : tier === "CONTEXT_COMPATIBLE" ? "matches part of the available structured finding context" : "matches the required financial category but lacks structured context coverage";
  return {
    matchId: `match:${finding.findingId}:${record.service.serviceId}`,
    findingId: finding.findingId,
    serviceId: record.service.serviceId,
    rank: 0,
    tier,
    activationEligible: Boolean(record.service.marketplaceActivationEligible),
    service: record,
    checks,
    strengths,
    limitations: [...new Set(limitations)],
    explanation: `${record.service.name} ${tierLabel}. Operational readiness (${record.readiness.state}) and evidence quality affect ordering, but do not change the underlying compatibility facts or bypass activation gates.`,
  };
}

export function rankServicesForFinding(
  finding: Finding,
  records: MarketplaceServiceRecord[],
  input: { limit?: number; source?: "8004scan" | "cache"; generatedAt?: string } = {},
): FindingServiceMatchPage {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const candidates = records.map((record) => buildFindingServiceMatch(finding, record)).filter((match): match is FindingServiceMatch => Boolean(match));
  candidates.sort((a, b) => {
    const tierDelta = tierOrder(b.tier) - tierOrder(a.tier);
    if (tierDelta) return tierDelta;
    const evidenceDelta = evidenceOrder(b.checks) - evidenceOrder(a.checks);
    if (evidenceDelta) return evidenceDelta;
    const readinessDelta = readinessOrder(b.service) - readinessOrder(a.service);
    if (readinessDelta) return readinessDelta;
    return a.serviceId.localeCompare(b.serviceId);
  });
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20));
  const matches = candidates.slice(0, limit).map((match, index) => ({ ...match, rank: index + 1 }));
  return {
    findingId: finding.findingId,
    checkSessionId: finding.checkSessionId,
    context: compatibilityContext(finding),
    matches,
    consideredServices: records.length,
    excludedServices: records.length - candidates.length,
    source: input.source ?? "8004scan",
    methodVersion: FINDING_SERVICE_COMPATIBILITY_METHOD,
    generatedAt,
    limitations: [
      "Ranking is deterministic and lexicographic; Spotriq does not calculate an opaque trust or profitability score.",
      "Missing structured protocol/asset/pair metadata remains UNKNOWN rather than being treated as evidence of incompatibility.",
      "Operational readiness and Marketplace Test Lab evidence affect ordering but never make a non-ready service activation-eligible.",
      "A high-ranked match is a context-compatible marketplace candidate, not financial advice or a performance prediction.",
    ],
  };
}

export function createMarketplaceSupply(options: CreateMarketplaceSupplyOptions): MarketplaceSupplyReader {
  const registry = options.registry;
  const defaultChainId = options.defaultChainId ?? 56;
  const store = options.store ?? new MemoryMarketplaceSupplyStore();
  const testLab = options.testLab ?? createMarketplaceTestLab();
  const authorityBindingVerifier = options.authorityBindingVerifier ?? createAgentAuthorityBindingVerifier();
  const referenceServices = [...(options.referenceServices ?? [])];
  const referenceServiceMap = new Map(referenceServices.map((record) => [record.service.serviceId, record]));
  const referenceIdentityIds = new Set(referenceServices
    .map((record) => record.identity.discoveryId)
    .filter((discoveryId) => discoveryId.startsWith("erc8004:")));

  async function hydrateTestCoverage(record: MarketplaceServiceRecord): Promise<MarketplaceServiceRecord> {
    try {
      const latest = await store.getLatestTestRun(record.service.serviceId);
      return applyTestCoverageToRecord(record, latest ? coverageFromRun(latest) : emptyMarketplaceTestCoverage(record.service.serviceId));
    } catch {
      return applyTestCoverageToRecord(record, emptyMarketplaceTestCoverage(record.service.serviceId));
    }
  }

  async function listListings(input: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string } = {}): Promise<MarketplaceListingPage> {
    const page = await registry.listAgents({ chainId: input.chainId ?? defaultChainId, page: input.page, limit: input.limit, search: input.search });
    const externalListings = page.agents
      .filter((agent) => !referenceIdentityIds.has(agent.discoveryId))
      .map(normalizeMarketplaceListing);
    const referenceListings = referenceServices
      .map((record) => ({ identity: record.identity, listing: record.listing, serviceCount: 1, normalizedAt: record.normalizedAt, limitations: [...record.limitations] }));
    const listings = [...referenceListings, ...externalListings];
    try { await store.saveListings(listings); } catch { /* persistence is best effort in discovery */ }
    return {
      listings,
      chainId: page.chainId,
      page: page.page,
      limit: page.limit,
      total: page.total === undefined ? undefined : page.total + referenceListings.length,
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

    const eligibleReference = referenceServices.filter((record) => {
      if (input.category && record.service.category !== input.category) return false;
      if (userQuery) {
        const haystack = [record.service.name, record.service.description, record.service.category, ...record.service.supportedProtocols, ...record.capabilityClaims.flatMap((claim) => [claim.claim, ...claim.basis])].join(" ").toLowerCase();
        if (!userQuery.toLowerCase().split(/\s+/).filter(Boolean).some((term) => haystack.includes(term))) return false;
      }
      return true;
    });
    const externalNormalized = [...servicesByCategory.values()].flat()
      .filter((record) => !referenceIdentityIds.has(record.identity.discoveryId));
    const allNormalized = [...eligibleReference, ...externalNormalized];
    const uniqueNormalized = [...new Map(allNormalized.map((record) => [record.service.serviceId, record])).values()];
    const hydratedNormalized = await Promise.all(uniqueNormalized.map(hydrateTestCoverage));
    const balancedGroups = new Map<ServiceCategory, MarketplaceServiceRecord[]>(FINANCIAL_CATEGORIES.map((category) => [
      category,
      hydratedNormalized.filter((record) => record.service.category === category),
    ]));
    const services = roundRobinServices(balancedGroups, limit);
    const listings = [
      ...eligibleReference.map((record) => ({ identity: record.identity, listing: record.listing, serviceCount: 1, normalizedAt: record.normalizedAt, limitations: [...record.limitations] })),
      ...[...discoveredAgents.values()]
        .filter((agent) => !referenceIdentityIds.has(agent.discoveryId))
        .map(normalizeMarketplaceListing),
    ];
    try {
      await store.saveListings(listings);
      await store.saveServices(hydratedNormalized);
    } catch { /* persistence is best effort in discovery */ }

    const categoriesRequested = input.category ? [input.category] : FINANCIAL_CATEGORIES;
    const categoriesWithNormalizedSupply = FINANCIAL_CATEGORIES.filter((category) => hydratedNormalized.some((record) => record.service.category === category));
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
        "External identities require operator metadata carrying a supported category hint before promotion; first-party Spotriq reference services are versioned catalog entries and remain independently test/readiness gated.",
        "Targeted discovery is bounded to protect the anonymous 8004scan request quota; results are not an exhaustive inventory of all BSC agents.",
      ],
    };

    return {
      services,
      chainId,
      page: 1,
      limit,
      total: hydratedNormalized.length,
      source: sawLiveSource ? "8004scan" : searchRuns.some((run) => run.source === "cache" && run.state !== "UNAVAILABLE") ? "cache" : "8004scan",
      fetchedAt: generatedAt,
      normalizationMethodVersion: MARKETPLACE_SERVICE_NORMALIZATION_METHOD,
      discovery,
      limitations: [
        "Spotriq actively searches the registry for each supported financial category instead of relying on a generic newest-agents page.",
        "External identities need a supported operator metadata hint to become AgentService candidates; targeted search relevance alone remains a discovery lead. First-party reference services are explicit catalog supply, not inferred registry claims.",
        "First-party reference services expose identity-chain evidence separately from their read-only observation network. A Testnet ERC-8004 identity does not imply Mainnet financial execution; Mainnet support is read-only only.",
        "Service candidates remain non-activatable until canonical verification, runtime reachability, explicit authority, and marketplace tests satisfy readiness gates.",
      ],
    };
  }

  async function getService(serviceId: string): Promise<MarketplaceServiceRecord> {
    const reference = referenceServiceMap.get(serviceId);
    if (reference) {
      const record = await hydrateTestCoverage(reference);
      try {
        await store.saveListings([{ identity: record.identity, listing: record.listing, serviceCount: 1, normalizedAt: record.normalizedAt, limitations: [...record.limitations] }]);
        await store.saveServices([record]);
      } catch { /* persistence is best effort */ }
      return record;
    }
    const parsed = parseServiceId(serviceId);
    const agent = await registry.getAgent(parsed.chainId, parsed.agentId);
    const normalized = normalizeMarketplaceService(agent, parsed.category);
    if (!normalized) throw new MarketplaceSupplyError("The requested ERC-8004 identity does not currently carry this supported financial-category hint.", "SERVICE_NOT_FOUND");
    const record = await hydrateTestCoverage(normalized);
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
    try {
      const latest = await store.getLatestTestRun(serviceId);
      return latest ? coverageFromRun(latest) : emptyMarketplaceTestCoverage(serviceId);
    } catch {
      return emptyMarketplaceTestCoverage(serviceId);
    }
  }
  async function runTests(serviceId: string): Promise<{ tests: MarketplaceServiceTestCoverage; readiness: ReadinessSnapshot }> {
    const record = await getService(serviceId);
    const run = await testLab.run(record);
    const tests = coverageFromRun(run);
    const updated = applyTestCoverageToRecord(record, tests);
    try {
      await store.saveTestRun(run);
      await store.saveServices([updated]);
    } catch (error) {
      throw new MarketplaceSupplyError("Marketplace Test Lab completed, but its result could not be persisted.", "NORMALIZATION_FAILED", true, error instanceof Error ? error.message : String(error));
    }
    return { tests, readiness: updated.readiness };
  }

  async function matchFinding(finding: Finding, input: { chainId?: AgentRegistryChainId; limit?: number } = {}): Promise<FindingServiceMatchPage> {
    const page = await listServices({ chainId: input.chainId ?? defaultChainId, category: finding.category, limit: 20 });
    return rankServicesForFinding(finding, page.services, {
      limit: input.limit ?? 8,
      source: page.source,
      generatedAt: page.fetchedAt,
    });
  }
  async function getStatus(): Promise<MarketplaceSupplyStatus> {
    return {
      engine: "Spotriq Marketplace Supply",
      normalizationMethodVersion: MARKETPLACE_SERVICE_NORMALIZATION_METHOD,
      readinessMethodVersion: MARKETPLACE_SERVICE_READINESS_METHOD,
      activationGate: "ENFORCED",
      referenceServicesRemainSample: false,
      liveReferenceServices: referenceServices.length > 0,
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
        marketplaceTesting: true,
        findingServiceCompatibility: true,
        liveReferenceAgentSupply: referenceServices.length > 0,
        activation: false,
      },
      limitations: [
        "Spotriq ships first-party callable reference services across Rebalancing, Grid Trading, Yield Optimisation and Health Factor Monitoring. v0.23 permits a separate FREE read-only commercial relationship only after current runtime, Test Lab and canonical identity gates pass; financial activation remains independently gated.",
        "ERC-8004 identity proves portable identity/discovery, not functional or safe financial capability.",
        "Spotriq performs bounded targeted registry discovery across all four supported financial categories; search relevance is never treated as capability proof.",
        "Only supported-category candidates are normalized into services; search-relevant identities without matching operator metadata remain discovery leads.",
        "Marketplace Test Lab now performs bounded A2A/MCP runtime contract checks; it never executes financial actions or converts test success into a performance claim.",
        "Smart Money Findings can now be deterministically matched to normalized AgentService candidates using category, protocol/context declarations, evidence quality, and readiness without an opaque trust score.",
        "Registry-derived services remain non-activatable until explicit permission/authority requirements and every independent readiness gate pass.",
      ],
    };
  }

  async function getAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding | undefined> {
    return store.getAuthorityBinding(serviceId);
  }

  async function verifyAuthorityBinding(serviceId: string): Promise<AgentAuthorityBinding> {
    const record = await getService(serviceId);
    const result = await authorityBindingVerifier.verify(record);
    await store.saveAuthorityBinding(result.binding);
    if (result.evidence.length > 0) {
      const next: MarketplaceServiceRecord = { ...record, evidence: [...record.evidence, ...result.evidence] };
      await store.saveServices([next]);
    }
    return result.binding;
  }

  return { getStatus, listListings, listServices, getService, getReadiness, getEvidence, getTests, runTests, matchFinding, getAuthorityBinding, verifyAuthorityBinding };
}
