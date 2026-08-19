import type { Abi, Address, Hex } from "viem";
import { decodeFunctionResult, encodeAbiParameters, encodeFunctionData, keccak256 } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import type {
  BscNetwork,
  EvidenceEnvelope,
  LiquidityRangeState,
  PancakeSwapClPoolSnapshot,
  PancakeSwapClPositionSnapshot,
  PancakeSwapContractSet,
  PancakeSwapProtocolVersion,
  PancakeSwapWalletPositionsSnapshot,
  ProtocolTokenMetadata,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import {
  erc20MetadataAbi,
  pancakeInfinityClPoolManagerAbi,
  pancakeInfinityClPositionManagerAbi,
  pancakeV3FactoryAbi,
  pancakeV3PoolAbi,
  pancakeV3PositionManagerAbi,
} from "./abis.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const PANCAKESWAP_CONTRACTS: Record<BscNetwork, PancakeSwapContractSet> = {
  mainnet: {
    network: "mainnet",
    v3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    v3PositionManager: "0x46A15B0b27311cedF172AB29E4f4766fbE7F4364",
    infinityVault: "0x238a358808379702088667322f80aC48bAd5e6c4",
    infinityClPoolManager: "0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b",
    infinityClPositionManager: "0x55f4c8abA71A1e923edC303eb4fEfF14608cC226",
  },
  testnet: {
    network: "testnet",
    v3Factory: "0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865",
    v3PositionManager: "0x427bF5b37357632377eCbEC9de3626C71A5396c1",
    infinityVault: "0x2CdB3EC82EE13d341Dc6E73637BE0Eab79cb79dD",
    infinityClPoolManager: "0x36A12c70c9Cf64f24E89ee132BF93Df2DCD199d4",
    infinityClPositionManager: "0x77DedB52EC6260daC4011313DBEE09616d30d122",
  },
};

export type PancakeSwapAdapterErrorCode =
  | "INVALID_TOKEN_ID"
  | "POSITION_NOT_FOUND"
  | "POOL_NOT_FOUND"
  | "POOL_MANAGER_MISMATCH"
  | "CONTRACT_READ_FAILED"
  | "WALLET_DISCOVERY_FAILED";

export class PancakeSwapAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: PancakeSwapAdapterErrorCode,
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "PancakeSwapAdapterError";
  }
}

export interface PancakeSwapStatus {
  protocol: "PancakeSwap";
  network: BscNetwork;
  chainId: number;
  contracts: PancakeSwapContractSet;
  capabilities: {
    v3WalletDiscovery: true;
    v3PositionRead: true;
    infinityClPositionReadByTokenId: true;
    infinityClWalletDiscovery: false;
    positionValuation: false;
    historicalAnalytics: false;
    v3OracleTwap: true;
  };
  coverageNotes: string[];
}

export interface PancakeSwapV3OracleObservation {
  poolAddress: string;
  secondsAgo: number;
  averageTick: number;
  averagePriceToken0InToken1?: string;
  blockNumber: string;
  observedAt: string;
}

export interface PancakeSwapReader {
  getStatus(): PancakeSwapStatus;
  getV3Pool(poolAddress: string, blockNumber?: string): Promise<PancakeSwapClPoolSnapshot>;
  findBestV3Pool(tokenA: string, tokenB: string, feeCandidates?: number[], blockNumber?: string): Promise<PancakeSwapClPoolSnapshot | undefined>;
  observeV3Pool(poolAddress: string, secondsAgo: number, blockNumber?: string): Promise<PancakeSwapV3OracleObservation>;
  getV3Position(tokenId: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot>;
  getInfinityClPosition(tokenId: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot>;
  getPosition(version: PancakeSwapProtocolVersion, tokenId: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot>;
  getWalletPositions(walletAddress: string, maxPositions?: number): Promise<PancakeSwapWalletPositionsSnapshot>;
}

export interface PancakeSwapAdapterOptions {
  chain: BscChainReader;
  maxWalletPositions?: number;
}

interface ReadResult<T = unknown> {
  result: T;
  blockNumber: string;
}

interface V3PositionTuple {
  nonce: bigint;
  operator: Address;
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  tokensOwed0: bigint;
  tokensOwed1: bigint;
}

interface InfinityPositionTuple {
  poolKey: {
    currency0: Address;
    currency1: Address;
    hooks: Address;
    poolManager: Address;
    fee: number;
    parameters: Hex;
  };
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
  feeGrowthInside0LastX128: bigint;
  feeGrowthInside1LastX128: bigint;
  subscriber: Address;
}

function normalizeAddress(value: string): string {
  return value.toLowerCase();
}

function explorerAddressRef(network: BscNetwork, address: string): string {
  const base = network === "mainnet" ? "https://bscscan.com" : "https://testnet.bscscan.com";
  return `${base}/address/${address}`;
}

function assertTokenId(value: string | number | bigint): bigint {
  try {
    const tokenId = BigInt(value);
    if (tokenId < 0n) throw new Error("negative");
    return tokenId;
  } catch {
    throw new PancakeSwapAdapterError(`Invalid PancakeSwap position token ID: ${String(value)}`, "INVALID_TOKEN_ID");
  }
}

function toNumber(value: bigint | number): number {
  if (typeof value === "number") return value;
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new PancakeSwapAdapterError("Contract value exceeds JavaScript safe integer range.", "CONTRACT_READ_FAILED");
  }
  return Number(value);
}

export function decodeInfinityTickSpacing(parameters: Hex): number {
  const raw = (BigInt(parameters) >> 16n) & 0xffffffn;
  return Number(raw >= 0x800000n ? raw - 0x1000000n : raw);
}

export function computeInfinityPoolId(poolKey: {
  currency0: Address;
  currency1: Address;
  hooks: Address;
  poolManager: Address;
  fee: number;
  parameters: Hex;
}): Hex {
  const encodedPoolKey = encodeAbiParameters(
    [
      { type: "address" },
      { type: "address" },
      { type: "address" },
      { type: "address" },
      { type: "uint24" },
      { type: "bytes32" },
    ],
    [poolKey.currency0, poolKey.currency1, poolKey.hooks, poolKey.poolManager, poolKey.fee, poolKey.parameters],
  );
  return keccak256(encodedPoolKey);
}

function stringifyPrice(value: number): string | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  if (value >= 1e9 || value < 1e-8) return value.toExponential(10);
  return Number(value.toPrecision(12)).toString();
}

async function mapWithConcurrency<T, R>(items: readonly T[], concurrency: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function deriveTickPrice(currentTick: number, token0Decimals?: number, token1Decimals?: number): string | undefined {
  if (token0Decimals === undefined || token1Decimals === undefined) return undefined;
  const rawRatio = Math.pow(1.0001, currentTick);
  const decimalScale = Math.pow(10, token0Decimals - token1Decimals);
  return stringifyPrice(rawRatio * decimalScale);
}

export function averageTickFromCumulatives(delta: bigint, secondsAgo: number): number {
  if (!Number.isInteger(secondsAgo) || secondsAgo <= 0) {
    throw new PancakeSwapAdapterError("secondsAgo must be a positive integer.", "CONTRACT_READ_FAILED");
  }
  const seconds = BigInt(secondsAgo);
  let averageTick = delta / seconds;
  // Solidity integer division truncates toward zero. V3 oracle arithmetic needs floor toward -∞.
  if (delta < 0n && delta % seconds !== 0n) averageTick -= 1n;
  return toNumber(averageTick);
}

export function deriveSqrtPriceX96Price(sqrtPriceX96: bigint | string, token0Decimals?: number, token1Decimals?: number): string | undefined {
  if (token0Decimals === undefined || token1Decimals === undefined) return undefined;
  const sqrt = Number(typeof sqrtPriceX96 === "string" ? BigInt(sqrtPriceX96) : sqrtPriceX96);
  const q96 = Math.pow(2, 96);
  const rawRatio = Math.pow(sqrt / q96, 2);
  const decimalScale = Math.pow(10, token0Decimals - token1Decimals);
  return stringifyPrice(rawRatio * decimalScale);
}

export function classifyLiquidityRange(
  currentTick: number,
  tickLower: number,
  tickUpper: number,
  tickSpacing: number,
  liquidityRaw: bigint | string,
): LiquidityRangeState {
  const liquidity = typeof liquidityRaw === "string" ? BigInt(liquidityRaw) : liquidityRaw;
  if (liquidity === 0n) return "NO_LIQUIDITY";
  if (currentTick < tickLower) return "OUT_OF_RANGE_BELOW";
  if (currentTick >= tickUpper) return "OUT_OF_RANGE_ABOVE";

  const width = Math.max(1, tickUpper - tickLower);
  const nearBoundaryTicks = Math.max(Math.abs(tickSpacing) * 2, Math.floor(width * 0.1));
  const lowerDistance = currentTick - tickLower;
  const upperDistance = tickUpper - currentTick;
  if (lowerDistance <= nearBoundaryTicks && lowerDistance <= upperDistance) return "NEAR_LOWER";
  if (upperDistance <= nearBoundaryTicks) return "NEAR_UPPER";
  return "IN_RANGE";
}

function makeChainContext(chain: BscChainReader, blockNumber: string) {
  return {
    chain: "BSC" as const,
    network: chain.network,
    chainId: chain.definition.chainId,
    blockNumber,
    finality: "LATEST" as const,
  };
}

export class PancakeSwapAdapter {
  readonly protocol = "PancakeSwap" as const;
  readonly network: BscNetwork;
  readonly contracts: PancakeSwapContractSet;
  private readonly chain: BscChainReader;
  private readonly maxWalletPositions: number;

  constructor(options: PancakeSwapAdapterOptions) {
    this.chain = options.chain;
    this.network = options.chain.network;
    this.contracts = PANCAKESWAP_CONTRACTS[this.network];
    this.maxWalletPositions = Math.max(1, Math.min(options.maxWalletPositions ?? 50, 100));
  }

  getStatus(): PancakeSwapStatus {
    return {
      protocol: "PancakeSwap",
      network: this.network,
      chainId: this.chain.definition.chainId,
      contracts: { ...this.contracts },
      capabilities: {
        v3WalletDiscovery: true,
        v3PositionRead: true,
        infinityClPositionReadByTokenId: true,
        infinityClWalletDiscovery: false,
        positionValuation: false,
        historicalAnalytics: false,
        v3OracleTwap: true,
      },
      coverageNotes: [
        "PancakeSwap V3 concentrated-liquidity NFTs can be discovered directly from the official V3 position manager.",
        "Infinity CL positions can be read by token ID from the official CL position manager; wallet-wide Infinity discovery requires an indexed event source and is intentionally not guessed from public RPC state.",
        "Current range state is deterministic from protocol ticks. V3 oracle TWAP observations are available when the pool has sufficient observation history. USD valuation and historical performance are not inferred from TWAP data.",
      ],
    };
  }

  private async read(abi: Abi, functionName: string, args: readonly unknown[], to: string, blockNumber?: string): Promise<ReadResult> {
    try {
      const data = encodeFunctionData({ abi, functionName, args } as never);
      const call = await this.chain.callContract(to, data, blockNumber);
      const result = decodeFunctionResult({ abi, functionName, data: call.data as Hex } as never);
      return { result, blockNumber: call.blockNumber };
    } catch (error) {
      if (error instanceof PancakeSwapAdapterError) throw error;
      throw new PancakeSwapAdapterError(
        `PancakeSwap contract read ${functionName} failed.`,
        "CONTRACT_READ_FAILED",
        true,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  private async getTokenMetadata(address: string, blockNumber: string): Promise<{ token: ProtocolTokenMetadata; complete: boolean }> {
    const normalized = normalizeAddress(address);
    if (normalized === ZERO_ADDRESS) {
      return {
        token: {
          address: ZERO_ADDRESS,
          symbol: this.chain.definition.nativeSymbol,
          name: this.chain.network === "mainnet" ? "BNB" : "Testnet BNB",
          decimals: 18,
          isNative: true,
        },
        complete: true,
      };
    }

    const [decimals, symbol, name] = await Promise.allSettled([
      this.read(erc20MetadataAbi, "decimals", [], normalized, blockNumber),
      this.read(erc20MetadataAbi, "symbol", [], normalized, blockNumber),
      this.read(erc20MetadataAbi, "name", [], normalized, blockNumber),
    ]);
    const token: ProtocolTokenMetadata = { address: normalized, isNative: false };
    if (decimals.status === "fulfilled") token.decimals = toNumber(decimals.value.result as bigint | number);
    if (symbol.status === "fulfilled") token.symbol = String(symbol.value.result);
    if (name.status === "fulfilled") token.name = String(name.value.result);
    return { token, complete: decimals.status === "fulfilled" && symbol.status === "fulfilled" && name.status === "fulfilled" };
  }

  private evidenceForPosition(input: {
    version: PancakeSwapProtocolVersion;
    tokenId: string;
    owner: string;
    positionManager: string;
    blockNumber: string;
    observedAt: string;
    currentTick: number;
    sqrtPriceX96: string;
    poolLiquidityRaw: string;
    positionLiquidityRaw: string;
    tickLower: number;
    tickUpper: number;
    tickSpacing: number;
    rangeState: LiquidityRangeState;
    currentPrice?: string;
  }): EvidenceEnvelope[] {
    const method = input.version === "V3" ? EVIDENCE_METHODS.PANCAKE_V3_POSITION : EVIDENCE_METHODS.PANCAKE_INFINITY_CL_POSITION;
    const directRef = explorerAddressRef(this.network, input.positionManager);
    const chainContext = makeChainContext(this.chain, input.blockNumber);
    const records: EvidenceEnvelope[] = [
      createEvidenceEnvelope({
        subjectType: "liquidity-position",
        subjectId: `${input.version}:${input.tokenId}`,
        metric: "liquidity.position",
        value: input.positionLiquidityRaw,
        unit: "liquidity-raw",
        provenance: "external",
        source: DATA_SOURCES.PANCAKESWAP,
        sourceRef: directRef,
        observedAt: input.observedAt,
        confidence: "high",
        method,
        methodInputs: [input.owner, input.tokenId, input.blockNumber],
        chainContext,
      }),
      createEvidenceEnvelope({
        subjectType: "liquidity-position",
        subjectId: `${input.version}:${input.tokenId}`,
        metric: "pancakeswap.pool.tick",
        value: input.currentTick,
        unit: "tick",
        provenance: "external",
        source: DATA_SOURCES.PANCAKESWAP,
        sourceRef: directRef,
        observedAt: input.observedAt,
        confidence: "high",
        method,
        methodInputs: [input.blockNumber],
        chainContext,
      }),
      createEvidenceEnvelope({
        subjectType: "liquidity-position",
        subjectId: `${input.version}:${input.tokenId}`,
        metric: "pancakeswap.pool.liquidity",
        value: input.poolLiquidityRaw,
        unit: "liquidity-raw",
        provenance: "external",
        source: DATA_SOURCES.PANCAKESWAP,
        sourceRef: directRef,
        observedAt: input.observedAt,
        confidence: "high",
        method,
        methodInputs: [input.blockNumber],
        chainContext,
      }),
      createEvidenceEnvelope({
        subjectType: "liquidity-position",
        subjectId: `${input.version}:${input.tokenId}`,
        metric: "liquidity.range_state",
        value: input.rangeState,
        provenance: "marketplace-derived",
        source: DATA_SOURCES.SPOTRIQ_DERIVED,
        observedAt: input.observedAt,
        confidence: "high",
        method: EVIDENCE_METHODS.PANCAKE_CL_RANGE_STATE,
        methodInputs: [String(input.currentTick), String(input.tickLower), String(input.tickUpper), input.positionLiquidityRaw, String(input.tickSpacing)],
        chainContext,
      }),
    ];
    if (input.currentPrice) {
      records.push(createEvidenceEnvelope({
        subjectType: "liquidity-position",
        subjectId: `${input.version}:${input.tokenId}`,
        metric: "market.current_price",
        value: input.currentPrice,
        unit: "token1-per-token0",
        provenance: "marketplace-derived",
        source: DATA_SOURCES.SPOTRIQ_DERIVED,
        observedAt: input.observedAt,
        confidence: "high",
        method: EVIDENCE_METHODS.PANCAKE_CL_SQRT_PRICE,
        methodInputs: [input.sqrtPriceX96],
        chainContext,
      }));
    }
    return records;
  }

  async getV3Position(tokenIdInput: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot> {
    const tokenId = assertTokenId(tokenIdInput);
    const observedBlock = blockNumber ?? await this.chain.getBlockNumber();
    const observedAt = new Date().toISOString();

    const [ownerRead, positionRead] = await Promise.all([
      this.read(pancakeV3PositionManagerAbi, "ownerOf", [tokenId], this.contracts.v3PositionManager, observedBlock),
      this.read(pancakeV3PositionManagerAbi, "positions", [tokenId], this.contracts.v3PositionManager, observedBlock),
    ]);
    const owner = normalizeAddress(String(ownerRead.result));
    const tuple = positionRead.result as readonly [bigint, Address, Address, Address, number, number, number, bigint, bigint, bigint, bigint, bigint];
    const position: V3PositionTuple = {
      nonce: tuple[0], operator: tuple[1], token0: tuple[2], token1: tuple[3], fee: tuple[4], tickLower: tuple[5], tickUpper: tuple[6],
      liquidity: tuple[7], feeGrowthInside0LastX128: tuple[8], feeGrowthInside1LastX128: tuple[9], tokensOwed0: tuple[10], tokensOwed1: tuple[11],
    };

    const poolRead = await this.read(pancakeV3FactoryAbi, "getPool", [position.token0, position.token1, position.fee], this.contracts.v3Factory, observedBlock);
    const poolAddress = normalizeAddress(String(poolRead.result));
    if (poolAddress === ZERO_ADDRESS) {
      throw new PancakeSwapAdapterError(`No PancakeSwap V3 pool exists for position ${tokenId.toString()}.`, "POOL_NOT_FOUND");
    }

    const [slot0Read, poolLiquidityRead, tickSpacingRead, token0Meta, token1Meta] = await Promise.all([
      this.read(pancakeV3PoolAbi, "slot0", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "liquidity", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "tickSpacing", [], poolAddress, observedBlock),
      this.getTokenMetadata(position.token0, observedBlock),
      this.getTokenMetadata(position.token1, observedBlock),
    ]);
    const slot0 = slot0Read.result as readonly [bigint, number, number, number, number, number, boolean];
    const currentTick = slot0[1];
    const tickSpacing = toNumber(tickSpacingRead.result as bigint | number);
    const poolLiquidity = poolLiquidityRead.result as bigint;
    const rangeState = classifyLiquidityRange(currentTick, position.tickLower, position.tickUpper, tickSpacing, position.liquidity);
    const currentPrice = deriveSqrtPriceX96Price(slot0[0], token0Meta.token.decimals, token1Meta.token.decimals);
    const evidence = this.evidenceForPosition({
      version: "V3", tokenId: tokenId.toString(), owner, positionManager: this.contracts.v3PositionManager,
      blockNumber: observedBlock, observedAt, currentTick, sqrtPriceX96: slot0[0].toString(), poolLiquidityRaw: poolLiquidity.toString(),
      positionLiquidityRaw: position.liquidity.toString(), tickLower: position.tickLower, tickUpper: position.tickUpper,
      tickSpacing, rangeState, currentPrice,
    });

    const pool: PancakeSwapClPoolSnapshot = {
      protocol: "PancakeSwap",
      version: "V3",
      network: this.network,
      chainId: this.chain.definition.chainId,
      poolAddress,
      token0: token0Meta.token,
      token1: token1Meta.token,
      feePips: position.fee,
      currentLpFeePips: position.fee,
      tickSpacing,
      currentTick,
      sqrtPriceX96: slot0[0].toString(),
      liquidityRaw: poolLiquidity.toString(),
      currentPriceToken0InToken1: currentPrice,
      blockNumber: observedBlock,
      observedAt,
      evidence: evidence.filter((item) => item.metric.startsWith("pancakeswap.pool") || item.metric === "market.current_price"),
    };

    return {
      protocol: "PancakeSwap",
      version: "V3",
      network: this.network,
      chainId: this.chain.definition.chainId,
      positionManager: normalizeAddress(this.contracts.v3PositionManager),
      tokenId: tokenId.toString(),
      owner,
      pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      liquidityRaw: position.liquidity.toString(),
      rangeState,
      distanceToLowerTicks: Math.abs(currentTick - position.tickLower),
      distanceToUpperTicks: Math.abs(position.tickUpper - currentTick),
      recordedTokensOwed0Raw: position.tokensOwed0.toString(),
      recordedTokensOwed1Raw: position.tokensOwed1.toString(),
      feeGrowthInside0LastX128: position.feeGrowthInside0LastX128.toString(),
      feeGrowthInside1LastX128: position.feeGrowthInside1LastX128.toString(),
      blockNumber: observedBlock,
      observedAt,
      evidence,
      coverage: {
        ownership: "AVAILABLE",
        poolState: "AVAILABLE",
        tokenMetadata: token0Meta.complete && token1Meta.complete ? "AVAILABLE" : "PARTIAL",
        fees: "RECORDED_ONLY",
        valuation: "NOT_SUPPORTED",
      },
    };
  }

  async getInfinityClPosition(tokenIdInput: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot> {
    const tokenId = assertTokenId(tokenIdInput);
    const observedBlock = blockNumber ?? await this.chain.getBlockNumber();
    const observedAt = new Date().toISOString();
    const [ownerRead, positionRead] = await Promise.all([
      this.read(pancakeInfinityClPositionManagerAbi, "ownerOf", [tokenId], this.contracts.infinityClPositionManager, observedBlock),
      this.read(pancakeInfinityClPositionManagerAbi, "positions", [tokenId], this.contracts.infinityClPositionManager, observedBlock),
    ]);
    const owner = normalizeAddress(String(ownerRead.result));
    const tuple = positionRead.result as readonly [
      { currency0: Address; currency1: Address; hooks: Address; poolManager: Address; fee: number; parameters: Hex },
      number,
      number,
      bigint,
      bigint,
      bigint,
      Address,
    ];
    const position: InfinityPositionTuple = {
      poolKey: {
        currency0: tuple[0].currency0,
        currency1: tuple[0].currency1,
        hooks: tuple[0].hooks,
        poolManager: tuple[0].poolManager,
        fee: tuple[0].fee,
        parameters: tuple[0].parameters,
      },
      tickLower: tuple[1],
      tickUpper: tuple[2],
      liquidity: tuple[3],
      feeGrowthInside0LastX128: tuple[4],
      feeGrowthInside1LastX128: tuple[5],
      subscriber: tuple[6],
    };

    if (normalizeAddress(position.poolKey.poolManager) !== normalizeAddress(this.contracts.infinityClPoolManager)) {
      throw new PancakeSwapAdapterError(
        `Infinity position ${tokenId.toString()} references an unexpected pool manager.`,
        "POOL_MANAGER_MISMATCH",
        false,
        { expected: this.contracts.infinityClPoolManager, actual: position.poolKey.poolManager },
      );
    }

    const poolId = computeInfinityPoolId(position.poolKey);
    const [slot0Read, poolLiquidityRead, token0Meta, token1Meta] = await Promise.all([
      this.read(pancakeInfinityClPoolManagerAbi, "getSlot0", [poolId], this.contracts.infinityClPoolManager, observedBlock),
      this.read(pancakeInfinityClPoolManagerAbi, "getLiquidity", [poolId], this.contracts.infinityClPoolManager, observedBlock),
      this.getTokenMetadata(position.poolKey.currency0, observedBlock),
      this.getTokenMetadata(position.poolKey.currency1, observedBlock),
    ]);
    const slot0 = slot0Read.result as readonly [bigint, number, number, number];
    const currentTick = slot0[1];
    const tickSpacing = decodeInfinityTickSpacing(position.poolKey.parameters);
    const poolLiquidity = poolLiquidityRead.result as bigint;
    const rangeState = classifyLiquidityRange(currentTick, position.tickLower, position.tickUpper, tickSpacing, position.liquidity);
    const currentPrice = deriveSqrtPriceX96Price(slot0[0], token0Meta.token.decimals, token1Meta.token.decimals);
    const evidence = this.evidenceForPosition({
      version: "INFINITY_CL", tokenId: tokenId.toString(), owner, positionManager: this.contracts.infinityClPositionManager,
      blockNumber: observedBlock, observedAt, currentTick, sqrtPriceX96: slot0[0].toString(), poolLiquidityRaw: poolLiquidity.toString(),
      positionLiquidityRaw: position.liquidity.toString(), tickLower: position.tickLower, tickUpper: position.tickUpper,
      tickSpacing, rangeState, currentPrice,
    });

    const pool: PancakeSwapClPoolSnapshot = {
      protocol: "PancakeSwap",
      version: "INFINITY_CL",
      network: this.network,
      chainId: this.chain.definition.chainId,
      poolId,
      token0: token0Meta.token,
      token1: token1Meta.token,
      hooks: normalizeAddress(position.poolKey.hooks),
      feePips: position.poolKey.fee,
      currentLpFeePips: slot0[3],
      protocolFeePips: slot0[2],
      tickSpacing,
      currentTick,
      sqrtPriceX96: slot0[0].toString(),
      liquidityRaw: poolLiquidity.toString(),
      currentPriceToken0InToken1: currentPrice,
      blockNumber: observedBlock,
      observedAt,
      evidence: evidence.filter((item) => item.metric.startsWith("pancakeswap.pool") || item.metric === "market.current_price"),
    };

    return {
      protocol: "PancakeSwap",
      version: "INFINITY_CL",
      network: this.network,
      chainId: this.chain.definition.chainId,
      positionManager: normalizeAddress(this.contracts.infinityClPositionManager),
      tokenId: tokenId.toString(),
      owner,
      pool,
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      liquidityRaw: position.liquidity.toString(),
      rangeState,
      distanceToLowerTicks: Math.abs(currentTick - position.tickLower),
      distanceToUpperTicks: Math.abs(position.tickUpper - currentTick),
      feeGrowthInside0LastX128: position.feeGrowthInside0LastX128.toString(),
      feeGrowthInside1LastX128: position.feeGrowthInside1LastX128.toString(),
      blockNumber: observedBlock,
      observedAt,
      evidence,
      coverage: {
        ownership: "AVAILABLE",
        poolState: "AVAILABLE",
        tokenMetadata: token0Meta.complete && token1Meta.complete ? "AVAILABLE" : "PARTIAL",
        fees: "NOT_SUPPORTED",
        valuation: "NOT_SUPPORTED",
      },
    };
  }

  async getV3Pool(poolAddressInput: string, blockNumber?: string): Promise<PancakeSwapClPoolSnapshot> {
    const poolAddress = normalizeAddress(poolAddressInput);
    const observedBlock = blockNumber ?? await this.chain.getBlockNumber();
    const observedAt = new Date().toISOString();
    const [token0Read, token1Read, feeRead, slot0Read, liquidityRead, spacingRead] = await Promise.all([
      this.read(pancakeV3PoolAbi, "token0", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "token1", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "fee", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "slot0", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "liquidity", [], poolAddress, observedBlock),
      this.read(pancakeV3PoolAbi, "tickSpacing", [], poolAddress, observedBlock),
    ]);
    const token0Address = normalizeAddress(String(token0Read.result));
    const token1Address = normalizeAddress(String(token1Read.result));
    const [token0Meta, token1Meta] = await Promise.all([
      this.getTokenMetadata(token0Address, observedBlock),
      this.getTokenMetadata(token1Address, observedBlock),
    ]);
    const slot0 = slot0Read.result as readonly [bigint, number, number, number, number, number, boolean];
    const currentTick = slot0[1];
    const sqrtPriceX96 = slot0[0].toString();
    const currentPrice = deriveSqrtPriceX96Price(slot0[0], token0Meta.token.decimals, token1Meta.token.decimals);
    const chainContext = makeChainContext(this.chain, observedBlock);
    const evidence = [
      createEvidenceEnvelope({ subjectType: "market", subjectId: poolAddress, metric: "pancakeswap.pool.tick", value: currentTick, provenance: "external", source: DATA_SOURCES.PANCAKESWAP, sourceRef: explorerAddressRef(this.network, poolAddress), observedAt, confidence: "high", method: EVIDENCE_METHODS.PANCAKE_V3_POSITION, methodInputs: [observedBlock], chainContext }),
      createEvidenceEnvelope({ subjectType: "market", subjectId: poolAddress, metric: "pancakeswap.pool.liquidity", value: String(liquidityRead.result), provenance: "external", source: DATA_SOURCES.PANCAKESWAP, sourceRef: explorerAddressRef(this.network, poolAddress), observedAt, confidence: "high", method: EVIDENCE_METHODS.PANCAKE_V3_POSITION, methodInputs: [observedBlock], chainContext }),
    ];
    if (currentPrice) evidence.push(createEvidenceEnvelope({ subjectType: "market", subjectId: poolAddress, metric: "market.current_price", value: currentPrice, unit: "token1-per-token0", provenance: "marketplace-derived", source: DATA_SOURCES.SPOTRIQ_DERIVED, observedAt, confidence: "high", method: EVIDENCE_METHODS.PANCAKE_CL_SQRT_PRICE, methodInputs: [sqrtPriceX96], chainContext }));
    return { protocol: "PancakeSwap", version: "V3", network: this.network, chainId: this.chain.definition.chainId, poolAddress, token0: token0Meta.token, token1: token1Meta.token, feePips: toNumber(feeRead.result as bigint | number), currentLpFeePips: toNumber(feeRead.result as bigint | number), tickSpacing: toNumber(spacingRead.result as bigint | number), currentTick, sqrtPriceX96, liquidityRaw: String(liquidityRead.result), currentPriceToken0InToken1: currentPrice, blockNumber: observedBlock, observedAt, evidence };
  }

  async findBestV3Pool(tokenA: string, tokenB: string, feeCandidates = [100, 500, 2500, 10000], blockNumber?: string): Promise<PancakeSwapClPoolSnapshot | undefined> {
    const observedBlock = blockNumber ?? await this.chain.getBlockNumber();
    const pools: PancakeSwapClPoolSnapshot[] = [];
    for (const fee of feeCandidates) {
      try {
        const read = await this.read(pancakeV3FactoryAbi, "getPool", [normalizeAddress(tokenA), normalizeAddress(tokenB), fee], this.contracts.v3Factory, observedBlock);
        const address = normalizeAddress(String(read.result));
        if (address === ZERO_ADDRESS) continue;
        pools.push(await this.getV3Pool(address, observedBlock));
      } catch { /* one fee tier must not block other candidate tiers */ }
    }
    pools.sort((a, b) => { const aa = BigInt(a.liquidityRaw); const bb = BigInt(b.liquidityRaw); return aa === bb ? 0 : aa > bb ? -1 : 1; });
    return pools[0];
  }

  async observeV3Pool(poolAddressInput: string, secondsAgo: number, blockNumber?: string): Promise<PancakeSwapV3OracleObservation> {
    if (!Number.isInteger(secondsAgo) || secondsAgo <= 0) throw new PancakeSwapAdapterError("secondsAgo must be a positive integer.", "CONTRACT_READ_FAILED");
    const poolAddress = normalizeAddress(poolAddressInput);
    const observedBlock = blockNumber ?? await this.chain.getBlockNumber();
    const pool = await this.getV3Pool(poolAddress, observedBlock);
    const observation = await this.read(pancakeV3PoolAbi, "observe", [[secondsAgo, 0]], poolAddress, observedBlock);
    const tuple = observation.result as readonly [readonly bigint[], readonly bigint[]];
    const cumulatives = tuple[0];
    if (cumulatives.length < 2) throw new PancakeSwapAdapterError("PancakeSwap V3 oracle returned insufficient cumulative observations.", "CONTRACT_READ_FAILED", true);
    const delta = cumulatives[1] - cumulatives[0];
    const tick = averageTickFromCumulatives(delta, secondsAgo);
    return { poolAddress, secondsAgo, averageTick: tick, averagePriceToken0InToken1: deriveTickPrice(tick, pool.token0.decimals, pool.token1.decimals), blockNumber: observedBlock, observedAt: new Date().toISOString() };
  }

  async getPosition(version: PancakeSwapProtocolVersion, tokenId: string | number | bigint, blockNumber?: string): Promise<PancakeSwapClPositionSnapshot> {
    return version === "V3" ? this.getV3Position(tokenId, blockNumber) : this.getInfinityClPosition(tokenId, blockNumber);
  }

  async getWalletPositions(walletAddress: string, maxPositions = this.maxWalletPositions): Promise<PancakeSwapWalletPositionsSnapshot> {
    const wallet = normalizeAddress(walletAddress);
    const observedBlock = await this.chain.getBlockNumber();
    const observedAt = new Date().toISOString();
    const boundedMax = Math.max(1, Math.min(maxPositions, 100));
    try {
      const balanceRead = await this.read(pancakeV3PositionManagerAbi, "balanceOf", [wallet], this.contracts.v3PositionManager, observedBlock);
      const count = balanceRead.result as bigint;
      const targetCount = Number(count > BigInt(boundedMax) ? BigInt(boundedMax) : count);
      const indexes = Array.from({ length: targetCount }, (_, index) => index);
      const tokenRefs: Array<{ index: number; tokenId?: bigint; error?: string }> = await mapWithConcurrency(indexes, 8, async (index) => {
        try {
          const tokenRead = await this.read(pancakeV3PositionManagerAbi, "tokenOfOwnerByIndex", [wallet, BigInt(index)], this.contracts.v3PositionManager, observedBlock);
          return { index, tokenId: tokenRead.result as bigint };
        } catch (error) {
          return { index, error: error instanceof Error ? error.message : String(error) };
        }
      });

      const settled = await mapWithConcurrency(tokenRefs, 4, async (ref) => {
        if (ref.tokenId === undefined) return { ref: `owner-index:${ref.index}`, error: ref.error ?? "Position token ID could not be read." };
        try {
          const position = await this.getV3Position(ref.tokenId, observedBlock);
          if (position.owner !== wallet) return { ref: ref.tokenId.toString(), error: "Position ownership changed during the snapshot read." };
          return { ref: ref.tokenId.toString(), position };
        } catch (error) {
          return { ref: ref.tokenId.toString(), error: error instanceof Error ? error.message : String(error) };
        }
      });
      const positions = settled.flatMap((item) => item.position ? [item.position] : []);
      const failedV3PositionRefs = settled.flatMap((item) => item.error ? [item.ref] : []);
      return {
        walletAddress: wallet,
        network: this.network,
        chainId: this.chain.definition.chainId,
        blockNumber: observedBlock,
        observedAt,
        positions,
        coverage: {
          v3Discovery: failedV3PositionRefs.length === 0 && count <= BigInt(boundedMax) ? "AVAILABLE" : "PARTIAL",
          infinityClDiscovery: "TOKEN_ID_REQUIRED",
          failedV3PositionRefs,
          truncated: count > BigInt(boundedMax),
          maxPositions: boundedMax,
        },
      };
    } catch (error) {
      throw new PancakeSwapAdapterError(
        `Unable to discover PancakeSwap V3 positions for ${wallet}.`,
        "WALLET_DISCOVERY_FAILED",
        true,
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}

export function createPancakeSwapAdapter(options: PancakeSwapAdapterOptions): PancakeSwapAdapter {
  return new PancakeSwapAdapter(options);
}
