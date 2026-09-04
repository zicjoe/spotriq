import type { FastifyInstance } from "fastify";
import type { GridMarketContextReader } from "@spotriq/market-context";
import type { PancakeSwapReader } from "@spotriq/protocol-pancakeswap";
import type { VenusReader } from "@spotriq/protocol-venus";
import type { BscNetwork } from "@spotriq/domain";
import {
  assessReferenceAgentIdentityBinding,
  getReferenceAgentDefinition,
  handleReferenceAgentJsonRpc,
  referenceAgentCard,
  REFERENCE_AGENT_DEFINITIONS,
  referenceAgentCardPath,
  type ReferenceAgentIdentityBinding,
  type ReferenceAgentSlug,
} from "@spotriq/reference-agents";


function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function requestNetwork(body: unknown): BscNetwork | undefined {
  const envelope = objectValue(body);
  const params = objectValue(envelope?.params);
  const directInput = objectValue(params?.input);
  const direct = directInput?.network;
  if (direct === "mainnet" || direct === "testnet") return direct;
  const message = objectValue(params?.message);
  const parts = Array.isArray(message?.parts) ? message!.parts : [];
  for (const partValue of parts) {
    const part = objectValue(partValue);
    const data = objectValue(part?.data);
    const subject = objectValue(data?.subject);
    const network = subject?.network ?? objectValue(data?.input)?.network;
    if (network === "mainnet" || network === "testnet") return network;
  }
  return undefined;
}

export async function registerReferenceAgentRoutes(
  app: FastifyInstance,
  input: {
    publicBaseUrl: string;
    pancakeSwap: PancakeSwapReader;
    venus: VenusReader;
    marketContext: GridMarketContextReader;
    runtimeByNetwork?: Partial<Record<BscNetwork, { pancakeSwap: PancakeSwapReader; venus: VenusReader; marketContext: GridMarketContextReader }>>;
    identityBindings?: Partial<Record<ReferenceAgentSlug, ReferenceAgentIdentityBinding>>;
  },
): Promise<void> {
  app.get("/v1/reference-agents", async (_request, reply) => reply.send({
    data: {
      agents: REFERENCE_AGENT_DEFINITIONS.map((definition) => {
        const binding = input.identityBindings?.[definition.slug];
        const expectedCardUrl = `${input.publicBaseUrl}${referenceAgentCardPath(definition.slug)}`;
        const assessment = assessReferenceAgentIdentityBinding(definition, binding, expectedCardUrl);
        return {
          slug: definition.slug,
          name: definition.name,
          category: definition.category,
          description: definition.description,
          action: definition.action,
          protocols: definition.protocols,
          authority: "READ_ONLY",
          commercialState: "UNDECLARED",
          erc8004Registration: assessment.verified ? "REGISTERED_VERIFIED" : assessment.configured ? "CONFIGURED_UNVERIFIED" : "REQUIRED_AFTER_PUBLIC_DEPLOYMENT",
          ...(assessment.verified && binding ? { erc8004Identity: { chainId: binding.chainId, agentId: binding.agentId, registryAddress: binding.verification.registryAddress, ownerAddress: binding.verification.ownerAddress } } : {}),
        };
      }),
    },
    meta: { generatedAt: new Date().toISOString() },
  }));

  app.get<{ Params: { slug: string } }>("/v1/reference-agents/:slug/.well-known/agent-card.json", async (request, reply) => {
    const definition = getReferenceAgentDefinition(request.params.slug);
    if (!definition) return reply.code(404).send({ error: { code: "REFERENCE_AGENT_NOT_FOUND", message: "Unknown Spotriq reference agent." } });
    return reply.type("application/json").send(referenceAgentCard(definition, input.publicBaseUrl, input.identityBindings?.[definition.slug]));
  });

  app.post<{ Params: { slug: string }; Body: unknown }>("/v1/reference-agents/:slug/a2a", async (request, reply) => {
    const definition = getReferenceAgentDefinition(request.params.slug);
    if (!definition) return reply.code(404).send({ jsonrpc: "2.0", id: null, error: { code: -32004, message: "Unknown Spotriq reference agent." } });
    const network = requestNetwork(request.body);
    const runtime = (network ? input.runtimeByNetwork?.[network] : undefined) ?? {
      pancakeSwap: input.pancakeSwap,
      venus: input.venus,
      marketContext: input.marketContext,
    };
    const response = await handleReferenceAgentJsonRpc(request.params.slug, request.body, runtime);
    return reply.type("application/json").send(response);
  });
}
