import {
  SERVICES,
  FINDINGS,
  ACTIVATIONS,
  PERMISSION_GRANTS,
  ACTIVITY_EVENTS,
  PLAN_TEMPLATES,
} from "../mocks/data";
import type {
  Activation,
  AgentService,
  Finding,
  PermissionGrant,
  ActivityEvent,
  SmartMoneyPlanTemplate,
} from "../domain/types";

export interface MarketplaceRepository {
  listServices(): Promise<AgentService[]>;
  getService(serviceId: string): Promise<AgentService | undefined>;
  listFindings(): Promise<Finding[]>;
  listActivations(): Promise<Activation[]>;
  listPermissionGrants(): Promise<PermissionGrant[]>;
  listActivity(): Promise<ActivityEvent[]>;
  listPlans(): Promise<SmartMoneyPlanTemplate[]>;
}

/**
 * Synchronous snapshot used by the Figma-derived UI while visual stabilization
 * is in progress. It has the same normalized resource boundaries that the API
 * repository will expose. Do not import raw mock files from presentation code.
 */
export const DEMO_MARKETPLACE = {
  services: SERVICES,
  findings: FINDINGS,
  activations: ACTIVATIONS,
  permissionGrants: PERMISSION_GRANTS,
  activityEvents: ACTIVITY_EVENTS,
  planTemplates: PLAN_TEMPLATES,
} as const;

export class MockMarketplaceRepository implements MarketplaceRepository {
  async listServices() { return [...SERVICES]; }
  async getService(serviceId: string) { return SERVICES.find((s) => s.serviceId === serviceId); }
  async listFindings() { return [...FINDINGS]; }
  async listActivations() { return [...ACTIVATIONS]; }
  async listPermissionGrants() { return [...PERMISSION_GRANTS]; }
  async listActivity() { return [...ACTIVITY_EVENTS]; }
  async listPlans() { return [...PLAN_TEMPLATES]; }
}

export const marketplaceRepository: MarketplaceRepository = new MockMarketplaceRepository();
