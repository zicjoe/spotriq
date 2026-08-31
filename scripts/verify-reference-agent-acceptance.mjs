#!/usr/bin/env node

import process from "node:process";

const EXPECTED = [
  { slug: "rangekeeper", name: "RangeKeeper" },
  { slug: "gridpilot", name: "GridPilot" },
  { slug: "yieldpilot", name: "YieldPilot" },
  { slug: "venusguard", name: "VenusGuard" },
];

function readBaseUrl() {
  const argIndex = process.argv.indexOf("--base-url");
  const fromArg = argIndex >= 0 ? process.argv[argIndex + 1] : undefined;
  const raw = fromArg || process.env.SPOTRIQ_ACCEPTANCE_BASE_URL || "https://spotriq-production.up.railway.app";
  return raw.replace(/\/$/, "");
}

async function getJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: controller.signal,
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${JSON.stringify(body)}`);
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function checkState(readiness, code) {
  return readiness?.checks?.find((entry) => entry.code === code)?.state ?? "MISSING";
}

function fail(message) {
  throw new Error(`Reference-agent acceptance failed: ${message}`);
}

const baseUrl = readBaseUrl();
console.log(`Spotriq reference-agent acceptance audit: ${baseUrl}`);

const health = await getJson(`${baseUrl}/health`);
if (health?.status !== "ok") fail(`health status is ${health?.status ?? "missing"}`);
if (health?.environment !== "production") fail(`environment is ${health?.environment ?? "missing"}, expected production`);
if (health?.network !== "testnet") fail(`network is ${health?.network ?? "missing"}, expected testnet`);

const catalog = await getJson(`${baseUrl}/v1/reference-agents`);
const agents = catalog?.data?.agents;
if (!Array.isArray(agents)) fail("/v1/reference-agents did not return data.agents[]");

const rows = [];
for (const expected of EXPECTED) {
  const catalogAgent = agents.find((entry) => entry.slug === expected.slug);
  if (!catalogAgent) fail(`${expected.name} is missing from the reference-agent catalog`);

  const testsResponse = await getJson(`${baseUrl}/v1/services/svc:reference:${expected.slug}/tests`);
  const readinessResponse = await getJson(`${baseUrl}/v1/services/svc:reference:${expected.slug}/readiness`);
  const tests = testsResponse?.data?.tests;
  const readiness = readinessResponse?.data?.readiness;

  const row = {
    agent: expected.name,
    chainId: catalogAgent?.erc8004Identity?.chainId ?? "MISSING",
    agentId: catalogAgent?.erc8004Identity?.agentId ?? "MISSING",
    registration: catalogAgent?.erc8004Registration ?? "MISSING",
    testCoverage: tests?.coverage ?? "MISSING",
    canonicalIdentity: checkState(readiness, "CANONICAL_IDENTITY"),
    runtimeReachability: checkState(readiness, "RUNTIME_REACHABILITY"),
    marketplaceTests: checkState(readiness, "MARKETPLACE_TESTS"),
    readiness: readiness?.state ?? "MISSING",
    activationEligible: readiness?.activationEligible,
  };
  rows.push(row);

  if (row.registration !== "REGISTERED_VERIFIED") fail(`${expected.name} registration is ${row.registration}`);
  if (Number(row.chainId) !== 97) fail(`${expected.name} ERC-8004 chainId is ${row.chainId}, expected 97`);
  if (!String(row.agentId).match(/^\d+$/)) fail(`${expected.name} is missing a numeric ERC-8004 agentId`);
  if (row.testCoverage !== "PASS") fail(`${expected.name} Test Lab coverage is ${row.testCoverage}`);
  if (row.canonicalIdentity !== "PASS") fail(`${expected.name} CANONICAL_IDENTITY is ${row.canonicalIdentity}`);
  if (row.runtimeReachability !== "PASS") fail(`${expected.name} RUNTIME_REACHABILITY is ${row.runtimeReachability}`);
  if (row.marketplaceTests !== "PASS") fail(`${expected.name} MARKETPLACE_TESTS is ${row.marketplaceTests}`);
  if (row.readiness !== "TESTNET_ONLY") fail(`${expected.name} readiness is ${row.readiness}, expected TESTNET_ONLY`);
  if (row.activationEligible !== false) fail(`${expected.name} activationEligible must remain false`);
}

console.table(rows);
console.log("PASS: all four Spotriq reference agents satisfy the v0.22 external-acceptance contract.");
