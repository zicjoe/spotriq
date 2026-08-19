import { createHash, randomUUID } from "node:crypto";
import type {
  BscNetwork,
  ChainEvidenceContext,
  DataSourceDefinition,
  EvidenceConflict,
  EvidenceEnvelope,
  EvidenceMethodDefinition,
  EvidenceProvenance,
  FreshnessAssessment,
  FreshnessPolicy,
  TruthLayer,
} from "@spotriq/domain";

export const DATA_SOURCES = {
  BSC_RPC: {
    sourceId: "bsc-rpc",
    name: "BNB Smart Chain JSON-RPC",
    truthLayer: "CANONICAL_ONCHAIN",
    provider: "BNB Smart Chain",
    chain: "BSC",
    networks: ["testnet", "mainnet"],
    description: "Canonical BSC chain state read through standard JSON-RPC endpoints.",
  },
  PANCAKESWAP: {
    sourceId: "pancakeswap",
    name: "PancakeSwap",
    truthLayer: "PROTOCOL_STATE",
    provider: "PancakeSwap",
    chain: "BSC",
    networks: ["testnet", "mainnet"],
    description: "Normalized PancakeSwap V3 and Infinity CL protocol state read through Spotriq protocol adapters.",
  },
  VENUS: {
    sourceId: "venus",
    name: "Venus Protocol",
    truthLayer: "PROTOCOL_STATE",
    provider: "Venus",
    chain: "BSC",
    networks: ["testnet", "mainnet"],
    description: "Normalized Venus lending state. Adapter introduced in a later milestone.",
  },
  ERC8004: {
    sourceId: "erc8004",
    name: "ERC-8004 Registry",
    truthLayer: "CANONICAL_ONCHAIN",
    provider: "ERC-8004",
    chain: "BSC",
    networks: ["testnet", "mainnet"],
    description: "Canonical onchain agent identity/registry evidence.",
  },
  SCAN8004: {
    sourceId: "8004scan",
    name: "8004scan",
    truthLayer: "EXTERNAL_INDEXED",
    provider: "8004scan",
    chain: "BSC",
    networks: ["testnet", "mainnet"],
    description: "External indexed discovery and reputation evidence.",
  },
  MARKETPLACE: {
    sourceId: "spotriq-marketplace",
    name: "Spotriq Marketplace",
    truthLayer: "MARKETPLACE_OBSERVED",
    provider: "Spotriq",
    description: "Evidence observed directly by Spotriq tests, readiness checks, and production activity.",
  },
  SPOTRIQ_DERIVED: {
    sourceId: "spotriq-derived",
    name: "Spotriq Derived",
    truthLayer: "MARKETPLACE_DERIVED",
    provider: "Spotriq",
    description: "Versioned calculations produced by Spotriq from referenced protocol or marketplace evidence.",
  },
} satisfies Record<string, DataSourceDefinition>;

export const EVIDENCE_METHODS = {
  NATIVE_BALANCE: {
    methodId: "wallet.native-balance",
    version: "1.0.0",
    name: "BSC native balance read",
    description: "Reads wallet native BNB/tBNB balance from eth_getBalance at a specific observed block.",
    inputMetrics: ["wallet.address", "chain.block"],
  },
  ERC20_BALANCE: {
    methodId: "wallet.erc20-balance",
    version: "1.0.0",
    name: "ERC-20 balance read",
    description: "Reads ERC-20 balanceOf(wallet) with eth_call at a specific observed block.",
    inputMetrics: ["wallet.address", "token.address", "chain.block"],
  },
  PANCAKE_V3_POSITION: {
    methodId: "pancakeswap.v3-position",
    version: "1.0.0",
    name: "PancakeSwap V3 position read",
    description: "Reads a PancakeSwap V3 NFT position and its pool state directly from BSC contracts at one block.",
    inputMetrics: ["position.token_id", "position.owner", "pool.slot0", "pool.liquidity"],
  },
  PANCAKE_INFINITY_CL_POSITION: {
    methodId: "pancakeswap.infinity-cl-position",
    version: "1.0.0",
    name: "PancakeSwap Infinity CL position read",
    description: "Reads a PancakeSwap Infinity concentrated-liquidity NFT position and CL pool state directly from BSC contracts at one block.",
    inputMetrics: ["position.token_id", "position.owner", "pool.key", "pool.slot0", "pool.liquidity"],
  },
  PANCAKE_CL_RANGE_STATE: {
    methodId: "pancakeswap.cl-range-state",
    version: "1.0.0",
    name: "Concentrated-liquidity range classification",
    description: "Classifies a position using current tick, lower/upper ticks, liquidity, tick spacing, and a deterministic near-boundary threshold.",
    inputMetrics: ["pool.current_tick", "position.tick_lower", "position.tick_upper", "position.liquidity", "pool.tick_spacing"],
  },
  PANCAKE_CL_SQRT_PRICE: {
    methodId: "pancakeswap.cl-sqrt-price",
    version: "1.0.0",
    name: "Concentrated-liquidity current price",
    description: "Derives token0 price in token1 units from the pool's current sqrtPriceX96 adjusted for token decimals.",
    inputMetrics: ["pool.sqrt_price_x96", "token0.decimals", "token1.decimals"],
  },
} satisfies Record<string, EvidenceMethodDefinition>;

const DEFAULT_FRESHNESS_POLICY: FreshnessPolicy = {
  metric: "default",
  targetAgeSeconds: 60,
  warnAgeSeconds: 300,
  hardExpirySeconds: 900,
};

const FRESHNESS_POLICIES: Record<string, FreshnessPolicy> = {
  "chain.block": { metric: "chain.block", targetAgeSeconds: 15, warnAgeSeconds: 45, hardExpirySeconds: 120 },
  "wallet.native_balance": { metric: "wallet.native_balance", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "wallet.erc20_balance": { metric: "wallet.erc20_balance", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "transaction.state": { metric: "transaction.state", targetAgeSeconds: 15, warnAgeSeconds: 60, hardExpirySeconds: 180 },
  "permission.state": { metric: "permission.state", targetAgeSeconds: 15, warnAgeSeconds: 30, hardExpirySeconds: 60 },
  "health.position": { metric: "health.position", targetAgeSeconds: 15, warnAgeSeconds: 30, hardExpirySeconds: 60 },
  "liquidity.position": { metric: "liquidity.position", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "liquidity.range_state": { metric: "liquidity.range_state", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "pancakeswap.pool.tick": { metric: "pancakeswap.pool.tick", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "pancakeswap.pool.liquidity": { metric: "pancakeswap.pool.liquidity", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "market.current_price": { metric: "market.current_price", targetAgeSeconds: 30, warnAgeSeconds: 60, hardExpirySeconds: 120 },
  "yield.current_rate": { metric: "yield.current_rate", targetAgeSeconds: 300, warnAgeSeconds: 600, hardExpirySeconds: 900 },
  "grid.market_regime": { metric: "grid.market_regime", targetAgeSeconds: 300, warnAgeSeconds: 600, hardExpirySeconds: 900 },
};

export function listDataSources(): DataSourceDefinition[] {
  return Object.values(DATA_SOURCES).map((source) => {
    const definition: DataSourceDefinition = source;
    return { ...definition, networks: definition.networks ? [...definition.networks] : undefined };
  });
}

export function listEvidenceMethods(): EvidenceMethodDefinition[] {
  return Object.values(EVIDENCE_METHODS).map((method) => ({
    ...method,
    inputMetrics: [...method.inputMetrics],
  }));
}

export function getFreshnessPolicy(metric: string): FreshnessPolicy {
  return FRESHNESS_POLICIES[metric] ?? { ...DEFAULT_FRESHNESS_POLICY, metric };
}

export function assessFreshness(metric: string, observedAt: string | Date, now = new Date()): FreshnessAssessment {
  const policy = getFreshnessPolicy(metric);
  const observed = observedAt instanceof Date ? observedAt : new Date(observedAt);
  const ageSeconds = Math.max(0, Math.floor((now.getTime() - observed.getTime()) / 1000));
  const state = ageSeconds <= policy.targetAgeSeconds
    ? "FRESH"
    : ageSeconds <= policy.warnAgeSeconds
      ? "AGING"
      : ageSeconds <= policy.hardExpirySeconds
        ? "STALE"
        : "UNAVAILABLE";
  return { ...policy, ageSeconds, state };
}

export interface CreateEvidenceInput {
  subjectType: string;
  subjectId: string;
  metric: string;
  value: string | number;
  unit?: string;
  provenance: EvidenceProvenance;
  source: DataSourceDefinition;
  sourceRef?: string;
  observedAt?: string;
  effectiveAt?: string;
  confidence?: "high" | "medium" | "low" | "unavailable";
  method?: EvidenceMethodDefinition;
  methodInputs?: string[];
  period?: string;
  sampleSize?: number;
  limitation?: string;
  chainContext?: ChainEvidenceContext;
}

export function createEvidenceEnvelope(input: CreateEvidenceInput): EvidenceEnvelope {
  const observedAt = input.observedAt ?? new Date().toISOString();
  const freshnessAssessment = assessFreshness(input.metric, observedAt);
  return {
    evidenceId: `ev_${randomUUID()}`,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    metric: input.metric,
    value: input.value,
    unit: input.unit,
    provenance: input.provenance,
    sourceName: input.source.name,
    sourceId: input.source.sourceId,
    truthLayer: input.source.truthLayer,
    sourceRef: input.sourceRef,
    observedAt,
    effectiveAt: input.effectiveAt,
    confidence: input.confidence,
    methodVersion: input.method ? `${input.method.methodId}@${input.method.version}` : undefined,
    methodInputs: input.methodInputs,
    period: input.period,
    sampleSize: input.sampleSize,
    limitation: input.limitation,
    freshnessAssessment,
    availability: freshnessAssessment.state === "UNAVAILABLE" ? "STALE" : "AVAILABLE",
    chainContext: input.chainContext,
  };
}

function comparableValue(value: string | number): string {
  return typeof value === "number" ? String(value) : value.trim().toLowerCase();
}

export function detectEvidenceConflicts(records: EvidenceEnvelope[], detectedAt = new Date().toISOString()): EvidenceConflict[] {
  const groups = new Map<string, EvidenceEnvelope[]>();
  for (const record of records) {
    if (record.availability !== "AVAILABLE") continue;
    const key = JSON.stringify([record.subjectType, record.subjectId, record.metric]);
    const existing = groups.get(key) ?? [];
    existing.push(record);
    groups.set(key, existing);
  }

  const conflicts: EvidenceConflict[] = [];
  for (const [key, group] of groups) {
    if (group.length < 2) continue;
    const values = new Set(group.map((record) => comparableValue(record.value)));
    if (values.size < 2) continue;
    const [subjectType, subjectId, metric] = JSON.parse(key) as [string, string, string];
    const digest = createHash("sha256").update(group.map((record) => record.evidenceId).sort().join("|")).digest("hex").slice(0, 16);
    conflicts.push({
      conflictId: `conflict_${digest}`,
      subjectType,
      subjectId,
      metric,
      evidenceIds: group.map((record) => record.evidenceId),
      detectedAt,
      description: `Conflicting current evidence exists for ${subjectType} ${subjectId} metric ${metric}.`,
    });
  }
  return conflicts;
}

export function marketplaceProvenanceForTruthLayer(layer: TruthLayer): EvidenceProvenance {
  switch (layer) {
    case "MARKETPLACE_OBSERVED": return "marketplace-observed";
    case "MARKETPLACE_DERIVED": return "marketplace-derived";
    case "OPERATOR_SUPPLIED": return "operator-claimed";
    default: return "external";
  }
}

export function bscSourceRef(network: BscNetwork, blockNumber?: string, transactionHash?: string): string {
  const base = network === "mainnet" ? "https://bscscan.com" : "https://testnet.bscscan.com";
  if (transactionHash) return `${base}/tx/${transactionHash}`;
  if (blockNumber) return `${base}/block/${blockNumber}`;
  return base;
}
