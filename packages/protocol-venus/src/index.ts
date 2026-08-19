import type { Address, Hex } from "viem";
import { decodeFunctionResult, encodeFunctionData, formatUnits, parseAbi } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import type {
  BscNetwork,
  EvidenceEnvelope,
  ProtocolTokenMetadata,
  VenusContractSet,
  VenusMarketPositionSnapshot,
  VenusPoolKind,
  VenusPoolPositionSnapshot,
  VenusWalletPositionsSnapshot,
} from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import { classifyVenusRisk, VENUS_PRESENTATION_THRESHOLDS } from "./risk.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ONE_18 = 10n ** 18n;

const protocolShareReserveAbi = parseAbi([
  "function CORE_POOL_COMPTROLLER() view returns (address)",
  "function poolRegistry() view returns (address)",
  "function vBNB() view returns (address)",
  "function WBNB() view returns (address)",
]);
const poolRegistryAbi = parseAbi([
  "function getAllPools() view returns ((string name,address creator,address comptroller,uint256 blockPosted,uint256 timestampPosted)[])",
]);
const commonComptrollerAbi = parseAbi([
  "function getAllMarkets() view returns (address[])",
  "function getAssetsIn(address account) view returns (address[])",
  "function getAccountLiquidity(address account) view returns (uint256 errorCode,uint256 liquidity,uint256 shortfall)",
  "function oracle() view returns (address)",
]);
const coreMarketsAbi = parseAbi([
  "function markets(address vToken) view returns (bool isListed,uint256 collateralFactorMantissa,bool isVenus,uint256 liquidationThresholdMantissa,uint256 liquidationIncentiveMantissa,uint96 marketPoolId,bool isBorrowAllowed)",
]);
const isolatedMarketsAbi = parseAbi([
  "function markets(address vToken) view returns (bool isListed,uint256 collateralFactorMantissa,uint256 liquidationThresholdMantissa)",
  "function isForcedLiquidationEnabled(address vToken) view returns (bool)",
]);
const vTokenAbi = parseAbi([
  "function getAccountSnapshot(address account) view returns (uint256 errorCode,uint256 vTokenBalance,uint256 borrowBalance,uint256 exchangeRateMantissa)",
  "function underlying() view returns (address)",
  "function symbol() view returns (string)",
]);
const tokenMetadataAbi = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
]);
const priceOracleAbi = parseAbi([
  "function getUnderlyingPrice(address vToken) view returns (uint256)",
]);

export const VENUS_BOOTSTRAP_CONTRACTS: Record<BscNetwork, { protocolShareReserve: string }> = {
  mainnet: { protocolShareReserve: "0xCa01D5A9A248a830E9D93231e791B1afFed7c446" },
  testnet: { protocolShareReserve: "0x25c7c7D6Bf710949fD7f03364E9BA19a1b3c10E3" },
};

export type VenusAdapterErrorCode =
  | "BOOTSTRAP_FAILED"
  | "POOL_DISCOVERY_FAILED"
  | "CONTRACT_READ_FAILED"
  | "ACCOUNT_LIQUIDITY_FAILED";

export class VenusAdapterError extends Error {
  constructor(
    message: string,
    public readonly code: VenusAdapterErrorCode,
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "VenusAdapterError";
  }
}

export interface VenusStatus {
  protocol: "Venus";
  network: BscNetwork;
  chainId: number;
  contracts: VenusContractSet;
  capabilities: {
    corePoolDiscovery: boolean;
    isolatedPoolDiscovery: boolean;
    accountLiquidity: true;
    marketSnapshots: true;
    derivedHealthFactor: true;
    automatedProtection: false;
  };
  coverageNotes: string[];
}

export interface VenusReader {
  getStatus(): Promise<VenusStatus>;
  getWalletPositions(walletAddress: string): Promise<VenusWalletPositionsSnapshot>;
}

export interface VenusAdapterOptions { chain: BscChainReader; maxPools?: number; maxMarketsPerPool?: number; }

interface PoolRef { name: string; kind: VenusPoolKind; comptroller: string; }

function normalizeAddress(value: string): string { return value.toLowerCase(); }
function isAddress(value: string): boolean { return /^0x[0-9a-fA-F]{40}$/.test(value) && normalizeAddress(value) !== ZERO_ADDRESS; }
function explorerAddressRef(network: BscNetwork, address: string): string {
  return `${network === "mainnet" ? "https://bscscan.com" : "https://testnet.bscscan.com"}/address/${address}`;
}
function formatUsd1e18(value?: bigint): string | undefined {
  if (value === undefined) return undefined;
  const formatted = Number(formatUnits(value, 18));
  if (!Number.isFinite(formatted)) return undefined;
  return formatted.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}


async function mapWithConcurrency<T, R>(items: readonly T[], limit: number, mapper: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length || 1)) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function createVenusAdapter(options: VenusAdapterOptions): VenusReader {
  const maxPools = Math.max(1, Math.min(options.maxPools ?? 30, 50));
  const maxMarkets = Math.max(1, Math.min(options.maxMarketsPerPool ?? 60, 100));

  async function read<T>(address: string, abi: any, functionName: string, args: readonly unknown[] = [], blockNumber?: string): Promise<{ result: T; blockNumber: string }> {
    try {
      const data = encodeFunctionData({ abi, functionName: functionName as never, args: args as never });
      const call = await options.chain.callContract(address, data, blockNumber);
      const result = decodeFunctionResult({ abi, functionName: functionName as never, data: call.data as Hex }) as T;
      return { result, blockNumber: call.blockNumber };
    } catch (error) {
      throw new VenusAdapterError(`Venus contract read failed: ${functionName}.`, "CONTRACT_READ_FAILED", true, error);
    }
  }

  async function bootstrap(blockNumber?: string): Promise<{ contracts: VenusContractSet; blockNumber: string }> {
    const protocolShareReserve = VENUS_BOOTSTRAP_CONTRACTS[options.chain.network].protocolShareReserve;
    try {
      const firstBlock = blockNumber ?? await options.chain.getBlockNumber();
      const [core, registry, vBNB, wBNB] = await Promise.all([
        read<Address>(protocolShareReserve, protocolShareReserveAbi, "CORE_POOL_COMPTROLLER", [], firstBlock),
        read<Address>(protocolShareReserve, protocolShareReserveAbi, "poolRegistry", [], firstBlock),
        read<Address>(protocolShareReserve, protocolShareReserveAbi, "vBNB", [], firstBlock).catch(() => undefined),
        read<Address>(protocolShareReserve, protocolShareReserveAbi, "WBNB", [], firstBlock).catch(() => undefined),
      ]);
      const contracts: VenusContractSet = {
        network: options.chain.network,
        protocolShareReserve,
        corePoolComptroller: isAddress(core.result) ? normalizeAddress(core.result) : undefined,
        poolRegistry: isAddress(registry.result) ? normalizeAddress(registry.result) : undefined,
        vBNB: vBNB && isAddress(vBNB.result) ? normalizeAddress(vBNB.result) : undefined,
        wBNB: wBNB && isAddress(wBNB.result) ? normalizeAddress(wBNB.result) : undefined,
      };
      if (!contracts.corePoolComptroller) throw new Error("Core Pool comptroller was not returned by ProtocolShareReserve.");
      return { contracts, blockNumber: firstBlock };
    } catch (error) {
      if (error instanceof VenusAdapterError) throw new VenusAdapterError("Could not bootstrap Venus contracts from ProtocolShareReserve.", "BOOTSTRAP_FAILED", true, error.details ?? error);
      throw new VenusAdapterError("Could not bootstrap Venus contracts from ProtocolShareReserve.", "BOOTSTRAP_FAILED", true, error);
    }
  }

  async function discoverPools(contracts: VenusContractSet, blockNumber: string): Promise<{ pools: PoolRef[]; isolatedOk: boolean }> {
    const pools: PoolRef[] = [{ name: "Core Pool", kind: "CORE", comptroller: contracts.corePoolComptroller! }];
    if (!contracts.poolRegistry) return { pools, isolatedOk: false };
    try {
      const all = await read<readonly { name: string; creator: Address; comptroller: Address; blockPosted: bigint; timestampPosted: bigint }[]>(contracts.poolRegistry, poolRegistryAbi, "getAllPools", [], blockNumber);
      for (const item of all.result.slice(0, maxPools - 1)) {
        if (isAddress(item.comptroller)) pools.push({ name: item.name || "Venus Isolated Pool", kind: "ISOLATED", comptroller: normalizeAddress(item.comptroller) });
      }
      return { pools, isolatedOk: true };
    } catch {
      return { pools, isolatedOk: false };
    }
  }

  async function tokenMetadata(address: string, blockNumber: string): Promise<ProtocolTokenMetadata> {
    const [symbol, name, decimals] = await Promise.all([
      read<string>(address, tokenMetadataAbi, "symbol", [], blockNumber).then((v) => v.result).catch(() => undefined),
      read<string>(address, tokenMetadataAbi, "name", [], blockNumber).then((v) => v.result).catch(() => undefined),
      read<number>(address, tokenMetadataAbi, "decimals", [], blockNumber).then((v) => Number(v.result)).catch(() => undefined),
    ]);
    return { address: normalizeAddress(address), symbol, name, decimals, isNative: false };
  }

  async function scanPool(pool: PoolRef, walletAddress: string, contracts: VenusContractSet, blockNumber: string, observedAt: string): Promise<VenusPoolPositionSnapshot | undefined> {
    const [liquidityCall, assetsCall, oracleCall] = await Promise.all([
      read<readonly [bigint, bigint, bigint]>(pool.comptroller, commonComptrollerAbi, "getAccountLiquidity", [walletAddress], blockNumber),
      read<readonly Address[]>(pool.comptroller, commonComptrollerAbi, "getAssetsIn", [walletAddress], blockNumber),
      read<Address>(pool.comptroller, commonComptrollerAbi, "oracle", [], blockNumber).catch(() => undefined),
    ]);
    const [errorCode, protocolLiquidity, protocolShortfall] = liquidityCall.result;
    if (errorCode !== 0n) throw new VenusAdapterError(`Venus ${pool.name} returned account-liquidity error ${errorCode}.`, "ACCOUNT_LIQUIDITY_FAILED");
    const oracle = oracleCall && isAddress(oracleCall.result) ? normalizeAddress(oracleCall.result) : undefined;
    const collateralSet = new Set(assetsCall.result.map((address) => normalizeAddress(address)));
    // Health monitoring only needs markets the account has entered. Venus automatically/explicitly
    // associates borrowing/collateral activity with entered markets, avoiding an expensive scan of
    // every listed vToken on every public-RPC check. Non-collateral supply-only discovery belongs to
    // the Yield data path rather than this Health adapter.
    const marketAddresses = assetsCall.result.slice(0, maxMarkets).map((address) => normalizeAddress(address));
    let partial = false;

    const scanned = await mapWithConcurrency<string, VenusMarketPositionSnapshot | undefined>(marketAddresses, 5, async (vToken) => {
      try {
        const snapshotCall = await read<readonly [bigint, bigint, bigint, bigint]>(vToken, vTokenAbi, "getAccountSnapshot", [walletAddress], blockNumber);
        const [snapshotError, vTokenBalance, borrowBalance, exchangeRate] = snapshotCall.result;
        if (snapshotError !== 0n || (vTokenBalance === 0n && borrowBalance === 0n)) return undefined;

        const isVbnb = contracts.vBNB && normalizeAddress(vToken) === normalizeAddress(contracts.vBNB);
        const underlyingAddress = isVbnb ? ZERO_ADDRESS : await read<Address>(vToken, vTokenAbi, "underlying", [], blockNumber).then((v) => normalizeAddress(v.result)).catch(() => ZERO_ADDRESS);
        const [vSymbol, underlying] = await Promise.all([
          read<string>(vToken, vTokenAbi, "symbol", [], blockNumber).then((v) => v.result).catch(() => undefined),
          isVbnb
            ? Promise.resolve<ProtocolTokenMetadata>({ address: ZERO_ADDRESS, symbol: options.chain.definition.nativeSymbol, name: options.chain.definition.nativeSymbol, decimals: 18, isNative: true })
            : isAddress(underlyingAddress)
              ? tokenMetadata(underlyingAddress, blockNumber)
              : Promise.resolve<ProtocolTokenMetadata>({ address: underlyingAddress, isNative: false }),
        ]);

        const collateralEnabled = collateralSet.has(vToken);
        let collateralFactor: bigint | undefined;
        let liquidationThreshold: bigint | undefined;
        let forcedLiquidationEnabled: boolean | undefined;
        try {
          if (pool.kind === "CORE") {
            const config = await read<readonly [boolean, bigint, boolean, bigint, bigint, bigint, boolean]>(pool.comptroller, coreMarketsAbi, "markets", [vToken], blockNumber);
            collateralFactor = config.result[1];
            liquidationThreshold = config.result[3];
          } else {
            const config = await read<readonly [boolean, bigint, bigint]>(pool.comptroller, isolatedMarketsAbi, "markets", [vToken], blockNumber);
            collateralFactor = config.result[1];
            liquidationThreshold = config.result[2];
            forcedLiquidationEnabled = await read<boolean>(pool.comptroller, isolatedMarketsAbi, "isForcedLiquidationEnabled", [vToken], blockNumber)
              .then((value) => value.result)
              .catch(() => { partial = true; return undefined; });
          }
        } catch { partial = true; }

        let price: bigint | undefined;
        if (oracle) {
          try { price = (await read<bigint>(oracle, priceOracleAbi, "getUnderlyingPrice", [vToken], blockNumber)).result; } catch { partial = true; }
        } else partial = true;

        const suppliedUnderlying = vTokenBalance * exchangeRate / ONE_18;
        const suppliedUsd = price !== undefined ? suppliedUnderlying * price / ONE_18 : undefined;
        const borrowUsd = price !== undefined ? borrowBalance * price / ONE_18 : undefined;
        const adjusted = collateralEnabled && suppliedUsd !== undefined && liquidationThreshold !== undefined
          ? suppliedUsd * liquidationThreshold / ONE_18
          : 0n;
        const subjectId = `${pool.comptroller}:${vToken}:${walletAddress}`;
        const evidence: EvidenceEnvelope[] = [
          createEvidenceEnvelope({
            subjectType: "venus-market-position", subjectId, metric: "health.position", value: borrowBalance.toString(), unit: "underlying-raw",
            provenance: "external", source: DATA_SOURCES.VENUS, sourceRef: explorerAddressRef(options.chain.network, vToken), observedAt,
            method: EVIDENCE_METHODS.VENUS_MARKET_POSITION, methodInputs: ["vToken.getAccountSnapshot", "comptroller.membership", "oracle.getUnderlyingPrice"],
            confidence: price !== undefined ? "high" : "medium",
            limitation: price === undefined ? "Oracle price was unavailable; USD risk contribution could not be derived for this market." : undefined,
            chainContext: { chain: "BSC", network: options.chain.network, chainId: options.chain.definition.chainId, blockNumber },
          }),
        ];
        return {
          protocol: "Venus" as const, poolKind: pool.kind, poolName: pool.name, comptroller: pool.comptroller, vToken, vTokenSymbol: vSymbol,
          underlying, collateralEnabled, suppliedVTokenRaw: vTokenBalance.toString(), suppliedUnderlyingRaw: suppliedUnderlying.toString(),
          borrowUnderlyingRaw: borrowBalance.toString(), exchangeRateMantissa: exchangeRate.toString(), collateralFactorMantissa: collateralFactor?.toString(),
          liquidationThresholdMantissa: liquidationThreshold?.toString(), forcedLiquidationEnabled, oraclePriceRaw: price?.toString(), suppliedValueUsd1e18: suppliedUsd?.toString(),
          borrowValueUsd1e18: borrowUsd?.toString(), liquidationAdjustedCollateralUsd1e18: adjusted.toString(), evidence,
        } satisfies VenusMarketPositionSnapshot;
      } catch { partial = true; return undefined; }
    });
    const positions = scanned.filter((item): item is VenusMarketPositionSnapshot => Boolean(item));
    if (positions.length === 0 && protocolLiquidity === 0n && protocolShortfall === 0n) return undefined;

    const hasBorrow = positions.some((item) => BigInt(item.borrowUnderlyingRaw) > 0n);
    const borrowValuationComplete = positions.every((item) => BigInt(item.borrowUnderlyingRaw) === 0n || item.borrowValueUsd1e18 !== undefined);
    const totalBorrow = positions.reduce((sum, item) => item.borrowValueUsd1e18 !== undefined ? sum + BigInt(item.borrowValueUsd1e18) : sum, 0n);
    // Venus getAccountLiquidity already applies the account's effective liquidation-threshold rules,
    // including Core Pool E-Mode where applicable. Combine that canonical surplus/shortfall with
    // debt valued from the same Venus oracle denomination instead of rebuilding aggregate risk
    // from base per-market LT values.
    const adjustedCollateral = hasBorrow && borrowValuationComplete && totalBorrow > 0n
      ? protocolShortfall > 0n
        ? (protocolShortfall >= totalBorrow ? 0n : totalBorrow - protocolShortfall)
        : totalBorrow + protocolLiquidity
      : hasBorrow ? undefined : 0n;
    const forcedLiquidation = positions.some((item) => BigInt(item.borrowUnderlyingRaw) > 0n && item.forcedLiquidationEnabled === true);
    const forcedLiquidationUnknown = pool.kind === "ISOLATED" && positions.some((item) => BigInt(item.borrowUnderlyingRaw) > 0n && item.forcedLiquidationEnabled === undefined);
    const derived = classifyVenusRisk(protocolShortfall, totalBorrow, adjustedCollateral, hasBorrow, forcedLiquidation);
    const evidence = positions.flatMap((item) => item.evidence);
    evidence.push(createEvidenceEnvelope({
      subjectType: "venus-pool-position", subjectId: `${pool.comptroller}:${walletAddress}`, metric: "health.position", value: protocolShortfall.toString(), unit: "usd-1e18-shortfall",
      provenance: "external", source: DATA_SOURCES.VENUS, sourceRef: explorerAddressRef(options.chain.network, pool.comptroller), observedAt,
      method: EVIDENCE_METHODS.VENUS_ACCOUNT_LIQUIDITY, methodInputs: ["comptroller.getAccountLiquidity"], confidence: "high",
      chainContext: { chain: "BSC", network: options.chain.network, chainId: options.chain.definition.chainId, blockNumber },
    }));
    if (derived.healthFactor) evidence.push(createEvidenceEnvelope({
      subjectType: "venus-pool-position", subjectId: `${pool.comptroller}:${walletAddress}`, metric: "health.factor", value: derived.healthFactor, unit: "ratio",
      provenance: "marketplace-derived", source: DATA_SOURCES.SPOTRIQ_DERIVED, observedAt, method: EVIDENCE_METHODS.VENUS_HEALTH_FACTOR,
      methodInputs: positions.flatMap((item) => item.evidence.map((ev) => ev.evidenceId)), confidence: derived.conflict ? "low" : partial ? "medium" : "high",
      limitation: "Spotriq health-factor presentation is derived from Venus canonical account liquidity/shortfall plus observed debt valuation in the Venus oracle denomination. Venus protocol shortfall and forced-liquidation configuration remain authoritative.",
      chainContext: { chain: "BSC", network: options.chain.network, chainId: options.chain.definition.chainId, blockNumber },
    }));
    const limitations: string[] = [];
    if (partial) limitations.push("One or more market metadata, risk-parameter, or oracle reads were unavailable.");
    if (pool.kind === "CORE") limitations.push("Core market-level liquidation-threshold fields show the base market configuration; Venus account liquidity/shortfall is used for the aggregate health calculation so effective E-Mode risk rules remain authoritative.");
    if (forcedLiquidation) limitations.push("Venus reports forced liquidation enabled for at least one borrowed market in this isolated pool. That market may be liquidated regardless of normal account liquidity.");
    if (forcedLiquidationUnknown) limitations.push("Spotriq could not read the forced-liquidation flag for at least one borrowed isolated-pool market; the standard account-liquidity result is incomplete for that market.");
    if (derived.conflict) limitations.push("Derived health factor conflicts with the canonical protocol liquidity state; Spotriq will not classify the account as healthy.");
    return {
      protocol: "Venus", network: options.chain.network, chainId: options.chain.definition.chainId, poolKind: pool.kind, poolName: pool.name,
      comptroller: pool.comptroller, oracle, walletAddress, protocolLiquidityRaw: protocolLiquidity.toString(), protocolShortfallRaw: protocolShortfall.toString(),
      totalBorrowValueUsd1e18: totalBorrow > 0n ? totalBorrow.toString() : "0", liquidationAdjustedCollateralUsd1e18: adjustedCollateral?.toString(),
      healthFactor: derived.healthFactor, riskState: derived.state, markets: positions, blockNumber, observedAt, evidence,
      coverage: { accountLiquidity: "AVAILABLE", marketPositions: partial ? "PARTIAL" : "AVAILABLE", healthFactor: derived.conflict ? "CONFLICT" : derived.healthFactor || totalBorrow === 0n ? "AVAILABLE" : "UNAVAILABLE" },
      limitations,
    };
  }

  async function getStatus(): Promise<VenusStatus> {
    const { contracts } = await bootstrap();
    return {
      protocol: "Venus", network: options.chain.network, chainId: options.chain.definition.chainId, contracts,
      capabilities: { corePoolDiscovery: Boolean(contracts.corePoolComptroller), isolatedPoolDiscovery: Boolean(contracts.poolRegistry), accountLiquidity: true, marketSnapshots: true, derivedHealthFactor: true, automatedProtection: false },
      coverageNotes: [
        "Core and isolated-pool health positions are read directly from Venus contracts on BSC using the account's entered markets.",
        "Venus getAccountLiquidity/shortfall is treated as the canonical liquidation-risk signal; Spotriq health factor is a derived explanatory metric.",
        "Health thresholds above the protocol liquidation boundary are Spotriq presentation policy, not Venus guarantees.",
        "Core Pool E-Mode can use user-specific risk parameters; Spotriq derives the aggregate health ratio from Venus account liquidity/shortfall rather than rebuilding it from base market LT values.",
        "Isolated-pool forced-liquidation flags are checked for borrowed entered markets; if a flag cannot be read, Spotriq marks the assessment partial rather than assuming it is disabled.",
        "Supply-only markets that are not entered as collateral/borrow markets are intentionally left to the future Yield data path.",
        "Automated protection and alert delivery are not enabled in this milestone.",
      ],
    };
  }

  async function getWalletPositions(walletAddress: string): Promise<VenusWalletPositionsSnapshot> {
    if (!/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) throw new VenusAdapterError("walletAddress must be a valid EVM address.", "CONTRACT_READ_FAILED");
    const wallet = normalizeAddress(walletAddress);
    const observedAt = new Date().toISOString();
    const { contracts, blockNumber } = await bootstrap();
    const discovered = await discoverPools(contracts, blockNumber);
    const failedComptrollers: string[] = [];
    const results = await mapWithConcurrency(discovered.pools, 3, async (pool) => {
      try { return await scanPool(pool, wallet, contracts, blockNumber, observedAt); }
      catch { failedComptrollers.push(pool.comptroller); return undefined; }
    });
    const positions = results.filter((item): item is VenusPoolPositionSnapshot => Boolean(item));
    const coreFailed = failedComptrollers.includes(normalizeAddress(contracts.corePoolComptroller!));
    return {
      walletAddress: wallet, network: options.chain.network, chainId: options.chain.definition.chainId, blockNumber, observedAt, contracts, positions,
      coverage: {
        corePool: coreFailed ? "FAILED" : "AVAILABLE",
        isolatedPools: !contracts.poolRegistry || !discovered.isolatedOk ? "FAILED" : failedComptrollers.some((address) => address !== normalizeAddress(contracts.corePoolComptroller!)) ? "PARTIAL" : "AVAILABLE",
        failedComptrollers,
      },
    };
  }

  return { getStatus, getWalletPositions };
}

export { classifyVenusRisk, VENUS_PRESENTATION_THRESHOLDS } from "./risk.js";
export { formatUsd1e18 as formatVenusUsd };
