import type { FastifyInstance } from "fastify";
import type {
  ApiEnvelope,
  BoundedPermissionGrantResponse,
  BoundedPermissionRequestResponse,
  PrepareBoundedPermissionRequest,
  ReconcileAltanaGrantRequest,
} from "@spotriq/api-contracts";
import type { AuthorityEngine } from "@spotriq/authority";
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
}
