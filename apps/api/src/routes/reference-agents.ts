import type { FastifyInstance } from "fastify";
import type { GridMarketContextReader } from "@spotriq/market-context";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { VenusReader } from "@spotriq/protocol-venus";
import {
  getReferenceAgentDefinition,
  handleReferenceAgentJsonRpc,
  referenceAgentCard,
  REFERENCE_AGENT_DEFINITIONS,
} from "@spotriq/reference-agents";

export async function registerReferenceAgentRoutes(
  app: FastifyInstance,
  input: {
    publicBaseUrl: string;
    pancakeSwap: PancakeSwapReader;
    venus: VenusReader;
    marketContext: GridMarketContextReader;
  },
): Promise<void> {
  app.get("/v1/reference-agents", async (_request, reply) => reply.send({
    data: {
      agents: REFERENCE_AGENT_DEFINITIONS.map((definition) => ({
        slug: definition.slug,
        name: definition.name,
        category: definition.category,
        description: definition.description,
        action: definition.action,
        protocols: definition.protocols,
        authority: "READ_ONLY",
        commercialState: "UNDECLARED",
        erc8004Registration: "REQUIRED_AFTER_PUBLIC_DEPLOYMENT",
      })),
    },
    meta: { generatedAt: new Date().toISOString() },
  }));

  app.get<{ Params: { slug: string } }>("/v1/reference-agents/:slug/.well-known/agent-card.json", async (request, reply) => {
    const definition = getReferenceAgentDefinition(request.params.slug);
    if (!definition) return reply.code(404).send({ error: { code: "REFERENCE_AGENT_NOT_FOUND", message: "Unknown Spotriq reference agent." } });
    return reply.type("application/json").send(referenceAgentCard(definition, input.publicBaseUrl));
  });

  app.post<{ Params: { slug: string }; Body: unknown }>("/v1/reference-agents/:slug/a2a", async (request, reply) => {
    const definition = getReferenceAgentDefinition(request.params.slug);
    if (!definition) return reply.code(404).send({ jsonrpc: "2.0", id: null, error: { code: -32004, message: "Unknown Spotriq reference agent." } });
    const response = await handleReferenceAgentJsonRpc(request.params.slug, request.body, {
      pancakeSwap: input.pancakeSwap,
      venus: input.venus,
      marketContext: input.marketContext,
    });
    return reply.type("application/json").send(response);
  });
}
