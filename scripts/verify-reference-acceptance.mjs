import process from "node:process";

const base = (process.env.SPOTRIQ_ACCEPTANCE_BASE_URL || process.env.PUBLIC_API_BASE_URL || "https://spotriq-production.up.railway.app").replace(/\/$/, "");
const services = [
  ["rangekeeper", "RangeKeeper"],
  ["gridpilot", "GridPilot"],
  ["yieldpilot", "YieldPilot"],
  ["venusguard", "VenusGuard"],
];

async function json(path) {
  const response = await fetch(`${base}${path}`, { headers: { accept: "application/json" } });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`);
  return body?.data;
}

for (const [slug, name] of services) {
  const serviceId = `svc:reference:${slug}`;
  const detail = await json(`/v1/services/${encodeURIComponent(serviceId)}`);
  const record = detail?.record;
  if (!record) throw new Error(`${name}: service detail missing.`);
  if (record.service?.serviceId !== serviceId) throw new Error(`${name}: stable serviceId mismatch.`);
  if (record.service?.origin !== "REFERENCE") throw new Error(`${name}: origin must remain REFERENCE.`);
  if (record.identity?.identity?.chainId !== 97) throw new Error(`${name}: accepted reference identity must be BSC Testnet chainId 97.`);
  if (record.identity?.canonicalVerification?.state !== "VERIFIED") throw new Error(`${name}: canonical ERC-8004 identity is not VERIFIED.`);
  if (record.readiness?.state !== "TESTNET_ONLY") throw new Error(`${name}: readiness must remain TESTNET_ONLY, got ${record.readiness?.state}.`);
  if (record.service?.marketplaceActivationEligible !== false || record.readiness?.activationEligible !== false) throw new Error(`${name}: financial marketplaceActivationEligible must remain false at v0.22 acceptance.`);
  const canonical = record.readiness?.checks?.find((item) => item.code === "CANONICAL_IDENTITY");
  const runtime = record.readiness?.checks?.find((item) => item.code === "RUNTIME_REACHABILITY");
  const testsGate = record.readiness?.checks?.find((item) => item.code === "MARKETPLACE_TESTS");
  if (canonical?.state !== "PASS" || runtime?.state !== "PASS" || testsGate?.state !== "PASS") throw new Error(`${name}: canonical/runtime/Test Lab readiness gates are not all PASS.`);
  const tests = (await json(`/v1/services/${encodeURIComponent(serviceId)}/tests`))?.tests;
  if (tests?.coverage !== "PASS") throw new Error(`${name}: Marketplace Test Lab coverage is ${tests?.coverage ?? "missing"}.`);
  console.log(`PASS ${name}: canonical identity + runtime + Test Lab; TESTNET_ONLY; financial activation remains gated.`);
}

console.log("PASS: all four Spotriq reference agents satisfy the v0.22 external-acceptance contract.");
