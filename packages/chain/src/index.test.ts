import assert from "node:assert/strict";
import test from "node:test";
import { BscChainAdapter } from "./index.js";

function rpcResponse(id: number, result: unknown): Response {
  return new Response(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function makeFetch(handler: (url: string, method: string, params: unknown[], id: number) => Response | Promise<Response>): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const body = JSON.parse(String(init?.body)) as { method: string; params: unknown[]; id: number };
    return handler(url, body.method, body.params, body.id);
  }) as typeof fetch;
}

test("fails over from primary RPC to secondary RPC", async () => {
  const calls: string[] = [];
  const fetchImpl = makeFetch((url, method, _params, id) => {
    calls.push(`${url}:${method}`);
    if (url.includes("primary")) throw new Error("primary down");
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_blockNumber") return rpcResponse(id, "0x64");
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({
    network: "testnet",
    primaryRpcUrl: "https://primary.example",
    secondaryRpcUrl: "https://secondary.example",
    fetchImpl,
  });
  assert.equal(await adapter.getBlockNumber(), "100");
  assert.ok(calls.some((call) => call.startsWith("https://primary.example")));
  assert.ok(calls.some((call) => call === "https://secondary.example:eth_blockNumber"));
});

test("rejects a wrong-chain primary and uses a valid BSC secondary", async () => {
  const fetchImpl = makeFetch((url, method, _params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, url.includes("wrong") ? "0x38" : "0x61");
    if (method === "eth_blockNumber") return rpcResponse(id, "0x2a");
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({
    network: "testnet",
    primaryRpcUrl: "https://wrong.example",
    secondaryRpcUrl: "https://good.example",
    fetchImpl,
  });
  assert.equal(await adapter.getBlockNumber(), "42");
});

test("returns native balance with canonical evidence at one block", async () => {
  const fetchImpl = makeFetch((_url, method, params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_getBalance") {
      assert.equal(params[1], "0x64");
      return rpcResponse(id, "0xde0b6b3a7640000");
    }
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({ network: "testnet", primaryRpcUrl: "https://rpc.example", fetchImpl });
  const balance = await adapter.getNativeBalance("0x1111111111111111111111111111111111111111", "100");
  assert.equal(balance.balanceFormatted, "1");
  assert.equal(balance.evidence.truthLayer, "CANONICAL_ONCHAIN");
  assert.equal(balance.evidence.chainContext?.blockNumber, "100");
  assert.equal(balance.evidence.metric, "wallet.native_balance");
});

test("reads ERC-20 balance and metadata using eth_call", async () => {
  const encodedString = (value: string) => {
    const bytes = Buffer.from(value, "utf8").toString("hex");
    const padded = bytes.padEnd(Math.ceil(bytes.length / 64) * 64, "0");
    return `0x${"20".padStart(64, "0")}${value.length.toString(16).padStart(64, "0")}${padded}`;
  };
  const fetchImpl = makeFetch((_url, method, params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_call") {
      const request = params[0] as { data: string };
      if (request.data.startsWith("0x70a08231")) return rpcResponse(id, "0x0f4240");
      if (request.data === "0x313ce567") return rpcResponse(id, "0x6");
      if (request.data === "0x95d89b41") return rpcResponse(id, encodedString("USDT"));
      if (request.data === "0x06fdde03") return rpcResponse(id, encodedString("Tether USD"));
    }
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({ network: "testnet", primaryRpcUrl: "https://rpc.example", fetchImpl });
  const balance = await adapter.getErc20Balance(
    "0x2222222222222222222222222222222222222222",
    "0x1111111111111111111111111111111111111111",
    "100",
  );
  assert.equal(balance.balanceRaw, "1000000");
  assert.equal(balance.balanceFormatted, "1");
  assert.equal(balance.symbol, "USDT");
  assert.equal(balance.name, "Tether USD");
  assert.equal(balance.decimals, 6);
});

test("generic contract reads preserve the explicitly observed block", async () => {
  const fetchImpl = makeFetch((_url, method, params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_call") {
      assert.equal(params[1], "0x64");
      return rpcResponse(id, "0x01");
    }
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({ network: "testnet", primaryRpcUrl: "https://rpc.example", fetchImpl });
  const result = await adapter.callContract("0x2222222222222222222222222222222222222222", "0x1234", "100");
  assert.equal(result.blockNumber, "100");
  assert.equal(result.data, "0x01");
});

test("rejects a mismatched JSON-RPC id and fails over to a valid secondary", async () => {
  const fetchImpl = makeFetch((url, method, _params, id) => {
    if (url.includes("primary")) return rpcResponse(id + 99, method === "eth_chainId" ? "0x61" : "0x64");
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_blockNumber") return rpcResponse(id, "0x64");
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({network:"testnet",primaryRpcUrl:"https://primary.example",secondaryRpcUrl:"https://secondary.example",fetchImpl});
  assert.equal(await adapter.getBlockNumber(), "100");
});

test("detects material block divergence across otherwise healthy BSC RPC endpoints", async () => {
  const fetchImpl = makeFetch((url, method, _params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_blockNumber") return rpcResponse(id, url.includes("primary") ? "0x64" : "0x78");
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({network:"testnet",primaryRpcUrl:"https://primary.example",secondaryRpcUrl:"https://secondary.example",fetchImpl,rpcDivergenceToleranceBlocks:5});
  const status = await adapter.getStatus();
  assert.equal(status.blockDivergence?.state, "divergent");
  assert.equal(status.blockDivergence?.spreadBlocks, "20");
  assert.equal((await adapter.getHealth()).state, "degraded");
});

test("fails over when an RPC returns transaction evidence for a different hash", async () => {
  const wanted = `0x${"1".repeat(64)}`;
  const wrong = `0x${"2".repeat(64)}`;
  const blockHash = `0x${"3".repeat(64)}`;
  const fetchImpl = makeFetch((url, method, _params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_getTransactionByHash") return rpcResponse(id, {hash:url.includes("primary")?wrong:wanted,blockNumber:"0x64",blockHash,from:"0x1111111111111111111111111111111111111111",to:"0x2222222222222222222222222222222222222222",value:"0x0",input:"0x",transactionIndex:"0x0"});
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({network:"testnet",primaryRpcUrl:"https://primary.example",secondaryRpcUrl:"https://secondary.example",fetchImpl});
  assert.equal((await adapter.getTransaction(wanted))?.hash, wanted);
});


test("fails over when primary returns malformed scalar RPC results", async () => {
  const fetchImpl = makeFetch((url, method, _params, id) => {
    if (method === "eth_chainId") return rpcResponse(id, "0x61");
    if (method === "eth_blockNumber") return rpcResponse(id, url.includes("primary") ? "not-hex" : "0x64");
    throw new Error(`unexpected ${method}`);
  });
  const adapter = new BscChainAdapter({network:"testnet",primaryRpcUrl:"https://primary.example",secondaryRpcUrl:"https://secondary.example",fetchImpl});
  assert.equal(await adapter.getBlockNumber(), "100");
});
