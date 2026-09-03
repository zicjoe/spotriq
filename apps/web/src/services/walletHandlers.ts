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

type Eip6963ProviderDetail = {
  info: { uuid: string; name: string; icon?: string; rdns?: string };
  provider: Eip1193Provider;
};

type WalletConnectionSnapshot = {
  session?: WalletSession;
  connected: boolean;
  wallets: DiscoveredWallet[];
};

declare global {
  interface Window { ethereum?: Eip1193Provider; }
  interface WindowEventMap { "eip6963:announceProvider": CustomEvent<Eip6963ProviderDetail>; }
}

const providers = new Map<string, Eip6963ProviderDetail>();
const subscribers = new Set<(snapshot: WalletConnectionSnapshot) => void>();
let activeProvider: Eip1193Provider | undefined;
let activeProviderId: string | undefined;
let session: WalletSession | undefined;
let initialized = false;

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

function notify() {
  const snapshot: WalletConnectionSnapshot = { session, connected: Boolean(session), wallets: walletList() };
  for (const subscriber of subscribers) subscriber(snapshot);
}

function wireProviderEvents(provider: Eip1193Provider) {
  provider.on?.("accountsChanged", async (accounts: unknown) => {
    if (!Array.isArray(accounts) || !accounts[0]) {
      session = undefined;
      notify();
      return;
    }
    try {
      const chain = await provider.request({ method: "eth_chainId" });
      session = { address: assertAddress(accounts[0]), chainId: parseChainId(chain), controlState: "CONNECTED" };
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

function initializeDiscovery() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  window.addEventListener("eip6963:announceProvider", (event) => {
    const detail = event.detail;
    if (!detail?.info?.uuid || !detail.provider) return;
    providers.set(detail.info.uuid, detail);
    notify();
  });
  window.dispatchEvent(new Event("eip6963:requestProvider"));
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
  notify();
  return session;
}

/**
 * Zero-service wallet boundary.
 *
 * Spotriq discovers installed EVM wallets with EIP-6963 and retains the legacy
 * EIP-1193 `window.ethereum` fallback. It requires no Reown/thirdweb account,
 * WalletConnect project ID, hosted relay plan, or custodial wallet service.
 *
 * Connection identifies an account only. It never creates a PermissionGrant,
 * marketplace Activation, payment, transaction, or financial execution authority.
 */
export const walletHandlers = {
  getSession(): WalletSession | undefined { return session; },
  getWallets(): DiscoveredWallet[] { initializeDiscovery(); return walletList(); },
  hasInjectedWallet(): boolean { return walletList().length > 0; },

  subscribe(subscriber: (snapshot: WalletConnectionSnapshot) => void) {
    initializeDiscovery();
    subscribers.add(subscriber);
    subscriber({ session, connected: Boolean(session), wallets: walletList() });
    return () => { subscribers.delete(subscriber); };
  },

  async connectWallet(walletId?: string): Promise<WalletSession> {
    if (session && (!walletId || walletId === activeProviderId)) return session;
    return connectProvider(walletId);
  },

  async openAccount(): Promise<void> {
    if (!session) await connectProvider(activeProviderId);
  },

  async disconnectWallet(): Promise<void> {
    session = undefined;
    activeProvider = undefined;
    activeProviderId = undefined;
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
