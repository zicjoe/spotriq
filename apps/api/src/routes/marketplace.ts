import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  MarketplaceListingResponse,
  MarketplaceServiceDetailResponse,
  MarketplaceServiceEvidenceResponse,
  MarketplaceServiceReadinessResponse,
  MarketplaceServicesResponse,
  MarketplaceServiceTestsResponse,
  MarketplaceSupplyStatusResponse,
} from "@spotriq/api-contracts";
import type { AgentRegistryChainId, ServiceCategory } from "@spotriq/domain";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { ApiInputError } from "../errors.js";

function generatedAt(): string { return new Date().toISOString(); }

function parseChainId(value: string | undefined, fallback: AgentRegistryChainId): AgentRegistryChainId {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (parsed === 56 || parsed === 97) return parsed;
  throw new ApiInputError("chainId must be 56 or 97.", "INVALID_CHAIN_ID");
}

function parsePositive(value: string | undefined, fallback: number, max = 100): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) throw new ApiInputError(`Expected an integer between 1 and ${max}.`, "INVALID_PAGINATION");
  return parsed;
}

function parseCategory(value: string | undefined): ServiceCategory | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === "rebalancing" || value === "grid" || value === "yield" || value === "health") return value;
  throw new ApiInputError("category must be rebalancing, grid, yield, or health.", "INVALID_SERVICE_CATEGORY");
}

export async function registerMarketplaceRoutes(app: FastifyInstance, supply: MarketplaceSupplyReader, defaultChainId: AgentRegistryChainId): Promise<void> {
  app.get("/v1/marketplace/status", async (request, reply) => {
    const data: MarketplaceSupplyStatusResponse = { status: await supply.getStatus() };
    const body: ApiEnvelope<MarketplaceSupplyStatusResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Querystring: { chainId?: string; page?: string; limit?: string; search?: string } }>("/v1/listings", async (request, reply) => {
    const page = await supply.listListings({
      chainId: parseChainId(request.query.chainId, defaultChainId),
      page: parsePositive(request.query.page, 1, 1_000_000),
      limit: parsePositive(request.query.limit, 20),
      search: request.query.search,
    });
    const data: MarketplaceListingResponse = { page };
    const body: ApiEnvelope<MarketplaceListingResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Querystring: { chainId?: string; page?: string; limit?: string; search?: string; category?: string } }>("/v1/services", async (request, reply) => {
    const page = await supply.listServices({
      chainId: parseChainId(request.query.chainId, defaultChainId),
      page: parsePositive(request.query.page, 1, 1_000_000),
      limit: parsePositive(request.query.limit, 20),
      search: request.query.search,
      category: parseCategory(request.query.category),
    });
    const data: MarketplaceServicesResponse = { page };
    const body: ApiEnvelope<MarketplaceServicesResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { serviceId: string } }>("/v1/services/:serviceId", async (request, reply) => {
    const record = await supply.getService(request.params.serviceId);
    const data: MarketplaceServiceDetailResponse = { record };
    const body: ApiEnvelope<MarketplaceServiceDetailResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { serviceId: string } }>("/v1/services/:serviceId/readiness", async (request, reply) => {
    const readiness = await supply.getReadiness(request.params.serviceId);
    const data: MarketplaceServiceReadinessResponse = { readiness };
    const body: ApiEnvelope<MarketplaceServiceReadinessResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { serviceId: string } }>("/v1/services/:serviceId/evidence", async (request, reply) => {
    const evidence = await supply.getEvidence(request.params.serviceId);
    const data: MarketplaceServiceEvidenceResponse = { evidence };
    const body: ApiEnvelope<MarketplaceServiceEvidenceResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { serviceId: string } }>("/v1/services/:serviceId/tests", async (request, reply) => {
    const tests = await supply.getTests(request.params.serviceId);
    const data: MarketplaceServiceTestsResponse = { tests };
    const body: ApiEnvelope<MarketplaceServiceTestsResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });
}
