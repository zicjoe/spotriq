import type { FastifyInstance } from "fastify";
import type { ApiEnvelope, GridMarketContextResponse, GridPoolContextResponse } from "@spotriq/api-contracts";
import type { GridMarketContextReader } from "@spotriq/market-context";
import { ApiInputError } from "../errors.js";

function generatedAt() { return new Date().toISOString(); }
function wallet(value: string): string { if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new ApiInputError("address must be a valid EVM wallet address.", "INVALID_ADDRESS"); return value.toLowerCase(); }
function pool(value: string): string { if (!/^0x[0-9a-fA-F]{40}$/.test(value)) throw new ApiInputError("poolAddress must be a valid EVM address.", "INVALID_ADDRESS"); return value.toLowerCase(); }

export async function registerMarketContextRoutes(app: FastifyInstance, marketContext: GridMarketContextReader): Promise<void> {
  app.get<{ Params: { address: string } }>("/v1/wallets/:address/grid/market-context", async (request, reply) => {
    const snapshot = await marketContext.getWalletMarketContexts(wallet(request.params.address));
    const data: GridMarketContextResponse = { snapshot };
    return reply.send({ data, meta: { requestId: request.id, generatedAt: generatedAt() } } satisfies ApiEnvelope<GridMarketContextResponse>);
  });
  app.get<{ Params: { poolAddress: string }; Querystring: { wallet?: string } }>("/v1/grid/pools/:poolAddress/context", async (request, reply) => {
    const context = await marketContext.getPoolContext(pool(request.params.poolAddress), request.query.wallet ? wallet(request.query.wallet) : undefined);
    const data: GridPoolContextResponse = { context };
    return reply.send({ data, meta: { requestId: request.id, generatedAt: generatedAt() } } satisfies ApiEnvelope<GridPoolContextResponse>);
  });
}
