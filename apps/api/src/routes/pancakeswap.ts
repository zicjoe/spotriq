import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  PancakeSwapPositionResponse,
  PancakeSwapStatusResponse,
  PancakeSwapWalletPositionsResponse,
} from "@spotriq/api-contracts";
import type { PancakeSwapProtocolVersion } from "@spotriq/domain";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import { ApiInputError } from "../errors.js";

function generatedAt() {
  return new Date().toISOString();
}

function parseVersion(value: string): PancakeSwapProtocolVersion {
  const normalized = value.trim().toLowerCase();
  if (normalized === "v3") return "V3";
  if (normalized === "infinity-cl" || normalized === "infinity_cl" || normalized === "infinity") return "INFINITY_CL";
  throw new ApiInputError("version must be 'v3' or 'infinity-cl'.", "INVALID_PROTOCOL_VERSION");
}

function parseTokenId(value: string): string {
  if (!/^\d+$/.test(value)) throw new ApiInputError("tokenId must be a non-negative decimal integer.", "INVALID_TOKEN_ID");
  return value;
}

function parseBlockNumber(value: unknown): string | undefined {
  if (value === undefined || value === "") return undefined;
  if (typeof value !== "string" || !/^\d+$/.test(value)) {
    throw new ApiInputError("block must be a decimal BSC block number.", "INVALID_BLOCK_NUMBER");
  }
  return value;
}

function parseMax(value: unknown): number | undefined {
  if (value === undefined || value === "") return undefined;
  const parsed = typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new ApiInputError("max must be an integer between 1 and 100.", "INVALID_LIMIT");
  }
  return parsed;
}

function assertWalletAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new ApiInputError("address must be a valid EVM wallet address.", "INVALID_ADDRESS");
  }
  return value.toLowerCase();
}

export async function registerPancakeSwapRoutes(app: FastifyInstance, pancakeSwap: PancakeSwapReader): Promise<void> {
  app.get("/v1/protocols/pancakeswap/status", async (request, reply) => {
    const data: PancakeSwapStatusResponse = pancakeSwap.getStatus();
    const body: ApiEnvelope<PancakeSwapStatusResponse> = {
      data,
      meta: { requestId: request.id, generatedAt: generatedAt() },
    };
    return reply.send(body);
  });

  app.get<{
    Params: { version: string; tokenId: string };
    Querystring: { block?: string };
  }>("/v1/protocols/pancakeswap/positions/:version/:tokenId", async (request, reply) => {
    const version = parseVersion(request.params.version);
    const tokenId = parseTokenId(request.params.tokenId);
    const blockNumber = parseBlockNumber(request.query.block);
    const position = await pancakeSwap.getPosition(version, tokenId, blockNumber);
    const data: PancakeSwapPositionResponse = { position };
    const body: ApiEnvelope<PancakeSwapPositionResponse> = {
      data,
      meta: { requestId: request.id, generatedAt: generatedAt() },
    };
    return reply.send(body);
  });

  app.get<{
    Params: { address: string };
    Querystring: { max?: string };
  }>("/v1/wallets/:address/pancakeswap/positions", async (request, reply) => {
    const address = assertWalletAddress(request.params.address);
    const max = parseMax(request.query.max);
    const snapshot = await pancakeSwap.getWalletPositions(address, max);
    const data: PancakeSwapWalletPositionsResponse = { snapshot };
    const body: ApiEnvelope<PancakeSwapWalletPositionsResponse> = {
      data,
      meta: { requestId: request.id, generatedAt: generatedAt() },
    };
    return reply.send(body);
  });
}
