import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicAdoptionManifest } from "./index.js";

test("public adoption manifest preserves product and network truth", () => {
  const manifest = buildPublicAdoptionManifest();
  assert.equal(manifest.release.version, "0.38.0");
  assert.equal(manifest.release.acceptedThrough, "0.37.0");
  assert.equal(manifest.networks.discovery.chainId, 56);
  assert.equal(manifest.networks.transactionalDevelopment.chainId, 97);
  assert.equal(manifest.networks.bscMainnetFinancialExecutionApproved, false);
});

test("public adoption manifest keeps integrations distinct from authority", () => {
  const manifest = buildPublicAdoptionManifest();
  assert.ok(manifest.integrations.some((item) => item.code === "ERC8004"));
  assert.ok(manifest.integrations.some((item) => item.code === "BNB_AGENT_STUDIO"));
  assert.ok(manifest.integrations.some((item) => item.code === "ERC8183"));
  assert.ok(manifest.integrations.some((item) => item.code === "X402_B402"));
  assert.ok(manifest.truthBoundaries.includes("Permission ≠ Activation ≠ Execution"));
  assert.ok(manifest.truthBoundaries.includes("AI explains. Deterministic systems decide."));
});

test("public launch package exposes only truthful external follow-up items", () => {
  const manifest = buildPublicAdoptionManifest();
  assert.equal(manifest.readiness.publicDocsComplete, true);
  assert.equal(manifest.readiness.machineReadableAdoptionManifest, true);
  assert.equal(manifest.readiness.mainnetFinancialExecutionApproved, false);
  assert.ok(manifest.readiness.unresolvedExternalItems.some((item) => item.includes("screenshots")));
});
