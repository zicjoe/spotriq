import type {
  ApiEnvelope,
  BoundedPermissionGrantResponse,
  BoundedPermissionRequestResponse,
  PrepareBoundedPermissionRequest,
  ReconcileAltanaGrantRequest,
} from "@spotriq/api-contracts";
import type { AltanaGrantProof, BoundedPermissionGrant, BoundedPermissionRequest, RebalancingJobIntent } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface AuthorityRepository {
  prepare(jobIntentId: string, input: PrepareBoundedPermissionRequest): Promise<{ request: BoundedPermissionRequest; intent?: RebalancingJobIntent }>;
  getRequest(permissionRequestId: string): Promise<BoundedPermissionRequest>;
  revise(permissionRequestId: string, input: PrepareBoundedPermissionRequest): Promise<{ request: BoundedPermissionRequest; intent?: RebalancingJobIntent }>;
  reconcile(permissionRequestId: string, proof: AltanaGrantProof): Promise<{ grant: BoundedPermissionGrant; intent?: RebalancingJobIntent }>;
  getGrant(permissionGrantId: string): Promise<BoundedPermissionGrant>;
  reverify(permissionGrantId: string): Promise<{ grant: BoundedPermissionGrant; intent?: RebalancingJobIntent }>;
}

export class ApiAuthorityRepository implements AuthorityRepository {
  async prepare(jobIntentId: string, input: PrepareBoundedPermissionRequest) {
    return unwrap(await apiRequest<ApiEnvelope<BoundedPermissionRequestResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/permissions`, {
      method: "POST",
      body: JSON.stringify(input),
    }));
  }
  async getRequest(permissionRequestId: string) {
    return unwrap(await apiRequest<ApiEnvelope<BoundedPermissionRequestResponse>>(`/v1/permissions/${encodeURIComponent(permissionRequestId)}`)).request;
  }
  async revise(permissionRequestId: string, input: PrepareBoundedPermissionRequest) {
    return unwrap(await apiRequest<ApiEnvelope<BoundedPermissionRequestResponse>>(`/v1/permissions/${encodeURIComponent(permissionRequestId)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }));
  }
  async reconcile(permissionRequestId: string, proof: AltanaGrantProof) {
    const payload: ReconcileAltanaGrantRequest = { proof };
    return unwrap(await apiRequest<ApiEnvelope<BoundedPermissionGrantResponse>>(`/v1/permissions/${encodeURIComponent(permissionRequestId)}/reconcile`, {
      method: "POST",
      body: JSON.stringify(payload),
    }));
  }
  async getGrant(permissionGrantId: string) {
    return unwrap(await apiRequest<ApiEnvelope<BoundedPermissionGrantResponse>>(`/v1/permission-grants/${encodeURIComponent(permissionGrantId)}`)).grant;
  }
  async reverify(permissionGrantId: string) {
    return unwrap(await apiRequest<ApiEnvelope<BoundedPermissionGrantResponse>>(`/v1/permission-grants/${encodeURIComponent(permissionGrantId)}/reverify`, {
      method: "POST",
      body: JSON.stringify({}),
    }));
  }
}

export const authorityRepository: AuthorityRepository = new ApiAuthorityRepository();
