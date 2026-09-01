import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  CreateGroundedExplanationRequest,
  GroundedExplanationPacketResponse,
  GroundedExplanationResponse,
  GroundedExplanationStatusResponse,
  GroundedExplanationSubjectRequest,
} from "@spotriq/api-contracts";
import type { GroundedExplanationEngine } from "@spotriq/grounded-explanations";
import { ApiInputError } from "../errors.js";

function envelope<T>(data: T, requestId: string): ApiEnvelope<T> { return { data, meta: { requestId, generatedAt: new Date().toISOString() } }; }
function body<T>(value: T | undefined): T {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiInputError("A JSON request body is required.", "INVALID_BODY");
  return value;
}
function subject(input: GroundedExplanationSubjectRequest) {
  return { type: input.subjectType, id: input.subjectId, contextId: input.contextId, buyerAddress: input.buyerAddress } as const;
}

export async function registerGroundedExplanationRoutes(app: FastifyInstance, explanations: GroundedExplanationEngine) {
  app.get("/v1/explanations/status", async (request, reply) => {
    const data: GroundedExplanationStatusResponse = { status: await explanations.getStatus() };
    return reply.send(envelope(data, request.id));
  });
  app.post<{ Body: GroundedExplanationSubjectRequest }>("/v1/explanations/grounding", async (request, reply) => {
    const input = body(request.body);
    const data: GroundedExplanationPacketResponse = { packet: await explanations.buildPacket(subject(input)) };
    return reply.send(envelope(data, request.id));
  });
  app.post<{ Body: CreateGroundedExplanationRequest }>("/v1/explanations", async (request, reply) => {
    const input = body(request.body);
    const explanation = await explanations.explain({ subject: subject(input), style: input.style });
    const data: GroundedExplanationResponse = { explanation };
    return reply.code(201).send(envelope(data, request.id));
  });
  app.get<{ Params: { explanationId: string } }>("/v1/explanations/:explanationId", async (request, reply) => {
    const data: GroundedExplanationResponse = { explanation: await explanations.get(request.params.explanationId) };
    return reply.send(envelope(data, request.id));
  });
}
