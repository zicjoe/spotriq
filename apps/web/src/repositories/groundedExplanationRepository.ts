import type {
  ApiEnvelope,
  CreateGroundedExplanationRequest,
  GroundedExplanationPacketResponse,
  GroundedExplanationResponse,
  GroundedExplanationStatusResponse,
  GroundedExplanationSubjectRequest,
} from "@spotriq/api-contracts";
import type { GroundedExplanationPacket, GroundedExplanationRecord, GroundedExplanationStatus } from "../domain/types";
import { apiRequest } from "../api/client";

const unwrap = <T,>(value: ApiEnvelope<T>): T => value.data;

export interface GroundedExplanationRepository {
  status(): Promise<GroundedExplanationStatus>;
  grounding(input: GroundedExplanationSubjectRequest): Promise<GroundedExplanationPacket>;
  explain(input: CreateGroundedExplanationRequest): Promise<GroundedExplanationRecord>;
  get(explanationId: string): Promise<GroundedExplanationRecord>;
}

export class ApiGroundedExplanationRepository implements GroundedExplanationRepository {
  async status() { return unwrap(await apiRequest<ApiEnvelope<GroundedExplanationStatusResponse>>("/v1/explanations/status")).status; }
  async grounding(input: GroundedExplanationSubjectRequest) { return unwrap(await apiRequest<ApiEnvelope<GroundedExplanationPacketResponse>>("/v1/explanations/grounding", { method: "POST", body: JSON.stringify(input) })).packet; }
  async explain(input: CreateGroundedExplanationRequest) { return unwrap(await apiRequest<ApiEnvelope<GroundedExplanationResponse>>("/v1/explanations", { method: "POST", body: JSON.stringify(input) })).explanation; }
  async get(explanationId: string) { return unwrap(await apiRequest<ApiEnvelope<GroundedExplanationResponse>>(`/v1/explanations/${encodeURIComponent(explanationId)}`)).explanation; }
}

export const groundedExplanationRepository: GroundedExplanationRepository = new ApiGroundedExplanationRepository();
