import type { FastifyInstance, FastifyReply } from "fastify";
import type {
  ApiEnvelope,
  FindingServiceMatchesResponse,
  SmartMoneyCheckEventsResponse,
  SmartMoneyCheckResponse,
  StartSmartMoneyCheckRequest,
} from "@spotriq/api-contracts";
import type { SmartMoneyEngine } from "@spotriq/smart-money";
import type { BscNetwork } from "@spotriq/domain";
import type { MarketplaceSupplyReader } from "@spotriq/marketplace-supply";
import { ApiInputError } from "../errors.js";

function generatedAt() { return new Date().toISOString(); }

function assertCheckId(value: string): string {
  if (!/^check_[A-Za-z0-9_-]+$/.test(value)) throw new ApiInputError("Invalid Smart Money Check ID.", "INVALID_CHECK_ID");
  return value;
}


function assertFindingId(value: string): string {
  if (!/^finding_[A-Za-z0-9_-]+$/.test(value)) throw new ApiInputError("Invalid Finding ID.", "INVALID_FINDING_ID");
  return value;
}

function parseMatchLimit(value: string | undefined): number {
  if (value === undefined || value === "") return 8;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 20) throw new ApiInputError("limit must be an integer between 1 and 20.", "INVALID_MATCH_LIMIT");
  return parsed;
}

function parseStartBody(value: unknown): StartSmartMoneyCheckRequest {
  if (!value || typeof value !== "object") throw new ApiInputError("Request body is required.", "INVALID_CHECK_REQUEST");
  const body = value as Record<string, unknown>;
  if (typeof body.walletAddress !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(body.walletAddress.trim())) {
    throw new ApiInputError("walletAddress must be a valid BSC/EVM address.", "INVALID_ADDRESS");
  }
  const walletControl = body.walletControl;
  if (walletControl !== undefined && walletControl !== "WATCH_ONLY" && walletControl !== "CONNECTED" && walletControl !== "VERIFIED_CONTROL") {
    throw new ApiInputError("walletControl must be WATCH_ONLY, CONNECTED, or VERIFIED_CONTROL.", "INVALID_WALLET_CONTROL");
  }
  const network = body.network;
  if (network !== undefined && network !== "mainnet" && network !== "testnet") {
    throw new ApiInputError("network must be mainnet or testnet.", "INVALID_CHECK_NETWORK");
  }
  return { walletAddress: body.walletAddress.trim().toLowerCase(), walletControl, network } as StartSmartMoneyCheckRequest;
}

async function sendNotFound(reply: FastifyReply, requestId: string, checkSessionId: string) {
  return reply.code(404).send({
    error: {
      code: "CHECK_NOT_FOUND",
      message: `Smart Money Check ${checkSessionId} was not found.`,
      recoverable: true,
      retryable: false,
      correlationId: requestId,
    },
  });
}

export async function registerCheckRoutes(
  app: FastifyInstance,
  smartMoney: SmartMoneyEngine,
  marketplaceSupply: MarketplaceSupplyReader,
  enginesByNetwork: Partial<Record<BscNetwork, SmartMoneyEngine>> = {},
): Promise<void> {
  app.post<{ Body: StartSmartMoneyCheckRequest }>("/v1/checks", async (request, reply) => {
    const input = parseStartBody(request.body);
    const requestedNetwork = input.network ?? "testnet";
    const engine = enginesByNetwork[requestedNetwork] ?? smartMoney;
    const session = await engine.startCheck(input);

    setImmediate(() => {
      void engine.runCheck(session.checkSessionId).catch((error) => {
        request.log.error({ err: error, checkSessionId: session.checkSessionId }, "Smart Money Check background execution failed");
      });
    });

    const data: SmartMoneyCheckResponse = { session, findings: [] };
    const body: ApiEnvelope<SmartMoneyCheckResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.code(202).send(body);
  });

  app.get<{ Params: { checkSessionId: string } }>("/v1/checks/:checkSessionId", async (request, reply) => {
    const checkSessionId = assertCheckId(request.params.checkSessionId);
    const data = await smartMoney.getCheck(checkSessionId);
    if (!data) return sendNotFound(reply, request.id, checkSessionId);
    const body: ApiEnvelope<SmartMoneyCheckResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { checkSessionId: string } }>("/v1/checks/:checkSessionId/status", async (request, reply) => {
    const checkSessionId = assertCheckId(request.params.checkSessionId);
    const session = await smartMoney.getSession(checkSessionId);
    if (!session) return sendNotFound(reply, request.id, checkSessionId);
    return reply.send({ data: { session }, meta: { requestId: request.id, generatedAt: generatedAt() } });
  });

  app.get<{ Params: { checkSessionId: string } }>("/v1/checks/:checkSessionId/findings", async (request, reply) => {
    const checkSessionId = assertCheckId(request.params.checkSessionId);
    const data = await smartMoney.getCheck(checkSessionId);
    if (!data) return sendNotFound(reply, request.id, checkSessionId);
    return reply.send({ data: data.findings, meta: { requestId: request.id, generatedAt: generatedAt() } });
  });


  app.get<{ Params: { checkSessionId: string; findingId: string }; Querystring: { limit?: string } }>("/v1/checks/:checkSessionId/findings/:findingId/matches", async (request, reply) => {
    const checkSessionId = assertCheckId(request.params.checkSessionId);
    const findingId = assertFindingId(request.params.findingId);
    const snapshot = await smartMoney.getCheck(checkSessionId);
    if (!snapshot) return sendNotFound(reply, request.id, checkSessionId);
    const finding = snapshot.findings.find((item) => item.findingId === findingId);
    if (!finding) {
      return reply.code(404).send({
        error: {
          code: "FINDING_NOT_FOUND",
          message: `Finding ${findingId} was not found in Smart Money Check ${checkSessionId}.`,
          recoverable: true,
          retryable: false,
          correlationId: request.id,
        },
      });
    }
    const page = await marketplaceSupply.matchFinding(finding, { limit: parseMatchLimit(request.query.limit) });
    const data: FindingServiceMatchesResponse = { page };
    const body: ApiEnvelope<FindingServiceMatchesResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
    return reply.send(body);
  });

  app.get<{ Params: { checkSessionId: string }; Querystring: { after?: string } }>("/v1/checks/:checkSessionId/events", async (request, reply) => {
    const checkSessionId = assertCheckId(request.params.checkSessionId);
    const initialSession = await smartMoney.getSession(checkSessionId);
    if (!initialSession) return sendNotFound(reply, request.id, checkSessionId);
    const after = request.query.after ? Number(request.query.after) : 0;
    if (!Number.isInteger(after) || after < 0) throw new ApiInputError("after must be a non-negative event sequence.", "INVALID_EVENT_SEQUENCE");

    const wantsSse = String(request.headers.accept ?? "").includes("text/event-stream");
    if (!wantsSse) {
      const events = await smartMoney.listEvents(checkSessionId, after);
      const data: SmartMoneyCheckEventsResponse = { events };
      const body: ApiEnvelope<SmartMoneyCheckEventsResponse> = { data, meta: { requestId: request.id, generatedAt: generatedAt() } };
      return reply.send(body);
    }

    reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("X-Accel-Buffering", "no");
    reply.hijack();

    let lastSequence = after;
    let ended = false;
    let polling = false;
    const send = (event: Awaited<ReturnType<typeof smartMoney.listEvents>>[number]) => {
      if (ended || reply.raw.destroyed || event.sequence <= lastSequence) return;
      lastSequence = event.sequence;
      reply.raw.write(`id: ${event.sequence}\n`);
      reply.raw.write(`data: ${JSON.stringify({ type: event.type, data: event })}\n\n`);
    };
    const finish = () => {
      if (ended) return;
      ended = true;
      if (!reply.raw.destroyed) reply.raw.end();
    };
    const isTerminal = (state: string) => state === "COMPLETED" || state === "PARTIAL" || state === "FAILED";

    for (const event of await smartMoney.listEvents(checkSessionId, after)) send(event);

    const currentAfterInitial = await smartMoney.getSession(checkSessionId);
    if (!currentAfterInitial || isTerminal(currentAfterInitial.state)) {
      finish();
      return;
    }

    // Keep the low-latency in-process subscription, but do not depend on it.
    // A background check and an SSE request may land on different API instances,
    // or a terminal event may race between the initial DB read and subscription.
    const unsubscribe = smartMoney.subscribe(checkSessionId, (event) => {
      send(event);
      if (event.type === "check.completed" || event.type === "check.failed") finish();
    });

    const poll = async () => {
      if (ended || polling) return;
      polling = true;
      try {
        for (const event of await smartMoney.listEvents(checkSessionId, lastSequence)) send(event);
        const current = await smartMoney.getSession(checkSessionId);
        if (!current || isTerminal(current.state)) finish();
      } catch (error) {
        request.log.warn({ err: error, checkSessionId }, "Smart Money Check SSE recovery poll failed");
      } finally {
        polling = false;
      }
    };

    // Catch an event that completed in the narrow gap between initial read and subscribe.
    await poll();
    const recoveryPoll = setInterval(() => { void poll(); }, 1_000);
    const heartbeat = setInterval(() => {
      if (!ended && !reply.raw.destroyed) reply.raw.write(": spotriq-heartbeat\n\n");
    }, 15_000);
    const cleanup = () => {
      clearInterval(recoveryPoll);
      clearInterval(heartbeat);
      unsubscribe();
      ended = true;
    };
    request.raw.on("close", cleanup);
    request.raw.on("error", cleanup);
  });
}
