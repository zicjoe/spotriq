import type { FastifyInstance } from "fastify";
import type { ApiEnvelope } from "@spotriq/api-contracts";
import { buildPublicAdoptionManifest, type PublicAdoptionManifest } from "@spotriq/adoption-readiness";

export async function registerAdoptionRoutes(app: FastifyInstance) {
  app.get("/v1/public/adoption", async (_request, reply) => {
    const data = buildPublicAdoptionManifest();
    const body: ApiEnvelope<PublicAdoptionManifest> = {
      data,
      meta: { generatedAt: new Date().toISOString() },
    };
    return reply.send(body);
  });
}
