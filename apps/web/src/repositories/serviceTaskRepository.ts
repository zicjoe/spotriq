import type {
  ActivationRuntimeStateResponse,
  ApiEnvelope,
  InvokeActivationServiceTaskRequest,
  ServiceTaskForActivationResponse,
  ServiceTaskForJobResponse,
  ServiceTaskResponse,
} from "@spotriq/api-contracts";
import type { ActivationRuntimeState, RebalancingJobIntent, ServiceTask } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface ServiceTaskOperationResult {
  task: ServiceTask;
  intent?: RebalancingJobIntent;
}

export interface ServiceTaskRepository {
  invoke(jobIntentId: string): Promise<ServiceTaskOperationResult>;
  invokeActivation(activationId: string, input: InvokeActivationServiceTaskRequest): Promise<ServiceTaskOperationResult>;
  getForJob(jobIntentId: string): Promise<ServiceTask | null>;
  getForActivation(activationId: string): Promise<ServiceTask | null>;
  getActivationRuntimeState(activationId: string): Promise<ActivationRuntimeState>;
  retryActivation(activationId: string, input: InvokeActivationServiceTaskRequest): Promise<ServiceTaskOperationResult>;
  get(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
  reconcile(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
  retry(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
  cancel(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
}

export class ApiServiceTaskRepository implements ServiceTaskRepository {
  private async post(path: string, body: unknown = {}): Promise<ServiceTaskOperationResult> {
    const data = unwrap(await apiRequest<ApiEnvelope<ServiceTaskResponse>>(path, { method: "POST", body: JSON.stringify(body) }));
    return { task: data.task, intent: data.intent };
  }

  invoke(jobIntentId: string) { return this.post(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/service-tasks`); }
  invokeActivation(activationId: string, input: InvokeActivationServiceTaskRequest) { return this.post(`/v1/activations/${encodeURIComponent(activationId)}/service-tasks`, input); }
  async getForJob(jobIntentId: string) {
    return unwrap(await apiRequest<ApiEnvelope<ServiceTaskForJobResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/service-task`)).task;
  }
  async getForActivation(activationId: string) {
    return unwrap(await apiRequest<ApiEnvelope<ServiceTaskForActivationResponse>>(`/v1/activations/${encodeURIComponent(activationId)}/service-task`)).task;
  }
  async getActivationRuntimeState(activationId: string) {
    return unwrap(await apiRequest<ApiEnvelope<ActivationRuntimeStateResponse>>(`/v1/activations/${encodeURIComponent(activationId)}/runtime-state`)).state;
  }
  retryActivation(activationId: string, input: InvokeActivationServiceTaskRequest) { return this.post(`/v1/activations/${encodeURIComponent(activationId)}/service-task/retry`, input); }
  async get(serviceTaskId: string) {
    const data = unwrap(await apiRequest<ApiEnvelope<ServiceTaskResponse>>(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}`));
    return { task: data.task, intent: data.intent };
  }
  reconcile(serviceTaskId: string) { return this.post(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}/reconcile`); }
  retry(serviceTaskId: string) { return this.post(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}/retry`); }
  cancel(serviceTaskId: string) { return this.post(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}/cancel`); }
}

export const serviceTaskRepository: ServiceTaskRepository = new ApiServiceTaskRepository();
