import type { WalletControlState } from "../domain/types";

export type WalletSession = {
  address: string;
  chainId: 97 | 56;
  controlState: WalletControlState;
};

/**
 * Wallet UI boundary. Replace the mock methods with wagmi/viem/Altana-backed
 * handlers during integration. Presentation components should not talk directly
 * to wallet provider internals.
 */
export const walletHandlers = {
  async connectWallet(): Promise<WalletSession> {
    return {
      address: "0x7F3a000000000000000000000000000000009c2d",
      chainId: 97,
      controlState: "CONNECTED",
    };
  },

  async verifyWalletOwnership(session: WalletSession): Promise<WalletSession> {
    return { ...session, controlState: "VERIFIED_CONTROL" };
  },

  async requestPermission() {
    return { status: "MOCK_ONLY" as const };
  },

  async revokePermission() {
    return { status: "MOCK_ONLY" as const };
  },

  async switchNetwork(chainId: 97 | 56) {
    return { chainId };
  },
};
