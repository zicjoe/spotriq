import type { ApiEnvelope } from "@spotriq/api-contracts";
import type { PublicAdoptionManifest } from "@spotriq/adoption-readiness";
import { apiRequest } from "../api/client";

export interface AdoptionReadinessRepository {
  getPublicManifest(): Promise<PublicAdoptionManifest>;
}

class ApiAdoptionReadinessRepository implements AdoptionReadinessRepository {
  async getPublicManifest() {
    return (await apiRequest<ApiEnvelope<PublicAdoptionManifest>>("/v1/public/adoption")).data;
  }
}

export const adoptionReadinessRepository: AdoptionReadinessRepository = new ApiAdoptionReadinessRepository();
