import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  BoundedPermissionGrantResponse,
  AltanaTestnetProbeResponse,
  BoundedPermissionRequestResponse,
  GuardRebalancingCallRequest,
  GuardRebalancingCallResponse,
  ObserveAltanaTestnetProbeRequest,
  PrepareBoundedPermissionRequest,
  ReconcileAltanaGrantRequest,
  ReverifyAltanaTestnetProbeRequest,
  VerifyTrustedAgentBindingResponse,
} from "@spotriq/api-contracts";
import type { AuthorityEngine } from "@spotriq/authority";
import { guardRebalancingProposal } from "@spotriq/execution-guard";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { randomUUID } from "node:crypto";
import type { JobIntentEngine } from "@spotriq/job-intents";
import { ApiInputError } from "../errors.js";

function generatedAt(): string { return new Date().toISOString(); }
function assertId(value: string | undefined, label: string): string {
  if (!value?.trim()) throw new ApiInputError(`${label} is required.`, "INVALID_ID");
  return value.trim();
}

function assertPrepareInput(body: PrepareBoundedPermissionRequest | undefined): PrepareBoundedPermissionRequest {
  if (!body || typeof body !== "object") throw new ApiInputError("Permission scope input is required.", "INVALID_PERMISSION_SCOPE");
  if (typeof body.token0Limit !== "string" || typeof body.token1Limit !== "string" || typeof body.validForMinutes !== "number") {
    throw new ApiInputError("token0Limit, token1Limit, and validForMinutes are required.", "INVALID_PERMISSION_SCOPE");
  }
  return body;
}

export async function registerAuthorityRoutes(
  app: FastifyInstance,
  authority: AuthorityEngine,
  jobIntents: JobIntentEngine,
  marketplaceSupply: MarketplaceSupplyReader,
): Promise<void> {
  app.post<{ Params: { jobIntentId: string }; Body: PrepareBoundedPermissionRequest }>("/v1/job-intents/:jobIntentId/permissions", async (request, reply) => {
    const jobIntentId = assertId(request.params.jobIntentId, "jobIntentId");
    const intent = await jobIntents.get(jobIntentId);
    const permission = await authority.prepare(intent, assertPrepareInput(request.body));
    const linkedIntent = await jobIntents.linkPermissionRequest(jobIntentId, permission);
    const data: BoundedPermissionRequestResponse = { request: permission, intent: linkedIntent };
    const body: ApiEnvelope<BoundedPermissionRequestResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.code(201).send(body);
  });

  app.get<{ Params: { permissionRequestId: string } }>("/v1/permissions/:permissionRequestId", async (request, reply) => {
    const permission = await authority.getRequest(assertId(request.params.permissionRequestId, "permissionRequestId"));
    const data: BoundedPermissionRequestResponse = { request: permission };
    const body: ApiEnvelope<BoundedPermissionRequestResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.patch<{ Params: { permissionRequestId: string }; Body: PrepareBoundedPermissionRequest }>("/v1/permissions/:permissionRequestId", async (request, reply) => {
    const permissionRequestId = assertId(request.params.permissionRequestId, "permissionRequestId");
    const existing = await authority.getRequest(permissionRequestId);
    const intent = await jobIntents.get(existing.jobIntentId);
    const permission = await authority.revise(permissionRequestId, intent, assertPrepareInput(request.body));
    const linkedIntent = await jobIntents.linkPermissionRequest(intent.jobIntentId, permission);
    const data: BoundedPermissionRequestResponse = { request: permission, intent: linkedIntent };
    const body: ApiEnvelope<BoundedPermissionRequestResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { permissionRequestId: string }; Body: ReconcileAltanaGrantRequest }>("/v1/permissions/:permissionRequestId/reconcile", async (request, reply) => {
    const permissionRequestId = assertId(request.params.permissionRequestId, "permissionRequestId");
    if (!request.body?.proof || typeof request.body.proof !== "object") throw new ApiInputError("Altana grant proof is required.", "INVALID_ALTANA_GRANT_PROOF");
    const grant = await authority.reconcile(permissionRequestId, request.body.proof);
    const intent = await jobIntents.linkPermissionGrant(grant.jobIntentId, grant);
    const data: BoundedPermissionGrantResponse = { grant, intent };
    const body: ApiEnvelope<BoundedPermissionGrantResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { permissionGrantId: string } }>("/v1/permission-grants/:permissionGrantId", async (request, reply) => {
    const grant = await authority.getGrant(assertId(request.params.permissionGrantId, "permissionGrantId"));
    const data: BoundedPermissionGrantResponse = { grant };
    const body: ApiEnvelope<BoundedPermissionGrantResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { permissionGrantId: string } }>("/v1/permission-grants/:permissionGrantId/reverify", async (request, reply) => {
    const grant = await authority.reverify(assertId(request.params.permissionGrantId, "permissionGrantId"));
    const intent = await jobIntents.linkPermissionGrant(grant.jobIntentId, grant);
    const data: BoundedPermissionGrantResponse = { grant, intent };
    const body: ApiEnvelope<BoundedPermissionGrantResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { permissionRequestId: string } }>("/v1/permissions/:permissionRequestId/trusted-agent-binding", async (request, reply) => {
    const permissionRequestId = assertId(request.params.permissionRequestId, "permissionRequestId");
    const existing = await authority.getRequest(permissionRequestId);
    const binding = await marketplaceSupply.verifyAuthorityBinding(existing.serviceId);
    if (binding.state !== "VERIFIED") throw new ApiInputError(binding.detail, "AGENT_AUTHORITY_BINDING_NOT_VERIFIED");
    const permission = await authority.applyTrustedAgentBinding(permissionRequestId, binding);
    const intent = await jobIntents.linkPermissionRequest(permission.jobIntentId, permission);
    const data: VerifyTrustedAgentBindingResponse = { binding, request: permission, intent };
    const body: ApiEnvelope<VerifyTrustedAgentBindingResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { permissionRequestId: string }; Body: GuardRebalancingCallRequest }>("/v1/permissions/:permissionRequestId/execution-guard", async (request, reply) => {
    const permissionRequestId = assertId(request.params.permissionRequestId, "permissionRequestId");
    if (!request.body?.call || typeof request.body.call.to !== "string" || typeof request.body.call.data !== "string") throw new ApiInputError("A proposed call with to and data is required.", "INVALID_EXECUTION_PROPOSAL");
    const permission = await authority.getRequest(permissionRequestId);
    const intent = await jobIntents.get(permission.jobIntentId);
    const proposal = {
      proposalId: request.body.proposalId?.trim() || `proposal_${randomUUID()}`,
      jobIntentId: intent.jobIntentId,
      permissionRequestId: permission.permissionRequestId,
      serviceId: intent.selectedService.serviceId,
      call: request.body.call,
      proposedAt: generatedAt(),
    };
    const report = guardRebalancingProposal({ intent, request: permission, proposal });
    const updated = await authority.applyExecutionGuard(permissionRequestId, report);
    const data: GuardRebalancingCallResponse = { report, request: updated };
    const body: ApiEnvelope<GuardRebalancingCallResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { jobIntentId: string }; Body: ObserveAltanaTestnetProbeRequest }>("/v1/job-intents/:jobIntentId/altana-testnet-probes", async (request, reply) => {
    const jobIntentId = assertId(request.params.jobIntentId, "jobIntentId");
    if (!request.body?.proof) throw new ApiInputError("Altana Testnet probe proof is required.", "INVALID_ALTANA_PROBE");
    const intent = await jobIntents.get(jobIntentId);
    const probe = await authority.observeTestnetProbe(intent, request.body.proof);
    const data: AltanaTestnetProbeResponse = { probe };
    const body: ApiEnvelope<AltanaTestnetProbeResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.code(201).send(body);
  });

  app.get<{ Params: { jobIntentId: string } }>("/v1/job-intents/:jobIntentId/altana-testnet-probe", async (request, reply) => {
    const jobIntentId = assertId(request.params.jobIntentId, "jobIntentId");
    const probe = await authority.getTestnetProbeForJob(jobIntentId);
    if (!probe) return reply.code(404).send({ error: { code: "ALTANA_TESTNET_PROBE_NOT_FOUND", message: "No Altana BSC Testnet probe has been recorded for this Job Intent." }, meta: { requestId: request.id, generatedAt: generatedAt() } });
    const data: AltanaTestnetProbeResponse = { probe };
    const body: ApiEnvelope<AltanaTestnetProbeResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { probeId: string } }>("/v1/altana-testnet-probes/:probeId", async (request, reply) => {
    const probe = await authority.getTestnetProbe(assertId(request.params.probeId, "probeId"));
    const data: AltanaTestnetProbeResponse = { probe };
    const body: ApiEnvelope<AltanaTestnetProbeResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.post<{ Params: { probeId: string }; Body: ReverifyAltanaTestnetProbeRequest }>("/v1/altana-testnet-probes/:probeId/reverify", async (request, reply) => {
    const probe = await authority.reverifyTestnetProbe(assertId(request.params.probeId, "probeId"), request.body ?? {});
    const data: AltanaTestnetProbeResponse = { probe };
    const body: ApiEnvelope<AltanaTestnetProbeResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });
}
