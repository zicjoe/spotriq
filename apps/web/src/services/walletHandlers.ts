import type { WalletControlState } from "../domain/types";

export type WalletSession = {
  address: string;
  chainId: 97 | 56;
  controlState: WalletControlState;
};

export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

export type DiscoveredWallet = {
  id: string;
  name: string;
  icon?: string;
  rdns?: string;
};

export type WalletConnectionSnapshot = {
  session?: WalletSession;
  connected: boolean;
  wallets: DiscoveredWallet[];
  restoring: boolean;
};

type Eip6963ProviderDetail = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Provider;
};

type PreferredWallet =
  | { kind: "EIP6963"; rdns: string; accountFingerprint?: string }
  | { kind: "LEGACY_INJECTED"; accountFingerprint?: string };

declare global {
  interface Window { ethereum?: Eip1193Provider; }
  interface WindowEventMap { "eip6963:announceProvider": CustomEvent<Eip6963ProviderDetail>; }
}

const PREFERENCE_KEY = "spotriq.wallet.provider.v1";
const providers = new Map<string, Eip6963ProviderDetail>();
const subscribers = new Set<(snapshot: WalletConnectionSnapshot) => void>();
const wiredProviders = new WeakSet<object>();
const restoreInFlight = new WeakSet<object>();
let activeProvider: Eip1193Provider | undefined;
let activeProviderId: string | undefined;
let session: WalletSession | undefined;
let initialized = false;
let restoring = false;
let restoreCycle: Promise<WalletSession | undefined> | undefined;

function parseChainId(value: unknown): 56 | 97 {
  const chainId = typeof value === "string"
    ? (value.startsWith("0x") ? Number.parseInt(value, 16) : Number.parseInt(value, 10))
    : Number(value);
  if (chainId !== 56 && chainId !== 97) throw new Error("Spotriq currently supports BSC Mainnet (56) and BSC Testnet (97) wallets only.");
  return chainId;
}

function assertAddress(value: unknown): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("The connected wallet did not return a valid EVM address.");
  return value.toLowerCase();
}

function walletList(): DiscoveredWallet[] {
  const list: DiscoveredWallet[] = [...providers.values()].map(({ info }) => ({ id: info.uuid, name: info.name, icon: info.icon, rdns: info.rdns }));
  if (!list.length && typeof window !== "undefined" && window.ethereum) list.push({ id: "legacy-injected", name: "Browser Wallet" });
  return list;
}

function snapshot(): WalletConnectionSnapshot {
  return { session, connected: Boolean(session), wallets: walletList(), restoring };
}

function notify() {
  const current = snapshot();
  for (const subscriber of subscribers) subscriber(current);
}

function storage(): Storage | undefined {
  if (typeof window === "undefined") return undefined;
  try { return window.localStorage; } catch { return undefined; }
}

function readPreference(): PreferredWallet | undefined {
  const value = storage()?.getItem(PREFERENCE_KEY);
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<PreferredWallet>;
    const accountFingerprint = typeof parsed.accountFingerprint === "string" && /^[0-9a-f]{64}$/.test(parsed.accountFingerprint)
      ? parsed.accountFingerprint
      : undefined;
    if (parsed.kind === "LEGACY_INJECTED") return { kind: "LEGACY_INJECTED", accountFingerprint };
    if (parsed.kind === "EIP6963" && typeof parsed.rdns === "string" && parsed.rdns.length > 0) return { kind: "EIP6963", rdns: parsed.rdns, accountFingerprint };
  } catch {
    // Invalid local preference is non-authoritative and can be discarded safely.
  }
  storage()?.removeItem(PREFERENCE_KEY);
  return undefined;
}

async function addressFingerprint(address: string): Promise<string | undefined> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return undefined;
  const bytes = new TextEncoder().encode(address.toLowerCase());
  const digest = await subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function rememberProvider(id: string, address: string) {
  const store = storage();
  if (!store) return;
  const accountFingerprint = await addressFingerprint(address);
  if (id === "legacy-injected") {
    store.setItem(PREFERENCE_KEY, JSON.stringify({ kind: "LEGACY_INJECTED", accountFingerprint } satisfies PreferredWallet));
    return;
  }
  const detail = providers.get(id);
  if (detail?.info.rdns) store.setItem(PREFERENCE_KEY, JSON.stringify({ kind: "EIP6963", rdns: detail.info.rdns, accountFingerprint } satisfies PreferredWallet));
}

async function persistPreferenceFingerprint(preference: PreferredWallet, address: string) {
  const store = storage();
  if (!store) return;
  const accountFingerprint = await addressFingerprint(address);
  if (!accountFingerprint) return;
  store.setItem(PREFERENCE_KEY, JSON.stringify({ ...preference, accountFingerprint }));
}

async function upgradePreferenceFingerprint(preference: PreferredWallet, address: string) {
  if (preference.accountFingerprint) return;
  await persistPreferenceFingerprint(preference, address);
}

function forgetProvider() {
  storage()?.removeItem(PREFERENCE_KEY);
}

function wireProviderEvents(provider: Eip1193Provider) {
  if (wiredProviders.has(provider as object)) return;
  wiredProviders.add(provider as object);

  provider.on?.("accountsChanged", async (accounts: unknown) => {
    if (!Array.isArray(accounts) || !accounts[0]) {
      session = undefined;
      notify();
      return;
    }
    try {
      const chain = await provider.request({ method: "eth_chainId" });
      session = { address: assertAddress(accounts[0]), chainId: parseChainId(chain), controlState: "CONNECTED" };
      const preference = readPreference();
      if (preference) await persistPreferenceFingerprint(preference, session.address);
    } catch {
      session = undefined;
    }
    notify();
  });

  provider.on?.("chainChanged", (chain: unknown) => {
    if (!session) return;
    try { session = { ...session, chainId: parseChainId(chain) }; }
    catch { session = undefined; }
    notify();
  });
}

function preferenceMatches(id: string, detail?: Eip6963ProviderDetail): boolean {
  const preference = readPreference();
  if (!preference) return false;
  if (preference.kind === "LEGACY_INJECTED") return id === "legacy-injected";
  return Boolean(detail?.info.rdns && detail.info.rdns === preference.rdns);
}

async function restoreProvider(id: string, provider: Eip1193Provider, detail?: Eip6963ProviderDetail): Promise<WalletSession | undefined> {
  if (session) return session;
  if (!preferenceMatches(id, detail) || restoreInFlight.has(provider as object)) return session;
  restoreInFlight.add(provider as object);
  restoring = true;
  notify();
  try {
    activeProvider = provider;
    activeProviderId = id;
    wireProviderEvents(provider);
    const accounts = await provider.request({ method: "eth_accounts" });
    const account = Array.isArray(accounts) ? accounts[0] : undefined;
    if (!account) {
      session = undefined;
      return undefined;
    }
    const address = assertAddress(account);
    const chain = await provider.request({ method: "eth_chainId" });
    session = { address, chainId: parseChainId(chain), controlState: "CONNECTED" };
    const preference = readPreference();
    if (preference) await persistPreferenceFingerprint(preference, address);
    return session;
  } catch {
    session = undefined;
    return undefined;
  } finally {
    restoring = false;
    restoreInFlight.delete(provider as object);
    notify();
  }
}

async function restorePreferredFromKnownProviders(): Promise<WalletSession | undefined> {
  const preference = readPreference();
  if (!preference) return undefined;
  if (preference.kind === "EIP6963") {
    for (const [id, detail] of providers) {
      if (detail.info.rdns === preference.rdns) return restoreProvider(id, detail.provider, detail);
    }
    return undefined;
  }
  if (typeof window !== "undefined" && window.ethereum) return restoreProvider("legacy-injected", window.ethereum);
  return undefined;
}

async function restoreAuthorizedInjectedFallback(): Promise<WalletSession | undefined> {
  const preference = readPreference();
  if (!preference || preference.kind !== "EIP6963" || typeof window === "undefined" || !window.ethereum || session) return session;

  restoring = true;
  notify();
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    const account = Array.isArray(accounts) ? accounts[0] : undefined;
    if (!account) return undefined;
    const address = assertAddress(account);

    // A remembered fingerprint prevents a silent refresh fallback from binding
    // Spotriq to a different injected wallet when multiple extensions coexist.
    if (preference.accountFingerprint) {
      const candidateFingerprint = await addressFingerprint(address);
      if (!candidateFingerprint || candidateFingerprint !== preference.accountFingerprint) return undefined;
    } else if (providers.size > 0) {
      // Old v1 preferences without a fingerprint may migrate only when there are
      // no announced EIP-6963 candidates; otherwise fail closed rather than guess.
      return undefined;
    }

    const chain = await window.ethereum.request({ method: "eth_chainId" });
    activeProvider = window.ethereum;
    activeProviderId = "legacy-injected";
    wireProviderEvents(window.ethereum);
    session = { address, chainId: parseChainId(chain), controlState: "CONNECTED" };
    await upgradePreferenceFingerprint(preference, address);
    return session;
  } catch {
    return undefined;
  } finally {
    restoring = false;
    notify();
  }
}

async function restoreSessionInternal(): Promise<WalletSession | undefined> {
  if (session) return session;
  if (restoreCycle) return restoreCycle;
  restoreCycle = (async () => {
    const immediate = await restorePreferredFromKnownProviders();
    if (immediate || !readPreference()) return immediate;

    // Give EIP-6963 wallets a brief opportunity to answer requestProvider. Some
    // extensions announce asynchronously; others expose only window.ethereum on
    // reload. The latter is handled by a non-interactive eth_accounts fallback.
    await new Promise((resolve) => setTimeout(resolve, 180));
    if (session) return session;
    const announced = await restorePreferredFromKnownProviders();
    if (announced) return announced;
    return restoreAuthorizedInjectedFallback();
  })().finally(() => { restoreCycle = undefined; });
  return restoreCycle;
}

function initializeDiscovery() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = event.detail;
    if (!detail?.info?.uuid || !detail.provider) return;
    providers.set(detail.info.uuid, detail);
    notify();
    if (!session && preferenceMatches(detail.info.uuid, detail)) void restoreProvider(detail.info.uuid, detail.provider, detail);
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== PREFERENCE_KEY) return;
    if (!event.newValue) {
      session = undefined;
      activeProvider = undefined;
      activeProviderId = undefined;
      restoring = false;
      notify();
      return;
    }
    void restoreSessionInternal();
  });

  window.dispatchEvent(new Event("eip6963:requestProvider"));
  if (readPreference()) void restoreSessionInternal();
}

initializeDiscovery();

function resolveProvider(id?: string): { id: string; provider: Eip1193Provider } {
  if (id && providers.has(id)) return { id, provider: providers.get(id)!.provider };
  if (id === "legacy-injected" && window.ethereum) return { id, provider: window.ethereum };
  const first = providers.values().next().value as Eip6963ProviderDetail | undefined;
  if (first) return { id: first.info.uuid, provider: first.provider };
  if (window.ethereum) return { id: "legacy-injected", provider: window.ethereum };
  throw new Error("No compatible EVM wallet was detected in this browser. Install a wallet extension on desktop, or open Spotriq inside your mobile wallet's dapp browser. Read-only wallet checks remain available without connecting.");
}

async function connectProvider(id?: string): Promise<WalletSession> {
  const selected = resolveProvider(id);
  const accounts = await selected.provider.request({ method: "eth_requestAccounts" });
  const account = Array.isArray(accounts) ? accounts[0] : undefined;
  const chain = await selected.provider.request({ method: "eth_chainId" });
  session = { address: assertAddress(account), chainId: parseChainId(chain), controlState: "CONNECTED" };
  activeProvider = selected.provider;
  activeProviderId = selected.id;
  wireProviderEvents(selected.provider);
  await rememberProvider(selected.id, session.address);
  notify();
  return session;
}

/**
 * Zero-service wallet boundary.
 *
 * Spotriq discovers installed EVM wallets with EIP-6963 and retains the legacy
 * EIP-1193 `window.ethereum` fallback. It requires no hosted wallet account,
 * project ID, relay plan, or custodial wallet service.
 *
 * The remembered browser preference contains a provider locator plus, where
 * available, a one-way SHA-256 account fingerprint — never the raw wallet
 * address. On refresh Spotriq calls `eth_accounts`, which is non-interactive,
 * to reconcile an account the user already approved. It never re-prompts merely
 * because the page reloaded, and a fingerprint mismatch fails closed.
 *
 * Connection identifies an account only. It never creates a PermissionGrant,
 * marketplace Activation, payment, transaction, or financial execution authority.
 */
export const walletHandlers = {
  getSession(): WalletSession | undefined { return session; },
  getSnapshot(): WalletConnectionSnapshot { initializeDiscovery(); return snapshot(); },
  getWallets(): DiscoveredWallet[] { initializeDiscovery(); return walletList(); },
  hasInjectedWallet(): boolean { return walletList().length > 0; },

  subscribe(subscriber: (snapshot: WalletConnectionSnapshot) => void) {
    initializeDiscovery();
    subscribers.add(subscriber);
    subscriber(snapshot());
    return () => { subscribers.delete(subscriber); };
  },

  async restoreSession(): Promise<WalletSession | undefined> {
    initializeDiscovery();
    return restoreSessionInternal();
  },

  async connectWallet(walletId?: string): Promise<WalletSession> {
    if (session && (!walletId || walletId === activeProviderId)) return session;
    return connectProvider(walletId);
  },

  async openAccount(): Promise<void> {
    if (!session) await connectProvider(activeProviderId);
  },

  async disconnectWallet(): Promise<void> {
    forgetProvider();
    session = undefined;
    activeProvider = undefined;
    activeProviderId = undefined;
    restoring = false;
    notify();
  },

  async verifyWalletOwnership(current: WalletSession): Promise<WalletSession> {
    return { ...current, controlState: "VERIFIED_CONTROL" };
  },

  async signMessage(address: string, message: string): Promise<string> {
    if (!activeProvider) throw new Error("No connected EVM wallet provider is available.");
    if (session && session.address !== address.toLowerCase()) throw new Error("The active wallet does not match the address Spotriq is asking to sign for.");
    const signature = await activeProvider.request({ method: "personal_sign", params: [message, address] });
    if (typeof signature !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(signature)) throw new Error("Wallet did not return a valid EIP-191 signature.");
    return signature;
  },

  async requestPermission() { return { status: "MOCK_ONLY" as const }; },
  async revokePermission() { return { status: "MOCK_ONLY" as const }; },

  async switchNetwork(chainId: 97 | 56) {
    if (!activeProvider) throw new Error("No connected EVM wallet provider is available.");
    await activeProvider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
    return { chainId };
  },
};

export function subscribeWalletConnection(subscriber: (snapshot: WalletConnectionSnapshot) => void) {
  return walletHandlers.subscribe(subscriber);
}

export function trustWalletDappLink(): string {
  if (typeof window === "undefined") return "https://link.trustwallet.com";
  return `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(window.location.href)}`;
}
