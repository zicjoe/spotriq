import type { ApiEnvelope, PublicSystemHealthResponse } from "@spotriq/api-contracts";
import type { PublicOperationalHealthSnapshot } from "../domain/types";
import { apiRequest } from "../api/client";

export interface SystemHealthRepository { getPublic():Promise<PublicOperationalHealthSnapshot>; }
class ApiSystemHealthRepository implements SystemHealthRepository {
  async getPublic(){return (await apiRequest<ApiEnvelope<PublicSystemHealthResponse>>("/v1/system/health")).data.health;}
}
export const systemHealthRepository:SystemHealthRepository=new ApiSystemHealthRepository();
