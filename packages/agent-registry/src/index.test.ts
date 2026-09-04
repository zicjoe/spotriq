import assert from "node:assert/strict";
import test from "node:test";
import { encodeFunctionResult } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import { createAgentRegistry, deriveAgentCategoryHints, ERC8004_REGISTRIES, MemoryAgentRegistryStore } from "./index.js";

const OWNER = "0x1111111111111111111111111111111111111111";

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function registrationDataUri(agentId: string): string {
  const payload = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Range Sentinel",
    description: "PancakeSwap concentrated liquidity rebalancing agent",
    services: [{ name: "A2A", endpoint: "https://agent.example/a2a", version: "0.3.0" }],
    x402Support: true,
    active: true,
    registrations: [{ agentId: Number(agentId), agentRegistry: `eip155:56:${ERC8004_REGISTRIES[56].identityRegistry}` }],
    supportedTrust: ["reputation"],
  };
  return `data:application/json;base64,${Buffer.from(JSON.stringify(payload)).toString("base64")}`;
}

function fakeChain(agentId = "7"): BscChainReader {
  const uri = registrationDataUri(agentId);
  return {
    network: "mainnet",
    definition: { network: "mainnet", chainId: 56, nativeSymbol: "BNB", explorerUrl: "https://bscscan.com", defaultRpcUrls: ["https://a", "https://b"] },
    rpcMode: "official_public_fallback",
    getStatus: async () => ({ network: "mainnet", expectedChainId: 56, rpcMode: "official_public_fallback", endpoints: [] }),
    getHealth: async () => ({ name: "bsc", state: "ok" }),
    getBlockNumber: async () => "100",
    getBlock: async () => { throw new Error("not used"); },
    getTransaction: async () => null,
    getTransactionReceipt: async () => null,
    getNativeBalance: async () => { throw new Error("not used"); },
    getErc20Balance: async () => { throw new Error("not used"); },
    getWalletBalances: async () => { throw new Error("not used"); },
    callContract: async (_address: string, data: string) => {
      const selector = data.slice(0, 10);
      if (selector === "0x6352211e") return { data: encodeFunctionResult({ abi: [{ type: "function", name: "ownerOf", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "owner", type: "address" }] }] as const, functionName: "ownerOf", result: OWNER }), blockNumber: "100" };
      if (selector === "0xc87b56dd") return { data: encodeFunctionResult({ abi: [{ type: "function", name: "tokenURI", stateMutability: "view", inputs: [{ name: "tokenId", type: "uint256" }], outputs: [{ name: "uri", type: "string" }] }] as const, functionName: "tokenURI", result: uri }), blockNumber: "100" };
      return { data: encodeFunctionResult({ abi: [{ type: "function", name: "getAgentWallet", stateMutability: "view", inputs: [{ name: "agentId", type: "uint256" }], outputs: [{ name: "wallet", type: "address" }] }] as const, functionName: "getAgentWallet", result: OWNER }), blockNumber: "100" };
    },
  };
}

test("category hints remain operator-claimed hints, not verified capabilities", () => {
  const hints = deriveAgentCategoryHints({ name: "Range Sentinel", description: "Concentrated liquidity rebalancing on PancakeSwap" });
  assert.equal(hints[0]?.category, "rebalancing");
  assert.equal(hints[0]?.provenance, "operator-claimed");
  assert.match(hints[0]?.note ?? "", /not a marketplace-tested capability/i);
});

test("listAgents filters BSC chain and preserves external reputation provenance", async () => {
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    assert.match(url, /chain_id=56/);
    return jsonResponse({ items: [{ token_id: "7", chain_id: 56, name: "Range Sentinel", description: "rebalancing concentrated liquidity", owner_address: OWNER, total_feedbacks: 12, total_score: 42, star_count: 3, mcp_server: "https://agent.example/mcp" }], total: 1, limit: 20, offset: 0 });
  }) as typeof fetch;
  const reader = createAgentRegistry({ fetchImpl, chainReaders: { 56: fakeChain() }, store: new MemoryAgentRegistryStore() });
  const page = await reader.listAgents({ chainId: 56 });
  assert.equal(page.agents.length, 1);
  assert.equal(page.agents[0]?.listingState, "DISCOVERED");
  assert.equal(page.agents[0]?.marketplaceServiceState, "NOT_CREATED");
  assert.equal(page.agents[0]?.externalReputation.totalFeedbacks, 12);
  assert.equal(page.agents[0]?.registrationServices[0]?.name, "MCP");
  assert.match(page.agents[0]?.externalReputation.note ?? "", /not.*trust score/i);
});

test("getAgent performs canonical onchain verification and registration backlink check", async () => {
  const fetchImpl = (async () => jsonResponse({ token_id: "7", chain_id: 56, name: "Range Sentinel", description: "PancakeSwap concentrated liquidity rebalancing", owner_address: OWNER, total_feedbacks: 2 })) as typeof fetch;
  const reader = createAgentRegistry({ fetchImpl, chainReaders: { 56: fakeChain("7") } });
  const agent = await reader.getAgent(56, "7");
  assert.equal(agent.canonicalVerification?.state, "VERIFIED");
  assert.equal(agent.canonicalVerification?.indexedOwnerMatches, true);
  assert.equal(agent.canonicalVerification?.registrationBacklinkMatches, true);
  assert.equal(agent.registrationServices[0]?.name, "A2A");
  assert.equal(agent.x402Support, true);
});

test("canonical owner mismatch is surfaced instead of silently trusted", async () => {
  const OTHER = "0x2222222222222222222222222222222222222222";
  const fetchImpl = (async () => jsonResponse({ token_id: "7", chain_id: 56, name: "Agent", description: "yield optimizer", owner_address: OTHER })) as typeof fetch;
  const reader = createAgentRegistry({ fetchImpl, chainReaders: { 56: fakeChain("7") } });
  const agent = await reader.getAgent(56, "7");
  assert.equal(agent.canonicalVerification?.state, "MISMATCH");
  assert.equal(agent.canonicalVerification?.indexedOwnerMatches, false);
  assert.ok(agent.limitations.some((value) => /does not match/i.test(value)));
});

test("feedback remains external and is not converted to Spotriq reviews", async () => {
  const fetchImpl = (async () => jsonResponse({ items: [{ id: "fb-1", chain_id: 56, token_id: 7, score: 4.5, comment: "responsive", created_at: "2026-08-18T00:00:00Z" }], total: 1, limit: 20, offset: 0 })) as typeof fetch;
  const reader = createAgentRegistry({ fetchImpl, chainReaders: {} });
  const page = await reader.getFeedback(56, "7");
  assert.equal(page.feedback[0]?.provenance, "external");
  assert.match(page.feedback[0]?.note ?? "", /not a verified Spotriq marketplace review/i);
});


test("semantic search falls back to standard indexed keyword search when upstream semantic search is unavailable", async () => {
  const requested: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = String(input);
    requested.push(url);
    if (url.includes("/agents/search/semantic?")) {
      assert.match(url, /chain_id=56/);
      assert.match(url, /semantic_weight=/);
      return jsonResponse({ detail: "semantic backend unavailable" }, 500);
    }
    if (url.includes("/agents?")) {
      assert.match(url, /search=yield/);
      return jsonResponse({ items: [{ token_id: "9", chain_id: 56, name: "Yield Finder", description: "yield agent", owner_address: OWNER }], total: 1, limit: 8, offset: 0 });
    }
    throw new Error(`unexpected URL: ${url}`);
  }) as typeof fetch;

  const reader = createAgentRegistry({ fetchImpl, chainReaders: {} });
  const page = await reader.searchAgents("yield", { chainId: 56, limit: 8 });
  assert.equal(page.agents.length, 1);
  assert.equal(page.agents[0]?.name, "Yield Finder");
  assert.ok(page.limitations.some((value) => /fell back.*keyword search/i.test(value)));
  assert.equal(requested.some((url) => url.includes("/agents/search/semantic?")), true);
  assert.equal(requested.some((url) => url.includes("/agents?")), true);
});
