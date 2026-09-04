import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const sourcePath = path.join(root, "apps/web/src/services/walletHandlers.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  },
  fileName: sourcePath,
  reportDiagnostics: true,
});
const fatalDiagnostics = (transpiled.diagnostics ?? []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
if (fatalDiagnostics.length) {
  throw new Error(`Wallet lifecycle transpilation failed: ${fatalDiagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")).join("; ")}`);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "spotriq-wallet-lifecycle-"));
const modulePath = path.join(tempDir, "walletHandlers.mjs");
fs.writeFileSync(modulePath, transpiled.outputText);

const ADDRESS1 = "0x1111111111111111111111111111111111111111";
const ADDRESS2 = "0x2222222222222222222222222222222222222222";

class MemoryStorage {
  map = new Map();
  getItem(key) { return this.map.has(key) ? this.map.get(key) : null; }
  setItem(key, value) { this.map.set(key, String(value)); }
  removeItem(key) { this.map.delete(key); }
}

class MockProvider {
  constructor({ accounts = [ADDRESS1], chain = "0x61", reject = false } = {}) {
    this.accounts = accounts;
    this.chain = chain;
    this.reject = reject;
    this.calls = [];
    this.listeners = new Map();
  }
  async request({ method, params }) {
    this.calls.push({ method, params });
    if (method === "eth_requestAccounts") {
      if (this.reject) throw Object.assign(new Error("User rejected"), { code: 4001 });
      return this.accounts;
    }
    if (method === "eth_accounts") return this.accounts;
    if (method === "eth_chainId") return this.chain;
    if (method === "wallet_switchEthereumChain") {
      this.chain = params?.[0]?.chainId;
      this.emit("chainChanged", this.chain);
      return null;
    }
    if (method === "personal_sign") return `0x${"ab".repeat(65)}`;
    throw new Error(`Unexpected wallet RPC method in lifecycle verifier: ${method}`);
  }
  on(event, listener) {
    const listeners = this.listeners.get(event) ?? new Set();
    listeners.add(listener);
    this.listeners.set(event, listeners);
  }
  removeListener(event, listener) { this.listeners.get(event)?.delete(listener); }
  emit(event, payload) { for (const listener of this.listeners.get(event) ?? []) listener(payload); }
}

function makeEip6963Window(storage, provider, uuid = "wallet-uuid", rdns = "io.spotriq.testwallet") {
  const target = new EventTarget();
  target.localStorage = storage;
  target.location = { href: "https://spotriq.example/check" };
  target.addEventListener("eip6963:requestProvider", () => {
    target.dispatchEvent(new CustomEvent("eip6963:announceProvider", {
      detail: { info: { uuid, name: "Spotriq Test Wallet", rdns }, provider },
    }));
  });
  return target;
}

function makeSilentReloadWindow(storage, provider) {
  const target = new EventTarget();
  target.localStorage = storage;
  target.location = { href: "https://spotriq.example/check" };
  // Real extensions do not all re-announce EIP-6963 providers after every page
  // refresh. The authorized injected provider remains available through
  // window.ethereum, which Spotriq must reconcile without prompting again.
  target.ethereum = provider;
  return target;
}

function makeLegacyWindow(storage, provider) {
  const target = new EventTarget();
  target.localStorage = storage;
  target.location = { href: "https://spotriq.example/check" };
  target.ethereum = provider;
  return target;
}

async function importFresh(tag) {
  const url = pathToFileURL(modulePath);
  url.searchParams.set("v", `${tag}-${Date.now()}-${Math.random()}`);
  return import(url.href);
}

async function flush(delay = 0) { await new Promise((resolve) => setTimeout(resolve, delay)); }

try {
  // 1. Rejection remains disconnected and stores no preference.
  {
    const storage = new MemoryStorage();
    const provider = new MockProvider({ reject: true });
    globalThis.window = makeEip6963Window(storage, provider, "reject-uuid");
    const { walletHandlers } = await importFresh("reject");
    await assert.rejects(() => walletHandlers.connectWallet("reject-uuid"));
    assert.equal(walletHandlers.getSession(), undefined);
    assert.equal(storage.map.size, 0);
    assert.deepEqual(provider.calls.map((call) => call.method), ["eth_requestAccounts"]);
  }

  // 2. Successful connection stores only the provider locator and calls no financial RPC.
  const storage = new MemoryStorage();
  {
    const provider = new MockProvider();
    globalThis.window = makeEip6963Window(storage, provider, "connect-uuid");
    const { walletHandlers } = await importFresh("connect");
    const connected = await walletHandlers.connectWallet("connect-uuid");
    assert.equal(connected.address, ADDRESS1);
    assert.equal(connected.chainId, 97);
    assert.equal(connected.controlState, "CONNECTED");
    const persisted = [...storage.map.values()].join(" ");
    assert.match(persisted, /io\.spotriq\.testwallet/);
    assert.ok(!persisted.toLowerCase().includes(ADDRESS1.slice(2).toLowerCase()), "Wallet address must not be persisted in the provider preference.");
    assert.deepEqual(provider.calls.map((call) => call.method), ["eth_requestAccounts", "eth_chainId"]);
  }

  // 3. Reload restores silently with eth_accounts; no second wallet approval prompt.
  let restoredModule;
  let restoredProvider;
  {
    restoredProvider = new MockProvider();
    globalThis.window = makeEip6963Window(storage, restoredProvider, "reload-uuid");
    restoredModule = await importFresh("reload");
    await flush();
    assert.equal(restoredModule.walletHandlers.getSession()?.address, ADDRESS1);
    assert.equal(restoredModule.walletHandlers.getSession()?.chainId, 97);
    assert.deepEqual(restoredProvider.calls.map((call) => call.method), ["eth_accounts", "eth_chainId"]);
  }

  // 4. Reload also restores when the wallet does NOT re-announce EIP-6963.
  // This reproduces the production refresh regression found during manual testing.
  {
    const silentProvider = new MockProvider();
    globalThis.window = makeSilentReloadWindow(storage, silentProvider);
    const silentReload = await importFresh("silent-reload");
    await flush(260);
    assert.equal(silentReload.walletHandlers.getSession()?.address, ADDRESS1);
    assert.equal(silentReload.walletHandlers.getSession()?.chainId, 97);
    assert.deepEqual(silentProvider.calls.map((call) => call.method), ["eth_accounts", "eth_chainId"]);
    assert.ok(!silentProvider.calls.some((call) => call.method === "eth_requestAccounts"), "Refresh restore must never reopen a wallet approval prompt.");
  }

  // 5. A silent injected fallback with a different account must fail closed.
  {
    const mismatchedProvider = new MockProvider({ accounts: [ADDRESS2] });
    globalThis.window = makeSilentReloadWindow(storage, mismatchedProvider);
    const mismatchedReload = await importFresh("silent-mismatch");
    await flush(260);
    assert.equal(mismatchedReload.walletHandlers.getSession(), undefined);
    assert.deepEqual(mismatchedProvider.calls.map((call) => call.method), ["eth_accounts"]);
  }

  // 6. Account and chain changes reconcile; unsupported chains fail closed.
  {
    restoredProvider.accounts = [ADDRESS2];
    restoredProvider.emit("accountsChanged", [ADDRESS2]);
    await flush();
    assert.equal(restoredModule.walletHandlers.getSession()?.address, ADDRESS2);

    restoredProvider.emit("chainChanged", "0x38");
    await flush();
    assert.equal(restoredModule.walletHandlers.getSession()?.chainId, 56);

    restoredProvider.emit("chainChanged", "0x1");
    await flush();
    assert.equal(restoredModule.walletHandlers.getSession(), undefined);
  }

  // 7. Explicit Spotriq disconnect removes the restore preference.
  {
    restoredProvider.chain = "0x61";
    const restored = await restoredModule.walletHandlers.restoreSession();
    assert.equal(restored?.address, ADDRESS2);
    await restoredModule.walletHandlers.disconnectWallet();
    assert.equal(restoredModule.walletHandlers.getSession(), undefined);
    assert.equal(storage.map.size, 0);
  }

  // 8. Reload after explicit disconnect must not silently reconnect.
  {
    const provider = new MockProvider({ accounts: [ADDRESS2] });
    globalThis.window = makeEip6963Window(storage, provider, "after-disconnect");
    const { walletHandlers } = await importFresh("after-disconnect");
    await flush();
    assert.equal(walletHandlers.getSession(), undefined);
    assert.deepEqual(provider.calls.map((call) => call.method), []);
  }

  // 9. Cross-tab preference changes reconcile without wallet prompts.
  {
    const tabStorage = new MemoryStorage();
    const tabProvider = new MockProvider();
    const tabWindow = makeEip6963Window(tabStorage, tabProvider, "tab-uuid");
    globalThis.window = tabWindow;
    const tabModule = await importFresh("cross-tab");
    await flush();
    assert.equal(tabModule.walletHandlers.getSession(), undefined);
    assert.deepEqual(tabProvider.calls.map((call) => call.method), []);

    const preference = JSON.stringify({ kind: "EIP6963", rdns: "io.spotriq.testwallet" });
    tabStorage.setItem("spotriq.wallet.provider.v1", preference);
    const connectEvent = new Event("storage");
    Object.defineProperties(connectEvent, { key: { value: "spotriq.wallet.provider.v1" }, newValue: { value: preference } });
    tabWindow.dispatchEvent(connectEvent);
    await flush();
    assert.equal(tabModule.walletHandlers.getSession()?.address, ADDRESS1);
    assert.deepEqual(tabProvider.calls.map((call) => call.method), ["eth_accounts", "eth_chainId"]);

    tabStorage.removeItem("spotriq.wallet.provider.v1");
    const disconnectEvent = new Event("storage");
    Object.defineProperties(disconnectEvent, { key: { value: "spotriq.wallet.provider.v1" }, newValue: { value: null } });
    tabWindow.dispatchEvent(disconnectEvent);
    await flush();
    assert.equal(tabModule.walletHandlers.getSession(), undefined);
  }

  // 10. Legacy EIP-1193 fallback receives the same silent-refresh behavior.
  {
    const legacyStorage = new MemoryStorage();
    const provider1 = new MockProvider();
    globalThis.window = makeLegacyWindow(legacyStorage, provider1);
    const first = await importFresh("legacy-connect");
    await first.walletHandlers.connectWallet("legacy-injected");
    assert.deepEqual(provider1.calls.map((call) => call.method), ["eth_requestAccounts", "eth_chainId"]);

    const provider2 = new MockProvider();
    globalThis.window = makeLegacyWindow(legacyStorage, provider2);
    const second = await importFresh("legacy-reload");
    await flush();
    assert.equal(second.walletHandlers.getSession()?.address, ADDRESS1);
    assert.deepEqual(provider2.calls.map((call) => call.method), ["eth_accounts", "eth_chainId"]);
  }

  console.log("PASS: Spotriq wallet session lifecycle passed rejection, connect, EIP-6963 refresh, non-announcing injected refresh fallback, account-fingerprint mismatch protection, account/chain reconciliation, disconnect, cross-tab reconciliation, privacy, and legacy fallback tests.");
} finally {
  delete globalThis.window;
  fs.rmSync(tempDir, { recursive: true, force: true });
}
