import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, EvidenceSourcesResponse } from "@spotriq/api-contracts";
import { listDataSources, listEvidenceMethods } from "@spotriq/evidence";

export async function registerEvidenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/evidence/sources", async (request, reply) => {
    const data: EvidenceSourcesResponse = {
      sources: listDataSources(),
      methods: listEvidenceMethods(),
    };
    const body: ApiEnvelope<EvidenceSourcesResponse> = {
      data,
      meta: { requestId: request.id, generatedAt: new Date().toISOString() },
    };
    return reply.send(body);
  });
}
