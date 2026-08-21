import type {
  ApiEnvelope,
  PrepareRebalancingJobIntentRequest,
  RebalancingJobIntentResponse,
  ReviseRebalancingJobIntentRequest,
} from "@spotriq/api-contracts";
import type { RebalancingJobConstraints, RebalancingJobIntent } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface JobIntentRepository {
  prepare(checkSessionId: string, findingId: string, serviceId: string, constraints?: PrepareRebalancingJobIntentRequest["constraints"]): Promise<RebalancingJobIntent>;
  get(jobIntentId: string): Promise<RebalancingJobIntent>;
  revise(jobIntentId: string, constraints: Partial<Omit<RebalancingJobConstraints, "executionMode" | "maxActionCount">>): Promise<RebalancingJobIntent>;
  confirm(jobIntentId: string): Promise<RebalancingJobIntent>;
}

export class ApiJobIntentRepository implements JobIntentRepository {
  async prepare(checkSessionId: string, findingId: string, serviceId: string, constraints?: PrepareRebalancingJobIntentRequest["constraints"]) {
    const payload: PrepareRebalancingJobIntentRequest = { serviceId, constraints };
    return unwrap(await apiRequest<ApiEnvelope<RebalancingJobIntentResponse>>(`/v1/checks/${encodeURIComponent(checkSessionId)}/findings/${encodeURIComponent(findingId)}/job-intents`, {
      method: "POST",
      body: JSON.stringify(payload),
    })).intent;
  }

  async get(jobIntentId: string) {
    return unwrap(await apiRequest<ApiEnvelope<RebalancingJobIntentResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}`)).intent;
  }

  async revise(jobIntentId: string, constraints: Partial<Omit<RebalancingJobConstraints, "executionMode" | "maxActionCount">>) {
    const payload: ReviseRebalancingJobIntentRequest = { constraints };
    return unwrap(await apiRequest<ApiEnvelope<RebalancingJobIntentResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })).intent;
  }

  async confirm(jobIntentId: string) {
    return unwrap(await apiRequest<ApiEnvelope<RebalancingJobIntentResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/confirm`, {
      method: "POST",
      body: JSON.stringify({}),
    })).intent;
  }
}

export const jobIntentRepository: JobIntentRepository = new ApiJobIntentRepository();
