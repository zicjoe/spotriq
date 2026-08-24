import type { ApiEnvelope, ServiceTaskForJobResponse, ServiceTaskResponse } from "@spotriq/api-contracts";
import type { RebalancingJobIntent, ServiceTask } from "../domain/types";
import { apiRequest } from "../api/client";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

export interface ServiceTaskOperationResult {
  task: ServiceTask;
  intent?: RebalancingJobIntent;
}

export interface ServiceTaskRepository {
  invoke(jobIntentId: string): Promise<ServiceTaskOperationResult>;
  getForJob(jobIntentId: string): Promise<ServiceTask | null>;
  get(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
  reconcile(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
  retry(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
  cancel(serviceTaskId: string): Promise<ServiceTaskOperationResult>;
}

export class ApiServiceTaskRepository implements ServiceTaskRepository {
  private async post(path: string): Promise<ServiceTaskOperationResult> {
    const data = unwrap(await apiRequest<ApiEnvelope<ServiceTaskResponse>>(path, { method: "POST", body: JSON.stringify({}) }));
    return { task: data.task, intent: data.intent };
  }

  invoke(jobIntentId: string) { return this.post(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/service-tasks`); }
  async getForJob(jobIntentId: string) {
    return unwrap(await apiRequest<ApiEnvelope<ServiceTaskForJobResponse>>(`/v1/job-intents/${encodeURIComponent(jobIntentId)}/service-task`)).task;
  }
  async get(serviceTaskId: string) {
    const data = unwrap(await apiRequest<ApiEnvelope<ServiceTaskResponse>>(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}`));
    return { task: data.task, intent: data.intent };
  }
  reconcile(serviceTaskId: string) { return this.post(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}/reconcile`); }
  retry(serviceTaskId: string) { return this.post(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}/retry`); }
  cancel(serviceTaskId: string) { return this.post(`/v1/service-tasks/${encodeURIComponent(serviceTaskId)}/cancel`); }
}

export const serviceTaskRepository: ServiceTaskRepository = new ApiServiceTaskRepository();
