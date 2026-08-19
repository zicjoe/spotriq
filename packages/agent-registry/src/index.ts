import { decodeFunctionResult, encodeFunctionData, getAddress, type Address } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import type {
  AgentCanonicalVerification,
  AgentCategoryHint,
  AgentDiscoveryPage,
  AgentRegistrationFile,
  AgentRegistrationServiceEndpoint,
  AgentRegistryChainId,
  AgentRegistryStatus,
  BscNetwork,
  DiscoveredAgent,
  EvidenceEnvelope,
  ExternalAgentFeedbackPage,
  ExternalAgentFeedbackRecord,
  ServiceCategory,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";

export const ERC8004_REGISTRIES: Record<AgentRegistryChainId, {
  network: BscNetwork;
  identityRegistry: Address;
  reputationRegistry: Address;
}> = {
  56: {
    network: "mainnet",
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  },
  97: {
    network: "testnet",
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
};

const IDENTITY_ABI = [
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "owner", type: "address" }],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "uri", type: "string" }],
  },
  {
    type: "function",
    name: "getAgentWallet",
    stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [{ name: "wallet", type: "address" }],
  },
] as const;

interface ScanAgent {
  id?: string;
  agent_id?: string;
  token_id?: number;
  chain_id?: number;
  name?: string;
  description?: string;
  image_url?: string;
  owner_address?: string;
  supported_protocols?: string[];
  total_score?: number;
  star_count?: number;
  total_feedbacks?: number;
  created_at?: string;
}

interface ScanFeedback {
  id?: string;
  chain_id?: number;
  token_id?: number;
  user_id?: string;
  score?: number;
  comment?: string;
  created_at?: string;
}

interface ScanResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    timestamp?: string;
    requestId?: string;
    pagination?: { page?: number; limit?: number; total?: number; hasMore?: boolean };
  };
  error?: { code?: string; message?: string; details?: unknown };
}

export class AgentRegistryError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_INPUT" | "UNSUPPORTED_CHAIN" | "INDEX_UNAVAILABLE" | "AGENT_NOT_FOUND" | "CANONICAL_READ_FAILED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AgentRegistryError";
  }
}

export interface AgentRegistryStore {
  saveAgents(agents: DiscoveredAgent[]): Promise<void>;
  saveFeedback(records: ExternalAgentFeedbackRecord[]): Promise<void>;
  getAgent(chainId: AgentRegistryChainId, agentId: string): Promise<DiscoveredAgent | undefined>;
  listAgents(chainId: AgentRegistryChainId, limit: number): Promise<DiscoveredAgent[]>;
}

export class MemoryAgentRegistryStore implements AgentRegistryStore {
  private agents = new Map<string, DiscoveredAgent>();
  private feedback = new Map<string, ExternalAgentFeedbackRecord>();
  async saveAgents(agents: DiscoveredAgent[]) { for (const agent of agents) this.agents.set(agent.discoveryId, structuredClone(agent)); }
  async saveFeedback(records: ExternalAgentFeedbackRecord[]) { for (const record of records) this.feedback.set(record.feedbackId, { ...record }); }
  async getAgent(chainId: AgentRegistryChainId, agentId: string) { return this.agents.get(`erc8004:${chainId}:${agentId}`); }
  async listAgents(chainId: AgentRegistryChainId, limit: number) {
    return [...this.agents.values()].filter((agent) => agent.identity.chainId === chainId).slice(0, limit).map((agent) => structuredClone(agent));
  }
}

export interface QueryableDatabase {
  query(text: string, values?: unknown[]): Promise<{ rows: any[]; rowCount?: number | null }>;
}

export class PostgresAgentRegistryStore implements AgentRegistryStore {
  constructor(private readonly database: QueryableDatabase) {}

  async saveAgents(agents: DiscoveredAgent[]): Promise<void> {
    for (const agent of agents) {
      await this.database.query(`
        insert into agent_identities (
          agent_id, network, registry, identifier, owner_address, registration_status,
          chain_id, token_id, registry_address, agent_uri, agent_wallet, image_url,
          external_source, external_record_id, external_total_score, external_star_count,
          external_feedback_count, canonical_status, metadata_status, active, x402_support,
          supported_protocols, supported_trust, category_hints, raw_registration, synced_at
        ) values (
          $1, 'BSC', 'ERC-8004', $2, $3, 'DISCOVERED',
          $4, $5, $6, $7, $8, $9,
          '8004scan', $10, $11, $12, $13, $14, $15, $16, $17,
          $18::jsonb, $19::jsonb, $20::jsonb, $21::jsonb, now()
        )
        on conflict (agent_id) do update set
          owner_address = excluded.owner_address,
          identifier = excluded.identifier,
          agent_uri = excluded.agent_uri,
          agent_wallet = excluded.agent_wallet,
          image_url = excluded.image_url,
          external_record_id = excluded.external_record_id,
          external_total_score = excluded.external_total_score,
          external_star_count = excluded.external_star_count,
          external_feedback_count = excluded.external_feedback_count,
          canonical_status = excluded.canonical_status,
          metadata_status = excluded.metadata_status,
          active = excluded.active,
          x402_support = excluded.x402_support,
          supported_protocols = excluded.supported_protocols,
          supported_trust = excluded.supported_trust,
          category_hints = excluded.category_hints,
          raw_registration = excluded.raw_registration,
          synced_at = now()
      `, [
        agent.discoveryId,
        agent.identity.identifier,
        agent.ownerAddress ?? null,
        agent.identity.chainId,
        agent.identity.agentId,
        agent.identity.registryAddress,
        agent.canonicalVerification?.agentUri ?? null,
        agent.canonicalVerification?.agentWallet ?? null,
        agent.imageUrl ?? null,
        agent.discoveryId,
        agent.externalReputation.totalScore ?? null,
        agent.externalReputation.starCount ?? null,
        agent.externalReputation.totalFeedbacks,
        agent.canonicalVerification?.state ?? "NOT_CHECKED",
        agent.canonicalVerification?.registrationMetadataState ?? "UNAVAILABLE",
        agent.active ?? null,
        agent.x402Support ?? null,
        JSON.stringify(agent.supportedProtocols),
        JSON.stringify(agent.supportedTrust),
        JSON.stringify(agent.categoryHints),
        JSON.stringify(agent.canonicalVerification?.registrationFile ?? null),
      ]);
      await this.database.query(`
        insert into agent_discovery_cache (agent_id, name, description, payload, source, synced_at)
        values ($1, $2, $3, $4::jsonb, '8004scan', now())
        on conflict (agent_id) do update set name = excluded.name, description = excluded.description, payload = excluded.payload, synced_at = now()
      `, [agent.discoveryId, agent.name, agent.description, JSON.stringify(agent)]);
    }
  }

  async saveFeedback(records: ExternalAgentFeedbackRecord[]): Promise<void> {
    for (const record of records) {
      await this.database.query(`
        insert into external_feedback_records (
          feedback_id, agent_id, source, chain_id, token_id, external_user_id, score, comment, external_created_at, payload
        ) values ($1,$2,'8004scan',$3,$4,$5,$6,$7,$8,$9::jsonb)
        on conflict (feedback_id) do update set score = excluded.score, comment = excluded.comment, payload = excluded.payload, synced_at = now()
      `, [
        record.feedbackId,
        `erc8004:${record.chainId}:${record.agentId}`,
        record.chainId,
        record.agentId,
        record.externalUserId ?? null,
        record.score ?? null,
        record.comment ?? null,
        record.createdAt ?? null,
        JSON.stringify(record),
      ]);
    }
  }

  async getAgent(chainId: AgentRegistryChainId, agentId: string): Promise<DiscoveredAgent | undefined> {
    const result = await this.database.query("select payload from agent_discovery_cache where agent_id = $1", [`erc8004:${chainId}:${agentId}`]);
    return result.rows[0]?.payload as DiscoveredAgent | undefined;
  }

  async listAgents(chainId: AgentRegistryChainId, limit: number): Promise<DiscoveredAgent[]> {
    const result = await this.database.query(`
      select payload from agent_discovery_cache
      where (payload->'identity'->>'chainId')::int = $1
      order by synced_at desc limit $2
    `, [chainId, limit]);
    return result.rows.map((row) => row.payload as DiscoveredAgent);
  }
}

export interface AgentRegistryReader {
  getStatus(): Promise<AgentRegistryStatus>;
  listAgents(input?: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string; protocol?: string }): Promise<AgentDiscoveryPage>;
  searchAgents(query: string, input?: { chainId?: AgentRegistryChainId; limit?: number; semanticWeight?: number }): Promise<AgentDiscoveryPage>;
  getAgent(chainId: AgentRegistryChainId, agentId: string): Promise<DiscoveredAgent>;
  getAgentsByOwner(address: string, input?: { page?: number; limit?: number }): Promise<AgentDiscoveryPage>;
  getFeedback(chainId: AgentRegistryChainId, agentId: string, input?: { page?: number; limit?: number }): Promise<ExternalAgentFeedbackPage>;
  verifyIdentity(chainId: AgentRegistryChainId, agentId: string, indexed?: DiscoveredAgent): Promise<AgentCanonicalVerification>;
}

export interface CreateAgentRegistryOptions {
  defaultChainId?: AgentRegistryChainId;
  apiBaseUrl?: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  chainReaders: Partial<Record<AgentRegistryChainId, BscChainReader>>;
  store?: AgentRegistryStore;
}

function positiveInt(value: number | undefined, fallback: number, max = 100): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw new AgentRegistryError(`Expected an integer between 1 and ${max}.`, "INVALID_INPUT");
  return value;
}

function asAgentRegistryChainId(value: number): AgentRegistryChainId {
  if (value !== 56 && value !== 97) throw new AgentRegistryError(`Spotriq agent discovery currently supports BSC chain IDs 56 and 97, received ${value}.`, "UNSUPPORTED_CHAIN");
  return value;
}

function normalizeAddress(value?: string): string | undefined {
  if (!value) return undefined;
  try { return getAddress(value).toLowerCase(); } catch { return undefined; }
}

function registrationIdentifier(chainId: AgentRegistryChainId, registryAddress: string): string {
  return `eip155:${chainId}:${registryAddress}`;
}

function globalAgentIdentifier(chainId: AgentRegistryChainId, registryAddress: string, agentId: string): string {
  return `${registrationIdentifier(chainId, registryAddress)}:${agentId}`;
}

function decodeDataRegistration(uri?: string): { state: AgentCanonicalVerification["registrationMetadataState"]; file?: AgentRegistrationFile; limitations: string[] } {
  if (!uri) return { state: "UNAVAILABLE", limitations: ["The ERC-8004 identity did not expose an agent URI."] };
  if (!uri.startsWith("data:")) {
    return {
      state: "REMOTE_URI_NOT_FETCHED",
      limitations: ["Spotriq did not server-fetch this remote agent URI in this milestone; 8004scan metadata remains external indexed evidence."],
    };
  }
  try {
    const comma = uri.indexOf(",");
    if (comma < 0) throw new Error("Malformed data URI");
    const header = uri.slice(0, comma);
    const payload = uri.slice(comma + 1);
    const text = header.includes(";base64") ? Buffer.from(payload, "base64").toString("utf8") : decodeURIComponent(payload);
    const raw = JSON.parse(text) as Record<string, unknown>;
    const services = Array.isArray(raw.services) ? raw.services.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      if (typeof record.name !== "string" || typeof record.endpoint !== "string") return [];
      return [{
        name: record.name,
        endpoint: record.endpoint,
        version: typeof record.version === "string" ? record.version : undefined,
        skills: Array.isArray(record.skills) ? record.skills.filter((v): v is string => typeof v === "string") : undefined,
        domains: Array.isArray(record.domains) ? record.domains.filter((v): v is string => typeof v === "string") : undefined,
      } satisfies AgentRegistrationServiceEndpoint];
    }) : [];
    const registrations = Array.isArray(raw.registrations) ? raw.registrations.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      if ((typeof record.agentId !== "number" && typeof record.agentId !== "string") || typeof record.agentRegistry !== "string") return [];
      return [{ agentId: String(record.agentId), agentRegistry: record.agentRegistry }];
    }) : [];
    const supportedTrust = Array.isArray(raw.supportedTrust) ? raw.supportedTrust.filter((v): v is string => typeof v === "string") : [];
    return {
      state: "PARSED_DATA_URI",
      file: {
        type: typeof raw.type === "string" ? raw.type : undefined,
        name: typeof raw.name === "string" ? raw.name : undefined,
        description: typeof raw.description === "string" ? raw.description : undefined,
        image: typeof raw.image === "string" ? raw.image : undefined,
        services,
        x402Support: typeof raw.x402Support === "boolean" ? raw.x402Support : undefined,
        active: typeof raw.active === "boolean" ? raw.active : undefined,
        registrations,
        supportedTrust,
      },
      limitations: [],
    };
  } catch (error) {
    return { state: "INVALID", limitations: [`The onchain data URI could not be parsed: ${error instanceof Error ? error.message : String(error)}`] };
  }
}

const CATEGORY_RULES: Record<ServiceCategory, string[]> = {
  rebalancing: ["rebalanc", "concentrated liquidity", "liquidity position", "lp range", "range management", "pancakeswap lp"],
  grid: ["grid trading", "grid trader", "grid strategy", "limit order", "price grid"],
  yield: ["yield optim", "yield optimizer", "yield optimiser", "apy", "apr", "yield farming", "farm", "lending", "supply market"],
  health: ["health factor", "liquidation", "collateral", "borrow health", "borrowing risk", "venus", "lending risk"],
};

export function deriveAgentCategoryHints(input: { name?: string; description?: string; supportedProtocols?: string[]; registration?: AgentRegistrationFile }): AgentCategoryHint[] {
  const registrationText = input.registration?.services.flatMap((service) => [service.name, service.endpoint, ...(service.skills ?? []), ...(service.domains ?? [])]).join(" ") ?? "";
  const text = [input.name, input.description, ...(input.supportedProtocols ?? []), registrationText].filter(Boolean).join(" ").toLowerCase();
  const hints: AgentCategoryHint[] = [];
  for (const [category, keywords] of Object.entries(CATEGORY_RULES) as [ServiceCategory, string[]][]) {
    const matches = keywords.filter((keyword) => text.includes(keyword));
    if (!matches.length) continue;
    hints.push({
      category,
      confidence: matches.length >= 2 ? "high" : "medium",
      basis: matches.slice(0, 4),
      provenance: "operator-claimed",
      note: "Category hint derived deterministically from registry/indexed self-description. It is not a marketplace-tested capability.",
    });
  }
  return hints;
}

function normalizeRegistrationServices(registration?: AgentRegistrationFile): AgentRegistrationServiceEndpoint[] {
  return registration?.services ?? [];
}

function createIndexedEvidence(agent: ScanAgent, chainId: AgentRegistryChainId, agentId: string): EvidenceEnvelope[] {
  const observedAt = new Date().toISOString();
  const subjectId = `erc8004:${chainId}:${agentId}`;
  const evidence: EvidenceEnvelope[] = [];
  if (agent.owner_address) evidence.push(createEvidenceEnvelope({
    subjectType: "agent_identity", subjectId, metric: "agent.indexed_owner", value: agent.owner_address,
    provenance: "external", source: DATA_SOURCES.SCAN8004, observedAt, confidence: "medium", method: EVIDENCE_METHODS.SCAN8004_DISCOVERY,
    limitation: "8004scan is an external index. Canonical ownership is verified separately against the ERC-8004 Identity Registry.",
  }));
  evidence.push(createEvidenceEnvelope({
    subjectType: "agent_identity", subjectId, metric: "agent.external_feedback_count", value: agent.total_feedbacks ?? 0,
    provenance: "external", source: DATA_SOURCES.SCAN8004, observedAt, confidence: "medium", method: EVIDENCE_METHODS.SCAN8004_DISCOVERY,
    limitation: "Feedback count is external reputation evidence and is not a Spotriq trust score or marketplace review count.",
  }));
  return evidence;
}

function normalizeScanAgent(agent: ScanAgent, expectedChainId: AgentRegistryChainId): DiscoveredAgent {
  const chainId = asAgentRegistryChainId(agent.chain_id ?? expectedChainId);
  const tokenId = String(agent.token_id ?? agent.agent_id ?? "");
  if (!/^\d+$/.test(tokenId)) throw new AgentRegistryError("8004scan returned an agent without a numeric ERC-8004 token ID.", "INDEX_UNAVAILABLE", true, agent);
  const registry = ERC8004_REGISTRIES[chainId];
  const description = agent.description?.trim() || "No registry description is currently available.";
  const supportedProtocols = (agent.supported_protocols ?? []).filter((value): value is string => typeof value === "string");
  const categoryHints = deriveAgentCategoryHints({ name: agent.name, description, supportedProtocols });
  return {
    discoveryId: `erc8004:${chainId}:${tokenId}`,
    identity: {
      namespace: "eip155",
      chainId,
      registryAddress: registry.identityRegistry,
      agentId: tokenId,
      identifier: globalAgentIdentifier(chainId, registry.identityRegistry, tokenId),
    },
    name: agent.name?.trim() || `ERC-8004 Agent #${tokenId}`,
    description,
    imageUrl: agent.image_url,
    ownerAddress: normalizeAddress(agent.owner_address),
    supportedProtocols,
    categoryHints,
    supportedTrust: [],
    registrationServices: [],
    externalReputation: {
      source: "8004scan",
      totalScore: typeof agent.total_score === "number" ? agent.total_score : undefined,
      starCount: typeof agent.star_count === "number" ? agent.star_count : undefined,
      totalFeedbacks: typeof agent.total_feedbacks === "number" ? agent.total_feedbacks : 0,
      note: "8004scan reputation metadata is External evidence. Spotriq does not convert it into a universal trust score.",
    },
    indexedAt: new Date().toISOString(),
    createdAt: agent.created_at,
    evidence: createIndexedEvidence(agent, chainId, tokenId),
    listingState: "DISCOVERED",
    marketplaceServiceState: "NOT_CREATED",
    limitations: [
      "Registry discovery proves discoverability, not financial capability, strategy quality, endpoint readiness, or permission safety.",
      "A Spotriq AgentService is created only after service/capability normalization and readiness checks in a later marketplace-supply milestone.",
    ],
  };
}

export function createAgentRegistry(options: CreateAgentRegistryOptions): AgentRegistryReader {
  const apiBaseUrl = (options.apiBaseUrl ?? "https://8004scan.io/api/v1/public").replace(/\/$/, "");
  const defaultChainId = options.defaultChainId ?? 56;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const store = options.store ?? new MemoryAgentRegistryStore();
  const responseCache = new Map<string, { expiresAt: number; value: ScanResponse<unknown> }>();
  let lastRateLimit: { limit?: number; remaining?: number; resetAt?: string } | undefined;

  async function scanRequest<T>(path: string, cacheSeconds = 0): Promise<ScanResponse<T>> {
    const cached = responseCache.get(path);
    if (cached && cached.expiresAt > Date.now()) return cached.value as ScanResponse<T>;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${apiBaseUrl}${path}`, {
        headers: options.apiKey ? { "X-API-Key": options.apiKey, accept: "application/json" } : { accept: "application/json" },
        signal: controller.signal,
      });
      const body = await response.json() as ScanResponse<T>;
      if (!response.ok || !body.success) {
        if (response.status === 404) throw new AgentRegistryError("ERC-8004 agent was not found in 8004scan.", "AGENT_NOT_FOUND", false, body);
        throw new AgentRegistryError(body.error?.message ?? `8004scan request failed with HTTP ${response.status}.`, "INDEX_UNAVAILABLE", response.status === 429 || response.status >= 500, body.error);
      }
      const headerNumber = (name: string) => { const value = response.headers.get(name); const parsed = value ? Number(value) : undefined; return Number.isFinite(parsed) ? parsed : undefined; };
      lastRateLimit = {
        limit: headerNumber("x-ratelimit-limit"),
        remaining: headerNumber("x-ratelimit-remaining"),
        resetAt: response.headers.get("x-ratelimit-reset") ?? undefined,
      };
      if (cacheSeconds > 0) responseCache.set(path, { expiresAt: Date.now() + cacheSeconds * 1000, value: body as ScanResponse<unknown> });
      return body;
    } catch (error) {
      if (error instanceof AgentRegistryError) throw error;
      throw new AgentRegistryError(`8004scan is unavailable: ${error instanceof Error ? error.message : String(error)}`, "INDEX_UNAVAILABLE", true);
    } finally {
      clearTimeout(timeout);
    }
  }

  async function saveAgentsBestEffort(agents: DiscoveredAgent[]): Promise<void> {
    try { await store.saveAgents(agents); } catch { /* live discovery remains usable if cache persistence is unavailable */ }
  }

  async function verifyIdentity(chainId: AgentRegistryChainId, agentId: string, indexed?: DiscoveredAgent): Promise<AgentCanonicalVerification> {
    const registry = ERC8004_REGISTRIES[chainId];
    const chain = options.chainReaders[chainId];
    const checkedAt = new Date().toISOString();
    if (!chain) return {
      state: "UNAVAILABLE", checkedAt, registryAddress: registry.identityRegistry,
      registrationMetadataState: "UNAVAILABLE", evidence: [],
      limitations: [`No BSC ${registry.network} chain reader is configured for canonical ERC-8004 verification.`],
    };
    try {
      const id = BigInt(agentId);
      const [ownerCall, uriCall] = await Promise.all([
        chain.callContract(registry.identityRegistry, encodeFunctionData({ abi: IDENTITY_ABI, functionName: "ownerOf", args: [id] })),
        chain.callContract(registry.identityRegistry, encodeFunctionData({ abi: IDENTITY_ABI, functionName: "tokenURI", args: [id] })),
      ]);
      const owner = decodeFunctionResult({ abi: IDENTITY_ABI, functionName: "ownerOf", data: ownerCall.data });
      const agentUri = decodeFunctionResult({ abi: IDENTITY_ABI, functionName: "tokenURI", data: uriCall.data });
      let agentWallet: string | undefined;
      try {
        const walletCall = await chain.callContract(registry.identityRegistry, encodeFunctionData({ abi: IDENTITY_ABI, functionName: "getAgentWallet", args: [id] }), ownerCall.blockNumber);
        const wallet = decodeFunctionResult({ abi: IDENTITY_ABI, functionName: "getAgentWallet", data: walletCall.data });
        if (wallet && wallet !== "0x0000000000000000000000000000000000000000") agentWallet = getAddress(wallet).toLowerCase();
      } catch { /* optional metadata */ }
      const metadata = decodeDataRegistration(agentUri);
      const identifier = registrationIdentifier(chainId, registry.identityRegistry).toLowerCase();
      const backlink = metadata.file ? metadata.file.registrations.some((item) => item.agentId === String(agentId) && item.agentRegistry.toLowerCase() === identifier) : undefined;
      const indexedOwner = normalizeAddress(indexed?.ownerAddress);
      const normalizedOwner = getAddress(owner).toLowerCase();
      const indexedOwnerMatches = indexedOwner ? indexedOwner === normalizedOwner : undefined;
      const state: AgentCanonicalVerification["state"] = indexedOwnerMatches === false || backlink === false ? "MISMATCH" : "VERIFIED";
      const chainContext = { chain: "BSC" as const, network: registry.network, chainId, blockNumber: ownerCall.blockNumber, finality: "LATEST" as const };
      const evidence: EvidenceEnvelope[] = [
        createEvidenceEnvelope({
          subjectType: "agent_identity", subjectId: `erc8004:${chainId}:${agentId}`, metric: "agent.owner", value: normalizedOwner,
          provenance: "external", source: DATA_SOURCES.ERC8004, observedAt: checkedAt, confidence: "high", chainContext, method: EVIDENCE_METHODS.ERC8004_IDENTITY,
          limitation: "Canonical ERC-8004 ownership does not prove that advertised financial capabilities are functional or safe.",
        }),
        createEvidenceEnvelope({
          subjectType: "agent_identity", subjectId: `erc8004:${chainId}:${agentId}`, metric: "agent.uri", value: agentUri,
          provenance: "external", source: DATA_SOURCES.ERC8004, observedAt: checkedAt, confidence: "high", chainContext, method: EVIDENCE_METHODS.ERC8004_IDENTITY,
        }),
      ];
      return {
        state, checkedAt, registryAddress: registry.identityRegistry, ownerAddress: normalizedOwner, indexedOwnerMatches,
        agentUri, agentWallet, registrationMetadataState: metadata.state, registrationBacklinkMatches: backlink,
        registrationFile: metadata.file, evidence,
        limitations: [
          ...metadata.limitations,
          ...(indexedOwnerMatches === false ? ["8004scan indexed owner does not match current canonical ERC-8004 owner."] : []),
          ...(backlink === false ? ["Parsed registration metadata did not link back to this exact ERC-8004 registry identity."] : []),
          "ERC-8004 identity verification does not prove service readiness, financial performance, or marketplace testing.",
        ],
      };
    } catch (error) {
      return {
        state: "UNAVAILABLE", checkedAt, registryAddress: registry.identityRegistry,
        registrationMetadataState: "UNAVAILABLE", evidence: [],
        limitations: [`Canonical ERC-8004 verification could not be completed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  async function listAgents(input: { chainId?: AgentRegistryChainId; page?: number; limit?: number; search?: string; protocol?: string } = {}): Promise<AgentDiscoveryPage> {
    const chainId = input.chainId ?? defaultChainId;
    const page = positiveInt(input.page, 1, 1_000_000);
    const limit = positiveInt(input.limit, 20);
    const params = new URLSearchParams({ chainId: String(chainId), page: String(page), limit: String(limit), sortBy: "created_at", sortOrder: "desc" });
    if (input.search?.trim()) params.set("search", input.search.trim());
    if (input.protocol?.trim()) params.set("protocol", input.protocol.trim());
    try {
      const response = await scanRequest<ScanAgent[]>(`/agents?${params.toString()}`, 60);
      const agents = response.data.map((agent) => normalizeScanAgent(agent, chainId));
      await saveAgentsBestEffort(agents);
      return {
        agents, chainId, page: response.meta?.pagination?.page ?? page, limit: response.meta?.pagination?.limit ?? limit,
        total: response.meta?.pagination?.total, hasMore: response.meta?.pagination?.hasMore,
        source: "8004scan", fetchedAt: response.meta?.timestamp ?? new Date().toISOString(),
        limitations: ["List results are external indexed discovery. Canonical onchain verification is performed on individual agent detail requests."],
      };
    } catch (error) {
      if (error instanceof AgentRegistryError && error.code === "INDEX_UNAVAILABLE") {
        const cached = await store.listAgents(chainId, limit);
        if (cached.length) return { agents: cached, chainId, page: 1, limit, total: cached.length, hasMore: false, source: "cache", fetchedAt: new Date().toISOString(), limitations: ["8004scan was unavailable; showing previously cached discoveries."] };
      }
      throw error;
    }
  }

  async function searchAgents(query: string, input: { chainId?: AgentRegistryChainId; limit?: number; semanticWeight?: number } = {}): Promise<AgentDiscoveryPage> {
    if (!query.trim()) throw new AgentRegistryError("Search query is required.", "INVALID_INPUT");
    const chainId = input.chainId ?? defaultChainId;
    const limit = positiveInt(input.limit, 20);
    const semanticWeight = input.semanticWeight ?? 0.5;
    if (!Number.isFinite(semanticWeight) || semanticWeight < 0 || semanticWeight > 1) throw new AgentRegistryError("semanticWeight must be between 0 and 1.", "INVALID_INPUT");
    const params = new URLSearchParams({ q: query.trim(), chainId: String(chainId), limit: String(limit), semanticWeight: String(semanticWeight) });
    try {
      const response = await scanRequest<ScanAgent[]>(`/agents/search?${params.toString()}`, 45);
      const agents = response.data.map((agent) => normalizeScanAgent(agent, chainId));
      await saveAgentsBestEffort(agents);
      return { agents, chainId, page: 1, limit, total: agents.length, hasMore: false, source: "8004scan", fetchedAt: response.meta?.timestamp ?? new Date().toISOString(), limitations: ["Semantic search is provided by 8004scan and is External indexed discovery, not Spotriq ranking."] };
    } catch (error) {
      if (!(error instanceof AgentRegistryError) || error.code !== "INDEX_UNAVAILABLE") throw error;
      const fallback = await listAgents({ chainId, page: 1, limit, search: query.trim() });
      return {
        ...fallback,
        limitations: [
          ...fallback.limitations,
          "8004scan semantic search was unavailable, so Spotriq fell back to the standard indexed keyword search endpoint.",
        ],
      };
    }
  }

  async function getAgent(chainId: AgentRegistryChainId, agentId: string): Promise<DiscoveredAgent> {
    if (!/^\d+$/.test(agentId)) throw new AgentRegistryError("agentId must be a numeric ERC-8004 token ID.", "INVALID_INPUT");
    let agent: DiscoveredAgent;
    try {
      const response = await scanRequest<ScanAgent>(`/agents/${chainId}/${agentId}`, 120);
      agent = normalizeScanAgent(response.data, chainId);
    } catch (error) {
      if (error instanceof AgentRegistryError && error.code === "INDEX_UNAVAILABLE") {
        const cached = await store.getAgent(chainId, agentId);
        if (!cached) throw error;
        agent = cached;
      } else throw error;
    }
    const verification = await verifyIdentity(chainId, agentId, agent);
    const registration = verification.registrationFile;
    const enhanced: DiscoveredAgent = {
      ...agent,
      ownerAddress: verification.ownerAddress ?? agent.ownerAddress,
      active: registration?.active ?? agent.active,
      x402Support: registration?.x402Support ?? agent.x402Support,
      supportedTrust: registration?.supportedTrust ?? agent.supportedTrust,
      registrationServices: normalizeRegistrationServices(registration),
      categoryHints: deriveAgentCategoryHints({ name: registration?.name ?? agent.name, description: registration?.description ?? agent.description, supportedProtocols: agent.supportedProtocols, registration }),
      canonicalVerification: verification,
      evidence: [...agent.evidence, ...verification.evidence],
      limitations: [...agent.limitations, ...verification.limitations],
    };
    await saveAgentsBestEffort([enhanced]);
    return enhanced;
  }

  async function getAgentsByOwner(address: string, input: { page?: number; limit?: number } = {}): Promise<AgentDiscoveryPage> {
    const owner = normalizeAddress(address);
    if (!owner) throw new AgentRegistryError("Owner address must be a valid EVM address.", "INVALID_INPUT");
    const page = positiveInt(input.page, 1, 1_000_000);
    const limit = positiveInt(input.limit, 20);
    const params = new URLSearchParams({ page: String(page), limit: String(limit), sortBy: "created_at", sortOrder: "desc" });
    const response = await scanRequest<ScanAgent[]>(`/accounts/${owner}/agents?${params.toString()}`, 60);
    const agents = response.data.flatMap((agent) => {
      try {
        const chainId = asAgentRegistryChainId(agent.chain_id ?? defaultChainId);
        if (chainId !== defaultChainId) return [];
        return [normalizeScanAgent(agent, chainId)];
      } catch { return []; }
    });
    await saveAgentsBestEffort(agents);
    return { agents, chainId: defaultChainId, page, limit, total: response.meta?.pagination?.total, hasMore: response.meta?.pagination?.hasMore, source: "8004scan", fetchedAt: response.meta?.timestamp ?? new Date().toISOString(), limitations: ["Owner results can span chains in the upstream index; Spotriq retains only the configured BSC discovery chain in this response."] };
  }

  async function getFeedback(chainId: AgentRegistryChainId, agentId: string, input: { page?: number; limit?: number } = {}): Promise<ExternalAgentFeedbackPage> {
    if (!/^\d+$/.test(agentId)) throw new AgentRegistryError("agentId must be numeric.", "INVALID_INPUT");
    const page = positiveInt(input.page, 1, 1_000_000);
    const limit = positiveInt(input.limit, 20);
    const params = new URLSearchParams({ chainId: String(chainId), tokenId: agentId, page: String(page), limit: String(limit) });
    const response = await scanRequest<ScanFeedback[]>(`/feedbacks?${params.toString()}`, 60);
    const records = response.data.map((item, index): ExternalAgentFeedbackRecord => ({
      feedbackId: item.id ?? `8004scan:${chainId}:${agentId}:${page}:${index}`,
      source: "8004scan", chainId, agentId,
      externalUserId: item.user_id,
      score: typeof item.score === "number" ? item.score : undefined,
      comment: item.comment,
      createdAt: item.created_at,
      provenance: "external",
      note: "External ERC-8004 feedback indexed by 8004scan. It is not a verified Spotriq marketplace review and may be vulnerable to Sybil/spam effects.",
    }));
    try { await store.saveFeedback(records); } catch { /* best effort */ }
    return { feedback: records, chainId, agentId, page, limit, total: response.meta?.pagination?.total, hasMore: response.meta?.pagination?.hasMore, fetchedAt: response.meta?.timestamp ?? new Date().toISOString() };
  }

  async function getStatus(): Promise<AgentRegistryStatus> {
    let indexState: AgentRegistryStatus["indexState"] = "AVAILABLE";
    try { await scanRequest<unknown[]>("/chains", 60); } catch { indexState = "UNAVAILABLE"; }
    return {
      provider: "8004scan + ERC-8004",
      defaultDiscoveryChainId: defaultChainId,
      apiBaseUrl,
      apiKeyConfigured: Boolean(options.apiKey),
      indexState,
      canonicalVerification: "ENABLED",
      registries: ([56, 97] as AgentRegistryChainId[]).map((chainId) => ({ chainId, network: ERC8004_REGISTRIES[chainId].network, identityRegistry: ERC8004_REGISTRIES[chainId].identityRegistry, reputationRegistry: ERC8004_REGISTRIES[chainId].reputationRegistry })),
      checkedAt: new Date().toISOString(),
      lastRateLimit,
      limitations: [
        "8004scan data is External indexed evidence; canonical identity is verified separately onchain when an agent detail is requested.",
        "ERC-8004 registration does not prove service functionality, financial performance, safety, or Spotriq readiness.",
        options.apiKey ? "8004scan API key configured." : "No 8004scan API key configured; anonymous public rate limits apply.",
      ],
    };
  }

  return { getStatus, listAgents, searchAgents, getAgent, getAgentsByOwner, getFeedback, verifyIdentity };
}
