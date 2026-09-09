import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const rootPackage = JSON.parse(read("package.json"));
const webPackage = JSON.parse(read("apps/web/package.json"));

if (webPackage.dependencies?.["react-router"]) {
  throw new Error("Unused react-router dependency must remain removed; it reintroduces an avoidable vulnerable dependency surface.");
}
if (webPackage.devDependencies?.vite !== "6.4.3") {
  throw new Error("Vite must remain pinned to patched 6.4.3 for the current v6 security line.");
}
const apiPackage = JSON.parse(read("apps/api/package.json"));
if (apiPackage.dependencies?.fastify !== "5.12.3") throw new Error("Fastify must remain on the patched 5.12.3 line.");
if (apiPackage.dependencies?.["@fastify/rate-limit"] !== "11.2.0") throw new Error("CodeQL-visible Fastify perimeter must use patched @fastify/rate-limit 11.2.0.");

const overrides = rootPackage.pnpm?.overrides ?? {};
for (const [selector, version] of Object.entries({
  "ws@>=5.0.0 <5.2.5": "5.2.5",
  "ws@>=6.0.0 <6.2.4": "6.2.4",
  "ws@>=7.0.0 <7.5.11": "7.5.11",
  "ws@>=8.0.0 <8.21.0": "8.21.0",
  "fast-uri@>=2.0.0 <2.4.6": "2.4.6",
  "fast-uri@>=3.0.0 <3.1.7": "3.1.7",
  "fast-uri@>=4.0.0 <4.1.4": "4.1.4",
  "react-router@>=7.0.0 <7.18.3": "7.18.3",
  "react-router-dom@>=7.0.0 <7.18.3": "7.18.3",
})) {
  if (overrides[selector] !== version) throw new Error(`Missing patched dependency override ${selector} -> ${version}`);
}

const codeqlWorkflow = read(".github/workflows/codeql.yml");
if (!codeqlWorkflow.includes("config-file: ./.github/codeql/codeql-config.yml")) {
  throw new Error("CodeQL must load the deployed-source configuration.");
}
const codeqlConfig = read(".github/codeql/codeql-config.yml");
for (const marker of ["security-extended", "scripts/**", "**/*.test.ts"]) {
  if (!codeqlConfig.includes(marker)) throw new Error(`CodeQL deployed-source configuration missing ${marker}`);
}
if (codeqlConfig.includes("js/missing-rate-limiting")) throw new Error("Do not suppress the CodeQL missing-rate-limiting query; expose a recognized real perimeter instead.");

const ci = read(".github/workflows/ci.yml");
if (!ci.includes("pnpm audit --audit-level high")) {
  throw new Error("CI must fail on unresolved High/Critical dependency advisories.");
}

const app = read("apps/api/src/app.ts");
for (const marker of ['app.register(rateLimit', '@fastify/rate-limit', 'TRUSTED_PROXY_CIDRS', 'app.addHook("onRequest"', "rateLimitEnabled", "primaryRateLimitStore.consume", "degradedRateLimitStore.consume", "reply.code(429)"]) {
  if (!app.includes(marker)) throw new Error(`Global API rate-limit invariant missing ${marker}`);
}
const appTests = read("apps/api/src/app.test.ts");
if (!appTests.includes("production perimeter applies cache/security headers and bounded rate limits") || !appTests.includes("429")) {
  throw new Error("API tests must keep proving the global rate-limit perimeter.");
}

const supply = read("packages/marketplace-supply/src/index.ts");
if (supply.includes('.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g')) {
  throw new Error("Agent slug normalization must remain bounded and non-regex-based for untrusted metadata.");
}
if (!supply.includes("Linear, bounded slug normalization")) {
  throw new Error("Bounded agent slug normalization implementation is missing.");
}

const planVerifier = read("scripts/verify-smart-money-plans.mjs");
if (planVerifier.includes("previously persisted live plan ${prior.planId}")) {
  throw new Error("Acceptance verifier must not print persisted plan identifiers unnecessarily.");
}

console.log("PASS: Spotriq security remediation pins current patched dependency floors, uses address-validated proxy trust, exposes a CodeQL-recognized Fastify limiter plus the distributed perimeter, audits High dependencies in CI, and scans deployed source without suppressing rate-limit findings.");
