import assert from "node:assert/strict";
import test from "node:test";
import type { DiscoveredAgent, MarketplaceServiceRecord } from "@spotriq/domain";
import { normalizeMarketplaceService } from "./index.js";
import { createAgentAuthorityBindingVerifier, SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI } from "./authority-binding.js";

const publicKey = `0x04${"11".repeat(64)}` as `0x${string}`;
const signature = `0x${"22".repeat(65)}` as `0x${string}`;
const expectedAddress = "0x9999999999999999999999999999999999999999";

function record(): MarketplaceServiceRecord {
  const discovered: DiscoveredAgent = {
    discoveryId: "erc8004:56:77",
    identity: { namespace: "eip155", chainId: 56, registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", agentId: "77", identifier: "eip155:56:registry:77" },
    name: "Range Authority Agent",
    description: "PancakeSwap V3 LP rebalancing",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    supportedProtocols: ["PancakeSwap"],
    categoryHints: [{ category: "rebalancing", confidence: "high", basis: ["rebalanc", "pancakeswap"], provenance: "operator-claimed", note: "declared capability" }],
    active: true,
    x402Support: false,
    supportedTrust: [],
    registrationServices: [{ name: "A2A", endpoint: "https://agent.example/a2a", version: "1.0" }],
    externalReputation: { source: "8004scan", totalFeedbacks: 1, note: "external" },
    canonicalVerification: {
      state: "VERIFIED", checkedAt: "2026-08-21T12:00:00.000Z", registryAddress: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", ownerAddress: "0x1111111111111111111111111111111111111111", indexedOwnerMatches: true, registrationMetadataState: "PARSED_DATA_URI", registrationBacklinkMatches: true, evidence: [], limitations: [],
    },
    evidence: [], listingState: "DISCOVERED", marketplaceServiceState: "NOT_CREATED", limitations: [],
  };
  const normalized = normalizeMarketplaceService(discovered, "rebalancing");
  assert.ok(normalized);
  return normalized;
}

const common = {
  resolver: async () => ["93.184.216.34"],
  now: () => new Date("2026-08-21T12:00:00.000Z"),
  nonce: () => "nonce-1",
  publicKeyAddress: () => expectedAddress,
  recoverAddress: async () => expectedAddress,
};

test("trusted authority binding requires the A2A runtime to prove control of the declared service key", async () => {
  let challengeBody: Record<string, unknown> | undefined;
  const verifier = createAgentAuthorityBindingVerifier({
    ...common,
    fetcher: async (input, init) => {
      const url = String(input);
      if ((init?.method ?? "GET") === "GET") {
        assert.match(url, /\.well-known\/agent-card\.json$/);
        return new Response(JSON.stringify({
          name: "Range Authority Agent",
          capabilities: { extensions: [{ uri: SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI, params: { sessionPublicKey: publicKey, challengeUrl: "/authority/challenge", signatureScheme: "eip191-secp256k1" } }] },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      assert.equal(url, "https://agent.example/authority/challenge");
      const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
      challengeBody = body;
      return new Response(JSON.stringify({ challenge: body.challenge, sessionPublicKey: publicKey, signature }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const result = await verifier.verify(record());
  assert.equal(result.binding.state, "VERIFIED");
  assert.equal(result.binding.sessionPublicKey, publicKey);
  assert.equal(result.binding.sessionKeyAddress, expectedAddress);
  assert.equal(result.binding.challengeUrl, "https://agent.example/authority/challenge");
  assert.ok(challengeBody);
  assert.equal(challengeBody.nonce, "nonce-1");
  assert.match(String(challengeBody.challenge), /serviceId:svc:erc8004:56:77:rebalancing/);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0]?.provenance, "marketplace-observed");
});

test("missing Spotriq authority extension remains UNAVAILABLE instead of becoming a trusted key", async () => {
  const verifier = createAgentAuthorityBindingVerifier({
    ...common,
    fetcher: async () => new Response(JSON.stringify({ name: "No binding", capabilities: { extensions: [] } }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const result = await verifier.verify(record());
  assert.equal(result.binding.state, "UNAVAILABLE");
  assert.equal(result.binding.sessionPublicKey, undefined);
  assert.equal(result.evidence.length, 0);
});

test("cross-origin challenge endpoints fail binding before Spotriq posts a challenge", async () => {
  let requests = 0;
  const verifier = createAgentAuthorityBindingVerifier({
    ...common,
    fetcher: async (_input, init) => {
      requests += 1;
      assert.equal(init?.method ?? "GET", "GET");
      return new Response(JSON.stringify({
        capabilities: { extensions: [{ uri: SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI, params: { sessionPublicKey: publicKey, challengeUrl: "https://other.example/challenge", signatureScheme: "eip191-secp256k1" } }] },
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const result = await verifier.verify(record());
  assert.equal(requests, 1);
  assert.equal(result.binding.state, "FAILED");
  assert.match(result.binding.detail, /same-origin/i);
});

test("challenge signed by a different key fails instead of being promoted", async () => {
  const verifier = createAgentAuthorityBindingVerifier({
    ...common,
    recoverAddress: async () => "0x8888888888888888888888888888888888888888",
    fetcher: async (_input, init) => {
      if ((init?.method ?? "GET") === "GET") return new Response(JSON.stringify({ capabilities: { extensions: [{ uri: SPOTRIQ_AUTHORITY_BINDING_EXTENSION_URI, params: { sessionPublicKey: publicKey, challengeUrl: "/authority/challenge", signatureScheme: "eip191-secp256k1" } }] } }), { status: 200, headers: { "content-type": "application/json" } });
      const body = JSON.parse(String(init?.body ?? "{}"));
      return new Response(JSON.stringify({ challenge: body.challenge, sessionPublicKey: publicKey, signature }), { status: 200, headers: { "content-type": "application/json" } });
    },
  });
  const result = await verifier.verify(record());
  assert.equal(result.binding.state, "FAILED");
  assert.match(result.binding.detail, /does not verify/i);
  assert.equal(result.evidence.length, 0);
});
