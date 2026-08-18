import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type {
  ApiErrorBody,
  ApiEnvelope,
  CapabilityResponse,
  HealthResponse,
  MetaResponse,
} from "@spotriq/api-contracts";
import { loadServerConfig, type ServerConfig } from "@spotriq/config";
import { getDatabaseHealth } from "@spotriq/db";

export interface BuildServerOptions {
  config?: ServerConfig;
  logger?: boolean;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadServerConfig();
  const app = Fastify({
    logger: options.logger ?? true,
    requestIdHeader: "x-request-id",
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
  });

  app.get("/health", async (_request, reply) => {
    const database = await getDatabaseHealth(config.databaseUrl);
    const dependencies = [database];
    const status = dependencies.some((dependency) => dependency.state === "unavailable") ? "degraded" : "ok";
    const body: HealthResponse = {
      service: "spotriq-api",
      version: "0.2.0",
      status,
      environment: config.appEnv,
      network: config.bscNetwork,
      checkedAt: new Date().toISOString(),
      dependencies,
    };
    return reply.code(status === "ok" ? 200 : 503).send(body);
  });

  app.get("/v1/meta", async (_request, reply) => {
    const data: MetaResponse = {
      brand: "Spotriq",
      descriptor: "BSC financial-agent marketplace",
      environment: config.appEnv,
      network: config.bscNetwork,
      apiVersion: "v1",
    };
    const body: ApiEnvelope<MetaResponse> = { data, meta: { generatedAt: new Date().toISOString() } };
    return reply.send(body);
  });

  app.get("/v1/system/capabilities", async (_request, reply) => {
    const data: CapabilityResponse = {
      persistenceConfigured: Boolean(config.databaseUrl),
      redisConfigured: Boolean(config.redisUrl),
      bscRpcConfigured: Boolean(config.bscRpcPrimary),
      liveMarketplaceData: false,
      notes: [
        "Frontend still uses normalized demo repositories.",
        "The next milestone introduces BSC chain reads and evidence ingestion.",
      ],
    };
    const body: ApiEnvelope<CapabilityResponse> = { data, meta: { generatedAt: new Date().toISOString() } };
    return reply.send(body);
  });

  app.setNotFoundHandler(async (request, reply) => {
    const body: ApiErrorBody = {
      error: {
        code: "ROUTE_NOT_FOUND",
        message: `No Spotriq API route matches ${request.method} ${request.url}.`,
        recoverable: true,
        retryable: false,
        correlationId: request.id,
      },
    };
    return reply.code(404).send(body);
  });

  app.setErrorHandler(async (error, request, reply) => {
    request.log.error({ err: error }, "request failed");
    const body: ApiErrorBody = {
      error: {
        code: "INTERNAL_ERROR",
        message: config.appEnv === "production" ? "The request could not be completed." : error.message,
        recoverable: true,
        retryable: false,
        correlationId: request.id,
      },
    };
    return reply.code(500).send(body);
  });

  return app;
}
