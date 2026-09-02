import { performance } from "node:perf_hooks";
import type {
  BscBlockSummary,
  BscNetwork,
  BscNetworkDefinition,
  BscTransactionReceiptSummary,
  BscTransactionSummary,
  DependencyHealth,
  Erc20BalanceSnapshot,
  NativeBalanceSnapshot,
  WalletBalanceSnapshot,
} from "@spotriq/domain";
import { bscSourceRef, createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";
import { assertStructuredJsonBudget } from "@spotriq/security-hardening";

export const BSC_NETWORKS: Record<BscNetwork, BscNetworkDefinition> = {
  mainnet: {
    network: "mainnet",
    chainId: 56,
    nativeSymbol: "BNB",
    explorerUrl: "https://bscscan.com",
    defaultRpcUrls: [
      "https://bsc-dataseed.bnbchain.org",
      "https://bsc-dataseed-public.bnbchain.org",
    ],
  },
  testnet: {
    network: "testnet",
    chainId: 97,
    nativeSymbol: "tBNB",
    explorerUrl: "https://testnet.bscscan.com",
    defaultRpcUrls: [
      "https://bsc-testnet-dataseed.bnbchain.org",
      "https://bsc-testnet.bnbchain.org",
    ],
  },
};

export class BscChainError extends Error {
  constructor(
    message: string,
    public readonly code: "INVALID_ADDRESS" | "INVALID_HASH" | "RPC_UNAVAILABLE" | "RPC_RESPONSE_INVALID" | "CHAIN_ID_MISMATCH" | "TOKEN_CALL_FAILED",
    public readonly retryable = false,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "BscChainError";
  }
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0";
  id: number;
  result?: T;
  error?: { code: number; message: string; data?: unknown };
}

export interface BscRpcEndpointStatus {
  url: string;
  role: "primary" | "secondary";
  state: "ok" | "unavailable" | "chain_mismatch" | "invalid_response" | "unchecked";
  blockNumber?: string;
  latencyMs?: number;
  detail?: string;
}

export interface BscChainStatus {
  network: BscNetwork;
  expectedChainId: number;
  rpcMode: "configured" | "official_public_fallback";
  latestBlockNumber?: string;
  activeRpcUrl?: string;
  blockDivergence?: {
    state: "consistent" | "divergent" | "insufficient";
    minBlockNumber?: string;
    maxBlockNumber?: string;
    spreadBlocks?: string;
    toleranceBlocks: number;
  };
  endpoints: BscRpcEndpointStatus[];
}

export interface BscChainReader {
  readonly network: BscNetwork;
  readonly definition: BscNetworkDefinition;
  readonly rpcMode: "configured" | "official_public_fallback";
  getStatus(): Promise<BscChainStatus>;
  getHealth(): Promise<DependencyHealth>;
  getBlockNumber(): Promise<string>;
  getBlock(block?: "latest" | string): Promise<BscBlockSummary>;
  getTransaction(hash: string): Promise<BscTransactionSummary | null>;
  getTransactionReceipt(hash: string): Promise<BscTransactionReceiptSummary | null>;
  getNativeBalance(walletAddress: string, blockNumber?: string): Promise<NativeBalanceSnapshot>;
  getErc20Balance(tokenAddress: string, walletAddress: string, blockNumber?: string): Promise<Erc20BalanceSnapshot>;
  getWalletBalances(walletAddress: string, tokenAddresses?: string[]): Promise<WalletBalanceSnapshot>;
  callContract(contractAddress: string, data: string, blockNumber?: string): Promise<{ data: string; blockNumber: string }>;
  callContractFrom(contractAddress: string, data: string, fromAddress: string, blockNumber?: string): Promise<{ data: string; blockNumber: string }>;
}

export interface BscChainAdapterOptions {
  network: BscNetwork;
  primaryRpcUrl?: string;
  secondaryRpcUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  rpcResponseMaxBytes?: number;
  rpcDivergenceToleranceBlocks?: number;
}

function assertAddress(address: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    throw new BscChainError(`Invalid EVM address: ${address}`, "INVALID_ADDRESS");
  }
  return address.toLowerCase();
}

function assertHash(hash: string): string {
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new BscChainError(`Invalid transaction/block hash: ${hash}`, "INVALID_HASH");
  }
  return hash.toLowerCase();
}

function hexToBigInt(value: string): bigint {
  if (!/^0x[0-9a-fA-F]+$/.test(value)) throw new BscChainError(`Invalid hexadecimal RPC value: ${value}`, "RPC_RESPONSE_INVALID");
  return BigInt(value);
}

function hexToNumber(value: string): number {
  const parsed = hexToBigInt(value);
  if (parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new BscChainError(`RPC number exceeds JS safe integer: ${value}`, "RPC_RESPONSE_INVALID");
  return Number(parsed);
}

function formatUnits(raw: bigint, decimals: number): string {
  const negative = raw < 0n;
  const value = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = value % base;
  const fractionText = fraction.toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fractionText ? `.${fractionText}` : ""}`;
}

function padAddress(address: string): string {
  return assertAddress(address).slice(2).padStart(64, "0");
}

function decodeAbiString(result: string): string | undefined {
  if (!result || result === "0x") return undefined;
  const hex = result.slice(2);
  try {
    if (hex.length === 64) {
      const bytes = Buffer.from(hex, "hex");
      return bytes.toString("utf8").replace(/\0+$/, "") || undefined;
    }
    if (hex.length < 128) return undefined;
    const offset = Number(BigInt(`0x${hex.slice(0, 64)}`)) * 2;
    const length = Number(BigInt(`0x${hex.slice(offset, offset + 64)}`));
    const start = offset + 64;
    return Buffer.from(hex.slice(start, start + length * 2), "hex").toString("utf8") || undefined;
  } catch {
    return undefined;
  }
}

function blockTagFromNumber(blockNumber: string): string {
  if (!/^\d+$/.test(blockNumber)) throw new BscChainError(`Invalid non-negative block number: ${blockNumber}`, "RPC_RESPONSE_INVALID");
  const value = BigInt(blockNumber);
  return `0x${value.toString(16)}`;
}

function assertHexData(value: string, label = "RPC hex data"): string {
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(value)) throw new BscChainError(`${label} must be a 0x-prefixed even-length hexadecimal string.`, "RPC_RESPONSE_INVALID");
  return value.toLowerCase();
}

function safeRpcReference(value: string): string {
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "configured-rpc";
  }
}

export class BscChainAdapter implements BscChainReader {
  readonly network: BscNetwork;
  readonly definition: BscNetworkDefinition;
  readonly rpcMode: "configured" | "official_public_fallback";
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly rpcResponseMaxBytes: number;
  private readonly rpcDivergenceToleranceBlocks: number;
  private readonly endpoints: { url: string; role: "primary" | "secondary" }[];
  private requestId = 0;
  private readonly verifiedChainIds = new Map<string, boolean>();

  constructor(options: BscChainAdapterOptions) {
    this.network = options.network;
    this.definition = BSC_NETWORKS[options.network];
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 7_500;
    this.rpcResponseMaxBytes = Math.max(16_384, options.rpcResponseMaxBytes ?? 1_000_000);
    this.rpcDivergenceToleranceBlocks = Math.max(0, Math.floor(options.rpcDivergenceToleranceBlocks ?? 5));
    this.rpcMode = options.primaryRpcUrl || options.secondaryRpcUrl ? "configured" : "official_public_fallback";
    const primary = options.primaryRpcUrl?.trim() || this.definition.defaultRpcUrls[0];
    const secondary = options.secondaryRpcUrl?.trim() || this.definition.defaultRpcUrls[1];
    this.endpoints = [
      { url: primary, role: "primary" },
      ...(secondary !== primary ? [{ url: secondary, role: "secondary" as const }] : []),
    ];
  }

  private async rawRequest<T>(url: string, method: string, params: unknown[]): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const requestId = ++this.requestId;
    try {
      const response = await this.fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method, params }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (Number.isFinite(declaredLength) && declaredLength > this.rpcResponseMaxBytes) {
        throw new BscChainError(`RPC response exceeded the ${this.rpcResponseMaxBytes}-byte limit.`, "RPC_RESPONSE_INVALID");
      }
      const reader = response.body?.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      if (reader) {
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          received += next.value.byteLength;
          if (received > this.rpcResponseMaxBytes) {
            await reader.cancel();
            throw new BscChainError(`RPC response exceeded the ${this.rpcResponseMaxBytes}-byte limit.`, "RPC_RESPONSE_INVALID");
          }
          chunks.push(next.value);
        }
      }
      const bytes = new Uint8Array(received);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const text = new TextDecoder().decode(bytes);
      let parsed: unknown;
      try { parsed = JSON.parse(text); }
      catch { throw new BscChainError("RPC response was not valid JSON.", "RPC_RESPONSE_INVALID"); }
      assertStructuredJsonBudget(parsed, { maxDepth: 16, maxNodes: 8192, maxArrayLength: 4096, maxObjectKeys: 256, maxStringLength: 1_000_000 });
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new BscChainError("RPC response must be a JSON-RPC object.", "RPC_RESPONSE_INVALID");
      const body = parsed as Partial<JsonRpcResponse<T>>;
      if (body.jsonrpc !== "2.0") throw new BscChainError("RPC response did not declare JSON-RPC 2.0.", "RPC_RESPONSE_INVALID");
      if (body.id !== requestId) throw new BscChainError(`RPC response id ${String(body.id)} did not match request id ${requestId}.`, "RPC_RESPONSE_INVALID");
      if (body.error !== undefined) {
        if (!body.error || typeof body.error.code !== "number" || typeof body.error.message !== "string") throw new BscChainError("RPC response contained a malformed error object.", "RPC_RESPONSE_INVALID");
        throw new Error(`RPC ${body.error.code}: ${body.error.message}`);
      }
      if (body.result === undefined) throw new BscChainError("RPC response did not contain result.", "RPC_RESPONSE_INVALID");
      return body.result;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async verifyEndpoint(url: string): Promise<void> {
    if (this.verifiedChainIds.get(url)) return;
    const chainIdHex = await this.rawRequest<string>(url, "eth_chainId", []);
    const chainId = hexToNumber(chainIdHex);
    if (chainId !== this.definition.chainId) {
      throw new BscChainError(
        `RPC endpoint returned chain ID ${chainId}; Spotriq expected ${this.definition.chainId} for BSC ${this.network}.`,
        "CHAIN_ID_MISMATCH",
        false,
        { url, expected: this.definition.chainId, actual: chainId },
      );
    }
    this.verifiedChainIds.set(url, true);
  }

  async request<T>(method: string, params: unknown[] = [], validate?: (result: T) => void): Promise<{ result: T; rpcUrl: string }> {
    const failures: { url: string; message: string }[] = [];
    for (const endpoint of this.endpoints) {
      try {
        if (method !== "eth_chainId") await this.verifyEndpoint(endpoint.url);
        const result = await this.rawRequest<T>(endpoint.url, method, params);
        validate?.(result);
        return { result, rpcUrl: endpoint.url };
      } catch (error) {
        failures.push({ url: endpoint.url, message: error instanceof Error ? error.message : String(error) });
      }
    }
    throw new BscChainError(
      `All configured BSC ${this.network} RPC endpoints failed for ${method}.`,
      "RPC_UNAVAILABLE",
      true,
      failures,
    );
  }

  async getStatus(): Promise<BscChainStatus> {
    const statuses: BscRpcEndpointStatus[] = [];
    const observedBlocks: Array<{ url: string; block: bigint }> = [];
    for (const endpoint of this.endpoints) {
      const started = performance.now();
      try {
        const chainIdHex = await this.rawRequest<string>(endpoint.url, "eth_chainId", []);
        const chainId = hexToNumber(chainIdHex);
        if (chainId !== this.definition.chainId) {
          statuses.push({ ...endpoint, state: "chain_mismatch", latencyMs: Math.round(performance.now() - started), detail: `Expected chain ${this.definition.chainId}, received ${chainId}.` });
          continue;
        }
        this.verifiedChainIds.set(endpoint.url, true);
        const blockHex = await this.rawRequest<string>(endpoint.url, "eth_blockNumber", []);
        const block = hexToBigInt(blockHex);
        const blockNumber = block.toString();
        statuses.push({ ...endpoint, state: "ok", blockNumber, latencyMs: Math.round(performance.now() - started) });
        observedBlocks.push({ url: endpoint.url, block });
      } catch (error) {
        statuses.push({
          ...endpoint,
          state: error instanceof BscChainError && error.code === "RPC_RESPONSE_INVALID" ? "invalid_response" : "unavailable",
          latencyMs: Math.round(performance.now() - started),
          detail: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const sorted = [...observedBlocks].sort((a, b) => a.block < b.block ? -1 : a.block > b.block ? 1 : 0);
    const min = sorted[0]?.block;
    const max = sorted.at(-1)?.block;
    const spread = min !== undefined && max !== undefined ? max - min : undefined;
    const tolerance = BigInt(this.rpcDivergenceToleranceBlocks);
    const blockDivergence: BscChainStatus["blockDivergence"] = observedBlocks.length < 2
      ? { state: "insufficient", minBlockNumber: min?.toString(), maxBlockNumber: max?.toString(), spreadBlocks: spread?.toString(), toleranceBlocks: this.rpcDivergenceToleranceBlocks }
      : { state: spread! > tolerance ? "divergent" : "consistent", minBlockNumber: min!.toString(), maxBlockNumber: max!.toString(), spreadBlocks: spread!.toString(), toleranceBlocks: this.rpcDivergenceToleranceBlocks };
    const activeRpcUrl = statuses.find((item) => item.state === "ok")?.url;
    return {
      network: this.network,
      expectedChainId: this.definition.chainId,
      rpcMode: this.rpcMode,
      latestBlockNumber: max?.toString(),
      activeRpcUrl,
      blockDivergence,
      endpoints: statuses,
    };
  }

  async getHealth(): Promise<DependencyHealth> {
    const started = performance.now();
    try {
      const status = await this.getStatus();
      const healthy = status.endpoints.some((endpoint) => endpoint.state === "ok");
      const divergent = status.blockDivergence?.state === "divergent";
      return {
        name: "bsc-rpc",
        state: healthy ? (this.rpcMode === "configured" && !divergent ? "ok" : "degraded") : "unavailable",
        latencyMs: Math.round(performance.now() - started),
        detail: healthy
          ? divergent
            ? `BSC ${this.network} RPC endpoints diverge by ${status.blockDivergence?.spreadBlocks ?? "unknown"} blocks (tolerance ${status.blockDivergence?.toleranceBlocks ?? this.rpcDivergenceToleranceBlocks}); decision-grade reads continue through explicit block-pinned calls and health is degraded.`
            : this.rpcMode === "configured"
              ? `BSC ${this.network} RPC reachable.`
              : `Using official public BSC ${this.network} fallback RPC. Configure BSC_RPC_PRIMARY for production-grade access.`
          : `No BSC ${this.network} RPC endpoint is reachable.`,
      };
    } catch (error) {
      return {
        name: "bsc-rpc",
        state: "unavailable",
        latencyMs: Math.round(performance.now() - started),
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getBlockNumber(): Promise<string> {
    const { result } = await this.request<string>("eth_blockNumber", [], (candidate) => { hexToBigInt(candidate); });
    return hexToBigInt(result).toString();
  }

  async getBlock(block: "latest" | string = "latest"): Promise<BscBlockSummary> {
    const tag = block === "latest" ? "latest" : blockTagFromNumber(block);
    const { result } = await this.request<null | {
      number: string; hash: string; parentHash: string; timestamp: string;
    }>("eth_getBlockByNumber", [tag, false], (candidate) => {
      if (!candidate) throw new BscChainError(`BSC block ${block} was not found.`, "RPC_RESPONSE_INVALID");
      const candidateNumber = hexToBigInt(candidate.number).toString();
      if (block !== "latest" && candidateNumber !== BigInt(block).toString()) throw new BscChainError(`RPC returned block ${candidateNumber} for requested block ${block}.`, "RPC_RESPONSE_INVALID");
      assertHash(candidate.hash); assertHash(candidate.parentHash); hexToBigInt(candidate.timestamp);
    });
    if (!result) throw new BscChainError(`BSC block ${block} was not found.`, "RPC_RESPONSE_INVALID");
    const number = hexToBigInt(result.number).toString();
    if (block !== "latest" && number !== BigInt(block).toString()) throw new BscChainError(`RPC returned block ${number} for requested block ${block}.`, "RPC_RESPONSE_INVALID");
    const timestampSeconds = hexToBigInt(result.timestamp);
    if (timestampSeconds > BigInt(Number.MAX_SAFE_INTEGER)) throw new BscChainError("RPC block timestamp exceeds the supported range.", "RPC_RESPONSE_INVALID");
    const timestamp = new Date(Number(timestampSeconds) * 1000);
    if (!Number.isFinite(timestamp.getTime())) throw new BscChainError("RPC block timestamp is invalid.", "RPC_RESPONSE_INVALID");
    return { network: this.network, chainId: this.definition.chainId, number, hash: assertHash(result.hash), parentHash: assertHash(result.parentHash), timestamp: timestamp.toISOString() };
  }

  async getTransaction(hash: string): Promise<BscTransactionSummary | null> {
    const normalized = assertHash(hash);
    const { result } = await this.request<null | {
      hash: string; blockNumber?: string | null; blockHash?: string | null; from: string; to?: string | null;
      value: string; input: string; transactionIndex?: string | null;
    }>("eth_getTransactionByHash", [normalized], (candidate) => {
      if (!candidate) return;
      if (assertHash(candidate.hash) !== normalized) throw new BscChainError("RPC transaction response hash does not match the requested transaction.", "RPC_RESPONSE_INVALID");
      assertAddress(candidate.from); if(candidate.to) assertAddress(candidate.to); hexToBigInt(candidate.value); assertHexData(candidate.input, "RPC transaction input");
    });
    if (!result) return null;
    const returnedHash = assertHash(result.hash);
    if (returnedHash !== normalized) throw new BscChainError("RPC transaction response hash does not match the requested transaction.", "RPC_RESPONSE_INVALID");
    return {
      network: this.network,
      chainId: this.definition.chainId,
      hash: returnedHash,
      blockNumber: result.blockNumber ? hexToBigInt(result.blockNumber).toString() : undefined,
      blockHash: result.blockHash ? assertHash(result.blockHash) : undefined,
      from: assertAddress(result.from),
      to: result.to ? assertAddress(result.to) : undefined,
      valueRaw: hexToBigInt(result.value).toString(),
      input: assertHexData(result.input, "RPC transaction input"),
      transactionIndex: result.transactionIndex ? hexToNumber(result.transactionIndex) : undefined,
    };
  }

  async getTransactionReceipt(hash: string): Promise<BscTransactionReceiptSummary | null> {
    const normalized = assertHash(hash);
    const { result } = await this.request<null | {
      transactionHash: string; blockNumber: string; blockHash: string; status: string; gasUsed: string; effectiveGasPrice?: string;
      logs?: Array<{ address: string; topics: string[]; data: string; logIndex?: string | null; transactionIndex?: string | null }>;
    }>("eth_getTransactionReceipt", [normalized], (candidate) => {
      if (!candidate) return;
      if (assertHash(candidate.transactionHash) !== normalized) throw new BscChainError("RPC receipt transactionHash does not match the requested transaction.", "RPC_RESPONSE_INVALID");
      hexToBigInt(candidate.blockNumber); assertHash(candidate.blockHash); hexToBigInt(candidate.status); hexToBigInt(candidate.gasUsed);
      for(const log of candidate.logs ?? []){assertAddress(log.address);for(const topic of log.topics)assertHash(topic);assertHexData(log.data,"RPC log data");}
    });
    if (!result) return null;
    const returnedHash = assertHash(result.transactionHash);
    if (returnedHash !== normalized) throw new BscChainError("RPC receipt transactionHash does not match the requested transaction.", "RPC_RESPONSE_INVALID");
    return {
      network: this.network,
      chainId: this.definition.chainId,
      transactionHash: returnedHash,
      blockNumber: hexToBigInt(result.blockNumber).toString(),
      blockHash: assertHash(result.blockHash),
      status: hexToBigInt(result.status) === 1n ? "SUCCESS" : "REVERTED",
      gasUsedRaw: hexToBigInt(result.gasUsed).toString(),
      effectiveGasPriceRaw: result.effectiveGasPrice ? hexToBigInt(result.effectiveGasPrice).toString() : undefined,
      logs: result.logs?.map((log) => ({
        address: assertAddress(log.address),
        topics: log.topics.map((topic) => assertHash(topic)),
        data: assertHexData(log.data, "RPC log data"),
        logIndex: log.logIndex ? hexToNumber(log.logIndex) : undefined,
        transactionIndex: log.transactionIndex ? hexToNumber(log.transactionIndex) : undefined,
      })),
    };
  }

  async getNativeBalance(walletAddress: string, blockNumber?: string): Promise<NativeBalanceSnapshot> {
    const wallet = assertAddress(walletAddress);
    const observedBlock = blockNumber ?? await this.getBlockNumber();
    const observedAt = new Date().toISOString();
    const { result, rpcUrl } = await this.request<string>("eth_getBalance", [wallet, blockTagFromNumber(observedBlock)], (candidate) => { hexToBigInt(candidate); });
    const raw = hexToBigInt(result);
    const evidence = createEvidenceEnvelope({
      subjectType: "wallet",
      subjectId: wallet,
      metric: "wallet.native_balance",
      value: raw.toString(),
      unit: "wei",
      provenance: "external",
      source: DATA_SOURCES.BSC_RPC,
      sourceRef: bscSourceRef(this.network, observedBlock),
      observedAt,
      confidence: "high",
      method: EVIDENCE_METHODS.NATIVE_BALANCE,
      methodInputs: [wallet, observedBlock, safeRpcReference(rpcUrl)],
      chainContext: {
        chain: "BSC",
        network: this.network,
        chainId: this.definition.chainId,
        blockNumber: observedBlock,
        finality: "LATEST",
      },
    });
    return {
      assetType: "native",
      chain: "BSC",
      network: this.network,
      chainId: this.definition.chainId,
      symbol: this.definition.nativeSymbol,
      decimals: 18,
      balanceRaw: raw.toString(),
      balanceFormatted: formatUnits(raw, 18),
      walletAddress: wallet,
      blockNumber: observedBlock,
      observedAt,
      evidence,
    };
  }

  private async ethCall(to: string, data: string, blockNumber: string): Promise<{ result: string; rpcUrl: string }> {
    return this.request<string>("eth_call", [{ to: assertAddress(to), data }, blockTagFromNumber(blockNumber)], (result) => { assertHexData(result, "eth_call result"); });
  }

  async callContract(contractAddress: string, data: string, blockNumber?: string): Promise<{ data: string; blockNumber: string }> {
    const contract = assertAddress(contractAddress);
    if (!/^0x[0-9a-fA-F]*$/.test(data) || data.length % 2 !== 0) {
      throw new BscChainError("Contract calldata must be a 0x-prefixed even-length hexadecimal string.", "RPC_RESPONSE_INVALID");
    }
    const observedBlock = blockNumber ?? await this.getBlockNumber();
    const { result } = await this.ethCall(contract, data, observedBlock);
    return { data: assertHexData(result, "eth_call result"), blockNumber: observedBlock };
  }

  async callContractFrom(contractAddress: string, data: string, fromAddress: string, blockNumber?: string): Promise<{ data: string; blockNumber: string }> {
    const contract = assertAddress(contractAddress);
    const from = assertAddress(fromAddress);
    if (!/^0x[0-9a-fA-F]*$/.test(data) || data.length % 2 !== 0) {
      throw new BscChainError("Contract calldata must be a 0x-prefixed even-length hexadecimal string.", "RPC_RESPONSE_INVALID");
    }
    const observedBlock = blockNumber ?? await this.getBlockNumber();
    const { result } = await this.request<string>("eth_call", [{ to: contract, from, data }, blockTagFromNumber(observedBlock)], (candidate) => { assertHexData(candidate, "eth_call result"); });
    return { data: assertHexData(result, "eth_call result"), blockNumber: observedBlock };
  }

  async getErc20Balance(tokenAddress: string, walletAddress: string, blockNumber?: string): Promise<Erc20BalanceSnapshot> {
    const token = assertAddress(tokenAddress);
    const wallet = assertAddress(walletAddress);
    const observedBlock = blockNumber ?? await this.getBlockNumber();
    const observedAt = new Date().toISOString();
    try {
      const [{ result: balanceHex, rpcUrl }, decimalsCall, symbolCall, nameCall] = await Promise.all([
        this.ethCall(token, `0x70a08231${padAddress(wallet)}`, observedBlock),
        this.ethCall(token, "0x313ce567", observedBlock).catch(() => undefined),
        this.ethCall(token, "0x95d89b41", observedBlock).catch(() => undefined),
        this.ethCall(token, "0x06fdde03", observedBlock).catch(() => undefined),
      ]);
      const raw = hexToBigInt(balanceHex);
      const decodedDecimals = decimalsCall?.result && decimalsCall.result !== "0x" ? hexToNumber(decimalsCall.result) : undefined;
      const decimals = decodedDecimals !== undefined && decodedDecimals <= 255 ? decodedDecimals : undefined;
      const symbol = symbolCall?.result ? decodeAbiString(symbolCall.result) : undefined;
      const name = nameCall?.result ? decodeAbiString(nameCall.result) : undefined;
      const evidence = createEvidenceEnvelope({
        subjectType: "wallet-token",
        subjectId: `${wallet}:${token}`,
        metric: "wallet.erc20_balance",
        value: raw.toString(),
        unit: "token-raw",
        provenance: "external",
        source: DATA_SOURCES.BSC_RPC,
        sourceRef: bscSourceRef(this.network, observedBlock),
        observedAt,
        confidence: "high",
        method: EVIDENCE_METHODS.ERC20_BALANCE,
        methodInputs: [wallet, token, observedBlock, safeRpcReference(rpcUrl)],
        chainContext: {
          chain: "BSC",
          network: this.network,
          chainId: this.definition.chainId,
          blockNumber: observedBlock,
          finality: "LATEST",
        },
      });
      return {
        assetType: "erc20",
        chain: "BSC",
        network: this.network,
        chainId: this.definition.chainId,
        tokenAddress: token,
        symbol,
        name,
        decimals,
        balanceRaw: raw.toString(),
        balanceFormatted: decimals !== undefined ? formatUnits(raw, decimals) : undefined,
        walletAddress: wallet,
        blockNumber: observedBlock,
        observedAt,
        evidence,
      };
    } catch (error) {
      if (error instanceof BscChainError) throw error;
      throw new BscChainError(`Unable to read ERC-20 balance for ${token}.`, "TOKEN_CALL_FAILED", true, error);
    }
  }

  async getWalletBalances(walletAddress: string, tokenAddresses: string[] = []): Promise<WalletBalanceSnapshot> {
    const wallet = assertAddress(walletAddress);
    const normalizedTokens = tokenAddresses.map(assertAddress);
    const blockNumber = await this.getBlockNumber();
    const observedAt = new Date().toISOString();
    const native = await this.getNativeBalance(wallet, blockNumber);
    const tokenResults = await Promise.allSettled(normalizedTokens.map((token) => this.getErc20Balance(token, wallet, blockNumber)));
    const tokens = tokenResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const failedTokenAddresses = tokenResults.flatMap((result, index) => result.status === "rejected" ? [normalizedTokens[index]] : []);
    const failedCount = failedTokenAddresses.length;
    return {
      walletAddress: wallet,
      chain: "BSC",
      network: this.network,
      chainId: this.definition.chainId,
      blockNumber,
      observedAt,
      native,
      tokens,
      coverage: {
        nativeBalance: "AVAILABLE",
        tokenBalances: normalizedTokens.length === 0 ? "NOT_REQUESTED" : failedCount === 0 ? "AVAILABLE" : "PARTIAL",
        failedTokenAddresses,
      },
    };
  }
}

export function createBscChainAdapter(options: BscChainAdapterOptions): BscChainAdapter {
  return new BscChainAdapter(options);
}
