import type { WalletControlState } from "../domain/types";

export type WalletSession = {
  address: string;
  chainId: 97 | 56;
  controlState: WalletControlState;
};

type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
};

declare global {
  interface Window { ethereum?: Eip1193Provider; }
}

function parseChainId(value: unknown): 56 | 97 {
  const chainId = typeof value === "string" ? Number.parseInt(value, 16) : Number(value);
  if (chainId !== 56 && chainId !== 97) throw new Error("Spotriq currently supports BSC Mainnet (56) and BSC Testnet (97) wallets only.");
  return chainId;
}

function assertAddress(value: unknown): string {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) throw new Error("The connected wallet did not return a valid EVM address.");
  return value.toLowerCase();
}

/**
 * Wallet boundary. The browser implementation uses the standard EIP-1193
 * provider exposed by installed EVM wallets without adding wallet-provider
 * logic to presentation components. wagmi/viem/Altana can replace this adapter
 * later without changing Smart Money Check screens.
 */
export const walletHandlers = {
  async connectWallet(): Promise<WalletSession> {
    const provider = window.ethereum;
    if (!provider) throw new Error("No EVM wallet was detected. Enter a BSC address for a read-only check, or install/connect a compatible wallet.");
    const accounts = await provider.request({ method: "eth_requestAccounts" });
    const account = Array.isArray(accounts) ? accounts[0] : undefined;
    const chain = await provider.request({ method: "eth_chainId" });
    return { address: assertAddress(account), chainId: parseChainId(chain), controlState: "CONNECTED" };
  },

  async verifyWalletOwnership(session: WalletSession): Promise<WalletSession> {
    return { ...session, controlState: "VERIFIED_CONTROL" };
  },

  async requestPermission() { return { status: "MOCK_ONLY" as const }; },
  async revokePermission() { return { status: "MOCK_ONLY" as const }; },

  async switchNetwork(chainId: 97 | 56) {
    const provider = window.ethereum;
    if (!provider) throw new Error("No EVM wallet was detected.");
    await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
    return { chainId };
  },
};
