import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, AgentDiscoveryDetailResponse, AgentDiscoveryResponse, AgentFeedbackResponse, AgentRegistryStatusResponse } from "@spotriq/api-contracts";
import type { AgentRegistryChainId } from "@spotriq/domain";
import type { AgentRegistryReader } from "@spotriq/agent-registry";
import { ApiInputError } from "../errors.js";

function generatedAt() { return new Date().toISOString(); }
function parseChainId(value: string | number | undefined, fallback: AgentRegistryChainId): AgentRegistryChainId {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (parsed === 56 || parsed === 97) return parsed;
  throw new ApiInputError("chainId must be 56 (BSC mainnet) or 97 (BSC testnet).", "INVALID_CHAIN_ID");
}
function parsePositive(value: string | undefined, fallback: number, max = 100): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max) throw new ApiInputError(`Expected an integer between 1 and ${max}.`, "INVALID_PAGINATION");
  return parsed;
}
function assertAgentId(value: string): string {
  if (!/^\d+$/.test(value)) throw new ApiInputError("agentId must be a numeric ERC-8004 token ID.", "INVALID_AGENT_ID");
  return value;
}
function assertAddress(value: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new ApiInputError("address must be a valid EVM wallet address.", "INVALID_ADDRESS");
  return value.toLowerCase();
}

export async function registerAgentRoutes(app: FastifyInstance, registry: AgentRegistryReader, defaultChainId: AgentRegistryChainId): Promise<void> {
  app.get("/v1/registry/status", async (request, reply) => {
    const data: AgentRegistryStatusResponse = { status: await registry.getStatus() };
    const body: ApiEnvelope<AgentRegistryStatusResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Querystring: { chainId?: string; page?: string; limit?: string; search?: string; protocol?: string } }>("/v1/agents", async (request, reply) => {
    const page = await registry.listAgents({
      chainId: parseChainId(request.query.chainId, defaultChainId),
      page: parsePositive(request.query.page, 1, 1_000_000),
      limit: parsePositive(request.query.limit, 20),
      search: request.query.search,
      protocol: request.query.protocol,
    });
    const data: AgentDiscoveryResponse = { page };
    const body: ApiEnvelope<AgentDiscoveryResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Querystring: { q?: string; chainId?: string; limit?: string; semanticWeight?: string } }>("/v1/agents/search", async (request, reply) => {
    const q = request.query.q?.trim();
    if (!q) throw new ApiInputError("q is required for semantic agent search.", "INVALID_SEARCH_QUERY");
    const semanticWeight = request.query.semanticWeight === undefined ? undefined : Number(request.query.semanticWeight);
    if (semanticWeight !== undefined && (!Number.isFinite(semanticWeight) || semanticWeight < 0 || semanticWeight > 1)) {
      throw new ApiInputError("semanticWeight must be between 0 and 1.", "INVALID_SEARCH_WEIGHT");
    }
    const page = await registry.searchAgents(q, {
      chainId: parseChainId(request.query.chainId, defaultChainId),
      limit: parsePositive(request.query.limit, 20),
      semanticWeight,
    });
    const data: AgentDiscoveryResponse = { page };
    const body: ApiEnvelope<AgentDiscoveryResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { chainId: string; agentId: string } }>("/v1/agents/:chainId/:agentId", async (request, reply) => {
    const chainId = parseChainId(request.params.chainId, defaultChainId);
    const agent = await registry.getAgent(chainId, assertAgentId(request.params.agentId));
    const data: AgentDiscoveryDetailResponse = { agent };
    const body: ApiEnvelope<AgentDiscoveryDetailResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { chainId: string; agentId: string } }>("/v1/agents/:chainId/:agentId/feedback", async (request, reply) => {
    const chainId = parseChainId(request.params.chainId, defaultChainId);
    const page = await registry.getFeedback(chainId, assertAgentId(request.params.agentId));
    const data: AgentFeedbackResponse = { page };
    const body: ApiEnvelope<AgentFeedbackResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { address: string }; Querystring: { page?: string; limit?: string } }>("/v1/accounts/:address/agents", async (request, reply) => {
    const page = await registry.getAgentsByOwner(assertAddress(request.params.address), {
      page: parsePositive(request.query.page, 1, 1_000_000),
      limit: parsePositive(request.query.limit, 20),
    });
    const data: AgentDiscoveryResponse = { page };
    const body: ApiEnvelope<AgentDiscoveryResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });
}
