import type {
  Activation,
  ActivityEvent,
  AgentService,
  Finding,
  PermissionGrant,
} from "../domain/types";
import type {
  ApiEnvelope,
  MarketplaceServiceDetailResponse,
  MarketplaceServicesResponse,
} from "@spotriq/api-contracts";
import { apiRequest } from "../api/client";
import type { MarketplaceRepository } from "./marketplaceRepository";

function unwrap<T>(value: ApiEnvelope<T>): T { return value.data; }

/**
 * Real API implementation for the original Figma marketplace seam.
 *
 * The live `/v1/services` API now returns marketplace service records so that
 * identity, listing, service, offer, permission and readiness remain distinct.
 * This compatibility repository intentionally projects only `record.service`
 * for legacy UI consumers that still expect AgentService objects.
 */
export class ApiMarketplaceRepository implements MarketplaceRepository {
  async listServices() {
    const response = unwrap(await apiRequest<ApiEnvelope<MarketplaceServicesResponse>>("/v1/services"));
    return response.page.services.map((record) => record.service);
  }

  async getService(serviceId: string) {
    try {
      const response = unwrap(await apiRequest<ApiEnvelope<MarketplaceServiceDetailResponse>>(`/v1/services/${encodeURIComponent(serviceId)}`));
      return response.record.service;
    } catch (error: unknown) {
      if (error instanceof Error && "status" in error && (error as { status?: number }).status === 404) return undefined;
      throw error;
    }
  }

  listFindings() {
    return apiRequest<Finding[]>("/v1/findings");
  }

  listActivations() {
    return apiRequest<Activation[]>("/v1/activations");
  }

  listPermissionGrants() {
    return apiRequest<PermissionGrant[]>("/v1/permissions");
  }

  listActivity() {
    return apiRequest<ActivityEvent[]>("/v1/activity");
  }

}
