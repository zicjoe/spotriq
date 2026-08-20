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
    description: "Normalized Venus Core Pool and Isolated Pool lending state read through the Spotriq Venus adapter.",
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
  VENUS_ACCOUNT_LIQUIDITY: {
    methodId: "venus.account-liquidity",
    version: "1.0.0",
    name: "Venus account liquidity read",
    description: "Reads Venus Comptroller account liquidity and shortfall at one BSC block. Protocol shortfall is treated as the canonical liquidation-risk signal.",
    inputMetrics: ["comptroller.getAccountLiquidity", "chain.block"],
  },
  VENUS_MARKET_POSITION: {
    methodId: "venus.market-position",
    version: "1.0.0",
    name: "Venus market position read",
    description: "Reads a wallet's vToken balance, borrow balance, exchange rate, collateral membership, risk parameters, and underlying oracle price for a Venus market.",
    inputMetrics: ["vToken.getAccountSnapshot", "comptroller.getAssetsIn", "comptroller.markets", "oracle.getUnderlyingPrice"],
  },
  VENUS_SUPPLY_APY: {
    methodId: "venus.supply-apy",
    version: "1.0.0",
    name: "Venus current base supply APY",
    description: "Derives a current base supply APY from vToken.supplyRatePerBlock using Venus-documented BNB Chain block-frequency and daily-compounding assumptions. Incentives, Prime rewards, agent fees, gas, and realised returns are excluded.",
    inputMetrics: ["vToken.supplyRatePerBlock", "bnb.blocks_per_day"],
  },
  VENUS_HEALTH_FACTOR: {
    methodId: "venus.health-factor",
    version: "1.0.0",
    name: "Spotriq Venus health factor",
    description: "Derives an explanatory health ratio from Venus canonical account liquidity/shortfall plus observed debt valuation. Canonical Venus shortfall and forced-liquidation configuration take precedence.",
    inputMetrics: ["venus.market-position", "venus.account-liquidity"],
  },
  GRID_MARKET_REGIME: {
    methodId: "grid.market-regime",
    version: "1.0.0",
    name: "PancakeSwap V3 TWAP market-regime context",
    description: "Classifies supported Grid market context from current PancakeSwap V3 price plus available 1h/6h/24h onchain TWAP observations. TWAP dispersion is not realised volatility or a profitability forecast.",
    inputMetrics: ["market.current_price", "pancakeswap.v3.twap.1h", "pancakeswap.v3.twap.6h", "pancakeswap.v3.twap.24h"],
  },
  ERC8004_IDENTITY: {
    methodId: "erc8004.identity",
    version: "1.0.0",
    name: "ERC-8004 canonical identity verification",
    description: "Reads current owner and agent URI directly from the ERC-8004 Identity Registry on BSC. Identity verification does not prove advertised capabilities or service safety.",
    inputMetrics: ["erc8004.ownerOf", "erc8004.tokenURI", "chain.block"],
  },
  SCAN8004_DISCOVERY: {
    methodId: "8004scan.discovery",
    version: "1.0.0",
    name: "8004scan indexed discovery",
    description: "Normalizes ERC-8004 agent discovery and external feedback indexed by 8004scan. Indexed metadata remains External evidence and operator claims remain claims.",
    inputMetrics: ["8004scan.agent", "8004scan.feedback"],
  },
  AGENT_SERVICE_NORMALIZATION: {
    methodId: "marketplace.agent-service-normalization",
    version: "1.0.0",
    name: "Agent service normalization",
    description: "Deterministically converts ERC-8004 identity self-description and service endpoints into Spotriq listing/service candidates while preserving operator-claimed provenance.",
    inputMetrics: ["erc8004.identity", "agent.category_hint", "agent.registration_services", "agent.supported_protocols"],
  },
  SERVICE_READINESS: {
    methodId: "marketplace.service-readiness",
    version: "1.0.0",
    name: "Marketplace service readiness",
    description: "Evaluates deterministic readiness gates for identity verification, BSC network, active metadata, machine-callable endpoint presence, declared authority requirements, and marketplace test coverage. It never infers financial performance.",
    inputMetrics: ["service.identity_state", "service.network", "service.active", "service.runtime_endpoint", "service.permission_profile", "service.test_coverage"],
  },
  MARKETPLACE_TEST_LAB: {
    methodId: "marketplace.test-lab",
    version: "1.0.0",
    name: "Marketplace runtime contract verification",
    description: "Performs bounded, non-financial runtime checks against declared A2A or MCP endpoints: endpoint safety policy, reachability, protocol discovery/contract validation, and category-relevant machine capability observation. It does not execute financial actions or infer performance.",
    inputMetrics: ["service.runtime_endpoint", "service.category", "runtime.protocol_discovery", "runtime.capability_catalog"],
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
  "agent.indexed_owner": { metric: "agent.indexed_owner", targetAgeSeconds: 1800, warnAgeSeconds: 3600, hardExpirySeconds: 21600 },
  "agent.external_feedback_count": { metric: "agent.external_feedback_count", targetAgeSeconds: 1800, warnAgeSeconds: 3600, hardExpirySeconds: 21600 },
  "agent.owner": { metric: "agent.owner", targetAgeSeconds: 3600, warnAgeSeconds: 21600, hardExpirySeconds: 86400 },
  "agent.uri": { metric: "agent.uri", targetAgeSeconds: 3600, warnAgeSeconds: 21600, hardExpirySeconds: 86400 },
  "service.normalization": { metric: "service.normalization", targetAgeSeconds: 900, warnAgeSeconds: 3600, hardExpirySeconds: 21600 },
  "service.readiness": { metric: "service.readiness", targetAgeSeconds: 300, warnAgeSeconds: 900, hardExpirySeconds: 3600 },
  "service.runtime_reachability": { metric: "service.runtime_reachability", targetAgeSeconds: 300, warnAgeSeconds: 900, hardExpirySeconds: 3600 },
  "service.protocol_contract": { metric: "service.protocol_contract", targetAgeSeconds: 300, warnAgeSeconds: 900, hardExpirySeconds: 3600 },
  "service.category_capability": { metric: "service.category_capability", targetAgeSeconds: 300, warnAgeSeconds: 900, hardExpirySeconds: 3600 },
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
