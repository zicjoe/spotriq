import type {
  Activation,
  ActivityEvent,
  AgentService,
  Finding,
  PermissionGrant,
  SmartMoneyPlanTemplate,
} from "../domain/types";
import { apiRequest } from "../api/client";
import type { MarketplaceRepository } from "./marketplaceRepository";

/**
 * Real API implementation. It is deliberately present before the backend is
 * connected so the Figma UI and mock repository share the same seam.
 */
export class ApiMarketplaceRepository implements MarketplaceRepository {
  listServices() {
    return apiRequest<AgentService[]>("/v1/services");
  }

  getService(serviceId: string) {
    return apiRequest<AgentService>(`/v1/services/${serviceId}`).catch((error: unknown) => {
      if (error instanceof Error && "status" in error && (error as { status?: number }).status === 404) return undefined;
      throw error;
    });
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

  listPlans() {
    return apiRequest<SmartMoneyPlanTemplate[]>("/v1/plans");
  }
}
