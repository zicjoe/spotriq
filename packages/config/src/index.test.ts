import assert from "node:assert/strict";
import test from "node:test";
import { loadServerConfig } from "./index.js";

const baseProduction = {
  NODE_ENV: "production",
  SPOTRIQ_ENV: "production",
  DATABASE_URL: "postgresql://example.invalid/spotriq",
  BSC_RPC_PRIMARY: "https://bsc-rpc.example",
};

test("development derives a local public API base URL when none is configured", () => {
  const config = loadServerConfig({ NODE_ENV: "test", SPOTRIQ_ENV: "development", API_PORT: "4321" });
  assert.equal(config.publicApiBaseUrl, "http://127.0.0.1:4321");
});

test("production requires an explicit public API base URL", () => {
  assert.throws(() => loadServerConfig(baseProduction), /PUBLIC_API_BASE_URL/);
});

test("production public API base URL must be HTTPS", () => {
  assert.throws(() => loadServerConfig({ ...baseProduction, PUBLIC_API_BASE_URL: "http://api.spotriq.example" }), /must use HTTPS/i);
});

test("production normalizes an HTTPS public API base URL", () => {
  const config = loadServerConfig({ ...baseProduction, PUBLIC_API_BASE_URL: "https://api.spotriq.example/" });
  assert.equal(config.publicApiBaseUrl, "https://api.spotriq.example");
});

test("reference-agent registry defaults to the active BSC execution network", () => {
  const testnet = loadServerConfig({ NODE_ENV: "test", SPOTRIQ_ENV: "development", BSC_NETWORK: "testnet" });
  const mainnet = loadServerConfig({ NODE_ENV: "test", SPOTRIQ_ENV: "development", BSC_NETWORK: "mainnet" });
  assert.equal(testnet.referenceAgentRegistryChainId, 97);
  assert.equal(mainnet.referenceAgentRegistryChainId, 56);
});

test("reference-agent ERC-8004 IDs are parsed independently from general discovery", () => {
  const config = loadServerConfig({
    NODE_ENV: "test",
    SPOTRIQ_ENV: "development",
    BSC_NETWORK: "testnet",
    AGENT_DISCOVERY_CHAIN_ID: "56",
    REFERENCE_AGENT_REGISTRY_CHAIN_ID: "97",
    REFERENCE_AGENT_RANGEKEEPER_ID: "2017",
  });
  assert.equal(config.agentDiscoveryChainId, 56);
  assert.equal(config.referenceAgentRegistryChainId, 97);
  assert.equal(config.referenceAgentIds.rangekeeper, "2017");
});

test("reference-agent ERC-8004 IDs must be numeric", () => {
  assert.throws(() => loadServerConfig({ NODE_ENV: "test", SPOTRIQ_ENV: "development", REFERENCE_AGENT_RANGEKEEPER_ID: "range-1" }), /numeric ERC-8004 token ID/i);
});
