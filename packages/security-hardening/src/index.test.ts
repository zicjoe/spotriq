import assert from "node:assert/strict";
import test from "node:test";
import {
  assertStructuredJsonBudget,
  isDatabaseUniqueViolation,
  isPublicNetworkAddress,
  normalizeUntrustedText,
  validateExternalHttpUrl,
} from "./index.js";

test("public-address policy blocks loopback, private, metadata/link-local, documentation and multicast ranges", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "192.168.1.5", "192.0.2.5", "198.51.100.9", "203.0.113.9", "224.0.0.1", "::1", "fc00::1", "fe80::1", "2001:db8::1", "ff02::1", "::ffff:127.0.0.1"]) {
    assert.equal(isPublicNetworkAddress(address), false, address);
  }
  assert.equal(isPublicNetworkAddress("1.1.1.1"), true);
  assert.equal(isPublicNetworkAddress("2606:4700:4700::1111"), true);
});

test("untrusted URL policy rejects credential, local, metadata, single-label and fragment tricks", () => {
  for (const value of [
    "https://user:pass@example.com/",
    "https://localhost/",
    "https://localhost./",
    "https://service.internal/",
    "https://metadata.google.internal/",
    "https://169.254.169.254/latest/meta-data/",
    "https://intranet/path",
    "https://example.com/path#hidden-target",
  ]) assert.throws(() => validateExternalHttpUrl(value), /must not|reserved|blocked|fully-qualified|fragment/);
  assert.equal(validateExternalHttpUrl("https://agent.example/a2a").hostname, "agent.example");
});

test("untrusted text rejects invisible spoofing controls while preserving ordinary multiline text", () => {
  assert.equal(normalizeUntrustedText("  Grid\nAgent  ", "name", 100), "Grid\nAgent");
  assert.throws(() => normalizeUntrustedText("safe\u202Eevil", "name", 100), /unsafe control/);
  assert.throws(() => normalizeUntrustedText("safe\u0000evil", "name", 100), /unsafe control/);
});

test("structured response budget rejects deep, broad and prototype-shaped provider payloads", () => {
  assert.doesNotThrow(() => assertStructuredJsonBudget({ jsonrpc: "2.0", result: { tools: [{ name: "inspect" }] } }));
  assert.throws(() => assertStructuredJsonBudget({ values: Array.from({ length: 300 }, (_, i) => i) }), /array exceeds/);
  let deep: unknown = "x";
  for (let i = 0; i < 20; i += 1) deep = { next: deep };
  assert.throws(() => assertStructuredJsonBudget(deep), /nesting depth/);
  const polluted = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => assertStructuredJsonBudget(polluted), /forbidden key/);
});

test("database unique violation detection is explicit and does not classify arbitrary provider errors", () => {
  assert.equal(isDatabaseUniqueViolation({ code: "23505", constraint: "x" }), true);
  assert.equal(isDatabaseUniqueViolation(new Error("duplicate")), false);
});
