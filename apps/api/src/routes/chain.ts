import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  ChainBlockResponse,
  ChainStatusResponse,
  ChainTransactionResponse,
  WalletBalancesResponse,
} from "@spotriq/api-contracts";
import type { BscChainReader } from "@spotriq/chain";
import { bscSourceRef, createEvidenceEnvelope, DATA_SOURCES } from "@spotriq/evidence";
import { ApiInputError } from "../errors.js";

function generatedAt() {
  return new Date().toISOString();
}

function safeRpcOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try { return new URL(value).origin; } catch { return "configured-rpc"; }
}

function parseTokenAddresses(value: unknown): string[] {
  if (value === undefined || value === "") return [];
  if (typeof value !== "string") throw new ApiInputError("tokens must be a comma-separated list of ERC-20 addresses.");
  const tokens = [...new Set(value.split(",").map((token) => token.trim()).filter(Boolean))];
  if (tokens.length > 20) throw new ApiInputError("A maximum of 20 token addresses can be read in one request.");
  return tokens;
}

export async function registerChainRoutes(app: FastifyInstance, chain: BscChainReader): Promise<void> {
  app.get("/v1/chain/status", async (request, reply) => {
    const internal = await chain.getStatus();
    const data: ChainStatusResponse = {
      ...internal,
      activeRpcUrl: safeRpcOrigin(internal.activeRpcUrl),
      endpoints: internal.endpoints.map((endpoint) => ({ ...endpoint, url: safeRpcOrigin(endpoint.url) ?? "configured-rpc" })),
    };
    const body: ApiEnvelope<ChainStatusResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { blockNumber: string } }>("/v1/chain/blocks/:blockNumber", async (request, reply) => {
    const requested = request.params.blockNumber === "latest" ? "latest" : request.params.blockNumber;
    if (requested !== "latest" && !/^\d+$/.test(requested)) throw new ApiInputError("blockNumber must be 'latest' or a decimal block number.");
    const block = await chain.getBlock(requested);
    const observedAt = new Date().toISOString();
    const evidence = [
      createEvidenceEnvelope({
        subjectType: "chain-block",
        subjectId: `${chain.network}:${block.number}`,
        metric: "chain.block",
        value: block.number,
        unit: "block",
        provenance: "external",
        source: DATA_SOURCES.BSC_RPC,
        sourceRef: bscSourceRef(chain.network, block.number),
        observedAt,
        confidence: "high",
        chainContext: {
          chain: "BSC",
          network: chain.network,
          chainId: chain.definition.chainId,
          blockNumber: block.number,
          blockHash: block.hash,
          finality: "LATEST",
        },
      }),
    ];
    const data: ChainBlockResponse = { block, evidence };
    const body: ApiEnvelope<ChainBlockResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { hash: string } }>("/v1/chain/transactions/:hash", async (request, reply) => {
    const [transaction, receipt] = await Promise.all([
      chain.getTransaction(request.params.hash),
      chain.getTransactionReceipt(request.params.hash),
    ]);
    const observedAt = new Date().toISOString();
    const evidence = transaction ? [
      createEvidenceEnvelope({
        subjectType: "transaction",
        subjectId: transaction.hash,
        metric: "transaction.state",
        value: receipt ? (receipt.status === "SUCCESS" ? "CONFIRMED_SUCCESS" : "CONFIRMED_REVERTED") : "PENDING_OR_UNCONFIRMED",
        provenance: "external",
        source: DATA_SOURCES.BSC_RPC,
        sourceRef: bscSourceRef(chain.network, transaction.blockNumber, transaction.hash),
        observedAt,
        confidence: "high",
        chainContext: {
          chain: "BSC",
          network: chain.network,
          chainId: chain.definition.chainId,
          blockNumber: receipt?.blockNumber ?? transaction.blockNumber,
          blockHash: receipt?.blockHash ?? transaction.blockHash,
          transactionHash: transaction.hash,
          finality: receipt ? "CONFIRMED" : "LATEST",
        },
      }),
      createEvidenceEnvelope({
        subjectType: "transaction",
        subjectId: transaction.hash,
        metric: "transaction.value",
        value: transaction.valueRaw,
        unit: "wei",
        provenance: "external",
        source: DATA_SOURCES.BSC_RPC,
        sourceRef: bscSourceRef(chain.network, transaction.blockNumber, transaction.hash),
        observedAt,
        confidence: "high",
        chainContext: {
          chain: "BSC",
          network: chain.network,
          chainId: chain.definition.chainId,
          blockNumber: transaction.blockNumber,
          blockHash: transaction.blockHash,
          transactionHash: transaction.hash,
          finality: receipt ? "CONFIRMED" : "LATEST",
        },
      }),
    ] : [];
    const data: ChainTransactionResponse = { transaction, receipt, evidence };
    const body: ApiEnvelope<ChainTransactionResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { address: string }; Querystring: { tokens?: string } }>("/v1/wallets/:address/balances", async (request, reply) => {
    const tokenAddresses = parseTokenAddresses(request.query.tokens);
    const snapshot = await chain.getWalletBalances(request.params.address, tokenAddresses);
    const data: WalletBalancesResponse = { snapshot };
    const body: ApiEnvelope<WalletBalancesResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });
}
