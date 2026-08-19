import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type {
  ApiErrorBody,
  ApiEnvelope,
  CapabilityResponse,
  HealthResponse,
  MetaResponse,
} from "@spotriq/api-contracts";
import { BscChainError, createBscChainAdapter, type BscChainReader } from "@spotriq/chain";
import { loadServerConfig, type ServerConfig } from "@spotriq/config";
import { getDatabaseHealth, getDatabasePool } from "@spotriq/db";
import {
  createPancakeSwapAdapter,
  PancakeSwapAdapterError,
  type PancakeSwapReader,
} from "@spotriq/protocol-pancakeswap";
import { createGridMarketContextEngine, GridMarketContextError, type GridMarketContextReader } from "@spotriq/market-context";
import { createSmartMoneyEngine, MemorySmartMoneyStore, PostgresSmartMoneyStore, type SmartMoneyEngine } from "@spotriq/smart-money";
import { createVenusAdapter, VenusAdapterError, type VenusReader } from "@spotriq/protocol-venus";
import { ApiInputError } from "./errors.js";
import { registerChainRoutes } from "./routes/chain.js";
import { registerEvidenceRoutes } from "./routes/evidence.js";
import { registerPancakeSwapRoutes } from "./routes/pancakeswap.js";
import { registerVenusRoutes } from "./routes/venus.js";
import { registerCheckRoutes } from "./routes/checks.js";
import { registerMarketContextRoutes } from "./routes/market-context.js";

export interface BuildServerOptions {
  config?: ServerConfig;
  logger?: boolean;
  chain?: BscChainReader;
  pancakeSwap?: PancakeSwapReader;
  venus?: VenusReader;
  marketContext?: GridMarketContextReader;
  smartMoney?: SmartMoneyEngine;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadServerConfig();
  const chain = options.chain ?? createBscChainAdapter({
    network: config.bscNetwork,
    primaryRpcUrl: config.bscRpcPrimary,
    secondaryRpcUrl: config.bscRpcSecondary,
    timeoutMs: config.bscRpcTimeoutMs,
  });
  const pancakeSwap = options.pancakeSwap ?? createPancakeSwapAdapter({ chain });
  const venus = options.venus ?? createVenusAdapter({ chain });
  const marketContext = options.marketContext ?? createGridMarketContextEngine({ chain, pancakeSwap });
  const database = getDatabasePool(config.databaseUrl);
  const smartMoneyStore = database
    ? new PostgresSmartMoneyStore({ query: (text, values) => database.query(text, values) })
    : new MemorySmartMoneyStore();
  const smartMoney = options.smartMoney ?? createSmartMoneyEngine({ chain, pancakeSwap, venus, marketContext, store: smartMoneyStore });
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
    const [database, bsc] = await Promise.all([
      getDatabaseHealth(config.databaseUrl),
      chain.getHealth(),
    ]);
    const dependencies = [database, bsc];
    const status = dependencies.some((dependency) => dependency.state === "unavailable") ? "degraded" : "ok";
    const body: HealthResponse = {
      service: "spotriq-api",
      version: "0.8.0",
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
      chainAdapterEnabled: true,
      evidenceEngineEnabled: true,
      pancakeSwapAdapterEnabled: true,
      venusAdapterEnabled: true,
      yieldDataEnabled: true,
      gridMarketContextEnabled: true,
      smartMoneyCheckEnabled: true,
      smartMoneyPersistence: database ? "postgres" : "memory",
      notes: [
        config.bscRpcPrimary
          ? "BSC reads use configured RPC endpoints with failover."
          : "Development BSC reads use official public BSC RPC fallbacks; configure BSC_RPC_PRIMARY for production-grade access.",
        "Canonical BSC blocks, transactions, native balances, and requested ERC-20 balances now return evidence envelopes.",
        "PancakeSwap V3 and Infinity CL current-state reads normalize concentrated-liquidity positions with evidence-backed range state.",
        database ? "Smart Money Check sessions, portfolio snapshots, evidence, findings, and events persist in PostgreSQL." : "Smart Money Check uses in-memory persistence until DATABASE_URL is configured; configure Railway PostgreSQL for durable sessions.",
        "Smart Money Check generates deterministic Rebalancing findings from supported PancakeSwap positions, Health findings from Venus lending state, and Yield findings from wallet-relevant Venus supply markets.",
        "Yield current rates are base Venus supply APY derived from onchain supplyRatePerBlock; incentives, estimated net yield, and realised performance remain separate and are not fabricated.",
        "Venus protocol shortfall is canonical for current liquidation eligibility; Spotriq health factor is a derived explanation and incomplete inputs never become Healthy.",
        "Grid market context now uses supported PancakeSwap V3 onchain 1h/6h/24h oracle averages. TWAP dispersion is not realised volatility and the regime is not a profit forecast.",
        "Agent matching remains explicitly unsupported in this milestone.",
      ],
    };
    const body: ApiEnvelope<CapabilityResponse> = { data, meta: { generatedAt: new Date().toISOString() } };
    return reply.send(body);
  });

  await registerChainRoutes(app, chain);
  await registerEvidenceRoutes(app);
  await registerPancakeSwapRoutes(app, pancakeSwap);
  await registerVenusRoutes(app, venus);
  await registerMarketContextRoutes(app, marketContext);
  await registerCheckRoutes(app, smartMoney);

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
    if (error instanceof ApiInputError) {
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          recoverable: true,
          retryable: false,
          correlationId: request.id,
          details: error.details,
        },
      };
      return reply.code(400).send(body);
    }

    if (error instanceof GridMarketContextError) {
      const body: ApiErrorBody = { error: { code: "GRID_MARKET_CONTEXT_ERROR", message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id } };
      return reply.code(502).send(body);
    }

    if (error instanceof PancakeSwapAdapterError) {
      const statusCode = error.code === "INVALID_TOKEN_ID"
        ? 400
        : error.code === "POSITION_NOT_FOUND" || error.code === "POOL_NOT_FOUND"
          ? 404
          : error.code === "POOL_MANAGER_MISMATCH"
            ? 422
            : 502;
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          recoverable: true,
          retryable: error.retryable,
          correlationId: request.id,
          details: config.appEnv === "production" ? undefined : error.details,
        },
      };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof VenusAdapterError) {
      const statusCode = error.code === "BOOTSTRAP_FAILED" || error.code === "POOL_DISCOVERY_FAILED" || error.code === "CONTRACT_READ_FAILED" ? 502 : 422;
      const body: ApiErrorBody = { error: { code: error.code, message: error.message, recoverable: true, retryable: error.retryable, correlationId: request.id, details: config.appEnv === "production" ? undefined : error.details } };
      return reply.code(statusCode).send(body);
    }

    if (error instanceof BscChainError) {
      const statusCode = error.code === "INVALID_ADDRESS" || error.code === "INVALID_HASH"
        ? 400
        : error.code === "RPC_UNAVAILABLE"
          ? 503
          : 502;
      const body: ApiErrorBody = {
        error: {
          code: error.code,
          message: error.message,
          recoverable: true,
          retryable: error.retryable,
          correlationId: request.id,
          details: config.appEnv === "production" ? undefined : error.details,
        },
      };
      return reply.code(statusCode).send(body);
    }

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
