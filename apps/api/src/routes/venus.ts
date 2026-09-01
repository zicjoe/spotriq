import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, VenusMarketCatalogResponse, VenusStatusResponse, VenusWalletPositionsResponse, VenusYieldOpportunitiesResponse } from "@spotriq/api-contracts";
import type { VenusReader } from "@spotriq/protocol-venus";
import { ApiInputError } from "../errors.js";

function generatedAt() { return new Date().toISOString(); }
function assertWalletAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new ApiInputError("address must be a valid EVM wallet address.", "INVALID_ADDRESS");
  return value.toLowerCase();
}

export async function registerVenusRoutes(app: FastifyInstance, venus: VenusReader): Promise<void> {
  app.get("/v1/protocols/venus/status", async (request, reply) => {
    const data: VenusStatusResponse = await venus.getStatus();
    const body: ApiEnvelope<VenusStatusResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get("/v1/protocols/venus/markets", async (request, reply) => {
    const snapshot = await venus.getMarketCatalog();
    const data: VenusMarketCatalogResponse = { snapshot };
    const body: ApiEnvelope<VenusMarketCatalogResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { address: string } }>("/v1/wallets/:address/venus/yield-opportunities", async (request, reply) => {
    const address = assertWalletAddress(request.params.address);
    const snapshot = await venus.getYieldOpportunities(address);
    const data: VenusYieldOpportunitiesResponse = { snapshot };
    const body: ApiEnvelope<VenusYieldOpportunitiesResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { address: string } }>("/v1/wallets/:address/venus/positions", async (request, reply) => {
    const address = assertWalletAddress(request.params.address);
    const snapshot = await venus.getWalletPositions(address);
    const data: VenusWalletPositionsResponse = { snapshot };
    const body: ApiEnvelope<VenusWalletPositionsResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });
}
