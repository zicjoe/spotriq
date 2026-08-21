import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  PrepareRebalancingJobIntentRequest,
  RebalancingJobIntentResponse,
  ReviseRebalancingJobIntentRequest,
} from "@spotriq/api-contracts";
import type { JobIntentEngine } from "@spotriq/job-intents";
import { JobIntentError } from "@spotriq/job-intents";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import type { SmartMoneyEngine } from "@spotriq/smart-money";
import { ApiInputError } from "../errors.js";

function assertId(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 512) throw new ApiInputError(`${label} is invalid.`, "INVALID_ID");
  return normalized;
}

function generatedAt(): string { return new Date().toISOString(); }

export async function registerJobIntentRoutes(
  app: FastifyInstance,
  smartMoney: SmartMoneyEngine,
  marketplaceSupply: MarketplaceSupplyReader,
  jobIntents: JobIntentEngine,
): Promise<void> {
  app.post<{
    Params: { checkSessionId: string; findingId: string };
    Body: PrepareRebalancingJobIntentRequest;
  }>("/v1/checks/:checkSessionId/findings/:findingId/job-intents", async (request, reply) => {
    const checkSessionId = assertId(request.params.checkSessionId, "checkSessionId");
    const findingId = assertId(request.params.findingId, "findingId");
    const serviceId = assertId(request.body?.serviceId ?? "", "serviceId");
    const snapshot = await smartMoney.getCheck(checkSessionId);
    if (!snapshot) throw new JobIntentError(`Smart Money Check ${checkSessionId} was not found.`, "INVALID_INPUT");
    const finding = snapshot.findings.find((item) => item.findingId === findingId);
    if (!finding) throw new JobIntentError(`Finding ${findingId} was not found in Smart Money Check ${checkSessionId}.`, "INVALID_INPUT");
    const page = await marketplaceSupply.matchFinding(finding, { limit: 20 });
    const match = page.matches.find((candidate) => candidate.serviceId === serviceId);
    if (!match) {
      throw new JobIntentError("The selected AgentService is not a current compatible match for this Finding.", "MATCH_REQUIRED", false, { findingId, serviceId });
    }
    const intent = await jobIntents.prepare({
      session: snapshot.session,
      finding,
      match,
      constraints: request.body?.constraints,
    });
    const data: RebalancingJobIntentResponse = { intent };
    const body: ApiEnvelope<RebalancingJobIntentResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.code(201).send(body);
  });

  app.get<{ Params: { jobIntentId: string } }>("/v1/job-intents/:jobIntentId", async (request, reply) => {
    const intent = await jobIntents.get(assertId(request.params.jobIntentId, "jobIntentId"));
    const data: RebalancingJobIntentResponse = { intent };
    const body: ApiEnvelope<RebalancingJobIntentResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.patch<{ Params: { jobIntentId: string }; Body: ReviseRebalancingJobIntentRequest }>("/v1/job-intents/:jobIntentId", async (request, reply) => {
    if (!request.body?.constraints || typeof request.body.constraints !== "object") throw new ApiInputError("constraints are required.", "INVALID_JOB_CONSTRAINTS");
    const intent = await jobIntents.revise(assertId(request.params.jobIntentId, "jobIntentId"), request.body.constraints);
    const data: RebalancingJobIntentResponse = { intent };
    const body: ApiEnvelope<RebalancingJobIntentResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { jobIntentId: string } }>("/v1/job-intents/:jobIntentId/confirm", async (request, reply) => {
    const intent = await jobIntents.confirm(assertId(request.params.jobIntentId, "jobIntentId"));
    const data: RebalancingJobIntentResponse = { intent };
    const body: ApiEnvelope<RebalancingJobIntentResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });
}
