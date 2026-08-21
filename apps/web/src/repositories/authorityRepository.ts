import type {
  ApiEnvelope,
  AltanaTestnetProbeResponse,
  BoundedPermissionGrantResponse,
  BoundedPermissionRequestResponse,
  GuardRebalancingCallRequest,
  GuardRebalancingCallResponse,
  ObserveAltanaTestnetProbeRequest,
  ReverifyAltanaTestnetProbeRequest,
  VerifyTrustedAgentBindingResponse,
  PrepareBoundedPermissionRequest,
  ReconcileAltanaGrantRequest,
} from "@spotriq/api-contracts";
import type { AgentAuthorityBinding, AltanaGrantProof, AltanaTestnetProbeObservation, AltanaTestnetProbeProof, BoundedPermissionGrant, BoundedPermissionRequest, RebalancingExecutionGuardReport, RebalancingJobIntent } from "../domain/types";
import { ApiError, apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface AuthorityRepository {
  prepare(jobIntentId: string, input: PrepareBoundedPermissionRequest): Promise<{ request: BoundedPermissionRequest; intent?: RebalancingJobIntent }>;
  getRequest(permissionRequestId: string): Promise<BoundedPermissionRequest>;
  revise(permissionRequestId: string, input: PrepareBoundedPermissionRequest): Promise<{ request: BoundedPermissionRequest; intent?: RebalancingJobIntent }>;
  reconcile(permissionRequestId: string, proof: AltanaGrantProof): Promise<{ grant: BoundedPermissionGrant; intent?: RebalancingJobIntent }>;
  getGrant(permissionGrantId: string): Promise<BoundedPermissionGrant>;
  reverify(permissionGrantId: string): Promise<{ grant: BoundedPermissionGrant; intent?: RebalancingJobIntent }>;
  verifyTrustedAgentBinding(permissionRequestId: string): Promise<{ binding: AgentAuthorityBinding; request: BoundedPermissionRequest; intent?: RebalancingJobIntent }>;
  guardCall(permissionRequestId: string, input: GuardRebalancingCallRequest): Promise<{ report: RebalancingExecutionGuardReport; request: BoundedPermissionRequest }>;
  observeTestnetProbe(jobIntentId: string, proof: AltanaTestnetProbeProof): Promise<AltanaTestnetProbeObservation>;
  getTestnetProbe(probeId: string): Promise<AltanaTestnetProbeObservation>;
  getTestnetProbeForJob(jobIntentId: string): Promise<AltanaTestnetProbeObservation | undefined>;
  reverifyTestnetProbe(probeId: string, revocationTransactionHash?: string): Promise<AltanaTestnetProbeObservation>;
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

  async verifyTrustedAgentBinding(permissionRequestId: string) {
    return unwrap(await apiRequest<ApiEnvelope<VerifyTrustedAgentBindingResponse>>(`/v1/permissions/${encodeURIComponent(permissionRequestId)}/trusted-agent-binding`, { method: "POST", body: JSON.stringify({}) }));
  }
  async guardCall(permissionRequestId: string, input: GuardRebalancingCallRequest) {
    return unwrap(await apiRequest<ApiEnvelope<GuardRebalancingCallResponse>>(`/v1/permissions/${encodeURIComponent(permissionRequestId)}/execution-guard`, { method: "POST", body: JSON.stringify(input) }));
  }
  async observeTestnetProbe(jobIntentId: string, proof: AltanaTestnetProbeProof) {
    const payload: ObserveAltanaTestnetProbeRequest = { proof };
    return unwrap(await apiRequest<ApiEnvelope<AltanaTestnetProbeResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/altana-testnet-probes`, { method: "POST", body: JSON.stringify(payload) })).probe;
  }
  async getTestnetProbe(probeId: string) {
    return unwrap(await apiRequest<ApiEnvelope<AltanaTestnetProbeResponse>>(`/v1/altana-testnet-probes/${encodeURIComponent(probeId)}`)).probe;
  }
  async getTestnetProbeForJob(jobIntentId: string) {
    try {
      return unwrap(await apiRequest<ApiEnvelope<AltanaTestnetProbeResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/altana-testnet-probe`)).probe;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) return undefined;
      throw cause;
    }
  }
  async reverifyTestnetProbe(probeId: string, revocationTransactionHash?: string) {
    const payload: ReverifyAltanaTestnetProbeRequest = { revocationTransactionHash };
    return unwrap(await apiRequest<ApiEnvelope<AltanaTestnetProbeResponse>>(`/v1/altana-testnet-probes/${encodeURIComponent(probeId)}/reverify`, { method: "POST", body: JSON.stringify(payload) })).probe;
  }
}

export const authorityRepository: AuthorityRepository = new ApiAuthorityRepository();
