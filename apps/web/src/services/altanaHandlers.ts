import type { AltanaTestnetProbeProof, BoundaryApprovalExecutionProof, BoundaryFinancialSessionProof, ControlledExecutionProof, PermissionCallScope, PermissionSpendScope } from "../domain/types";

let client: any;
let wallet: any;
const boundaryFinancialSessions = new Map<string, any>();

async function sdk() {
  const altana = await import("@altananetwork/sdk");
  if (!client) client = altana.createClient({ chains: [altana.BNB_TESTNET] });
  return { altana, client };
}

function rpId(): string {
  return window.location.hostname || "localhost";
}

function normalizeAddress(value: string): string { return value.toLowerCase(); }

export const altanaHandlers = {
  async createTestnetPasskeyWallet(): Promise<{ address: string; chainId: 97 }> {
    const { client } = await sdk();
    wallet = await client.createPasskeyWallet({ name: "Spotriq", rpId: rpId(), chainId: 97 });
    return { address: normalizeAddress(wallet.address), chainId: 97 };
  },

  async recoverTestnetPasskeyWallet(): Promise<{ address: string; chainId: 97 }> {
    const { client } = await sdk();
    wallet = await client.recoverFromPasskey({ rpId: rpId(), chainId: 97 });
    return { address: normalizeAddress(wallet.address), chainId: 97 };
  },

  async grantReadOnlyProbe(input: { expectedWalletAddress: string; target: string; expiryUnix: number }): Promise<AltanaTestnetProbeProof> {
    const { altana, client } = await sdk();
    if (!wallet) throw new Error("Create or recover the Altana BSC Testnet passkey wallet first.");
    if (normalizeAddress(wallet.address) !== normalizeAddress(input.expectedWalletAddress)) {
      throw new Error("The recovered Altana smart wallet does not match this Job Intent wallet. Run the Smart Money Check against the Altana wallet address before creating a probe grant.");
    }
    const sessionSigner = altana.createPrivateKeySigner();
    const result = await client.grantSession({
      wallet,
      signer: wallet.signer,
      sessionSigner,
      permissions: {
        calls: [{ to: input.target, signature: "positions(uint256)" }],
      },
      expiry: input.expiryUnix,
      register: true,
      chainId: 97,
    });
    return {
      walletAddress: normalizeAddress(result.walletAddress),
      target: input.target,
      signature: "positions(uint256)",
      sessionPublicKey: result.publicKey,
      transactionHash: result.transactionHash,
      expiryUnix: result.expiry,
    };
  },


  async grantBoundaryFinancialSession(input: { expectedWalletAddress: string; calls: PermissionCallScope[]; spendCaps: PermissionSpendScope[]; expiryUnix: number }): Promise<BoundaryFinancialSessionProof> {
    const { altana, client } = await sdk();
    if (!wallet) throw new Error("Create or recover the Altana BSC Testnet passkey wallet first.");
    if (normalizeAddress(wallet.address) !== normalizeAddress(input.expectedWalletAddress)) throw new Error("Recovered Altana wallet does not match the execution-boundary wallet.");
    if (!input.calls.length || !input.spendCaps.length) throw new Error("Spotriq refuses to create an unrestricted Altana financial session. Exact calls and token spend caps are required.");
    const sessionSigner = altana.createPrivateKeySigner();
    const result = await client.grantSession({
      wallet, signer: wallet.signer, sessionSigner,
      permissions: {
        calls: input.calls.map((call) => ({ to: call.to, signature: call.signature })),
        spend: input.spendCaps.map((cap) => ({ token: cap.token, limit: BigInt(cap.limitRaw), period: cap.period })),
      },
      expiry: input.expiryUnix, register: true, chainId: 97,
    });
    boundaryFinancialSessions.set(String(result.publicKey).toLowerCase(), result);
    const grantedCalls = Array.isArray(result.permissions?.calls) ? result.permissions.calls.map((call: any) => ({ to: String(call.to), signature: String(call.signature ?? "") })) : input.calls.map((call) => ({ to: call.to, signature: call.signature }));
    const grantedSpend = Array.isArray(result.permissions?.spend) ? result.permissions.spend.map((cap: any) => ({ token: String(cap.token), limitRaw: String(cap.limit), period: cap.period })) : input.spendCaps.map((cap) => ({ token: cap.token, limitRaw: cap.limitRaw, period: cap.period }));
    return { walletAddress: normalizeAddress(result.walletAddress), sessionPublicKey: result.publicKey, transactionHash: result.transactionHash, calls: grantedCalls, spend: grantedSpend, expiryUnix: result.expiry };
  },


  hasBoundaryFinancialSessionSigner(sessionPublicKey: string): boolean {
    return boundaryFinancialSessions.has(sessionPublicKey.toLowerCase());
  },

  async executeExactApprovalPlan(input: { expectedWalletAddress: string; calls: Array<{ to: string; data: string; valueRaw: string }> }): Promise<BoundaryApprovalExecutionProof> {
    const { client } = await sdk();
    if (!wallet) throw new Error("Create or recover the matching Altana BSC Testnet passkey wallet before approving tokens.");
    if (normalizeAddress(wallet.address) !== normalizeAddress(input.expectedWalletAddress)) throw new Error("Recovered Altana wallet does not match the approval-plan wallet.");
    if (!input.calls.length) throw new Error("The bounded approval plan has no calls to submit.");
    const result = await client.execute({
      wallet,
      signer: wallet.signer,
      calls: input.calls.map((call) => ({ to: call.to, data: call.data, value: BigInt(call.valueRaw) })),
      chainId: 97,
    });
    return { callsId: result.callsId, status: result.status, transactionHash: result.transactionHash };
  },

  async executeControlledBoundaryPlan(input: { expectedWalletAddress: string; sessionPublicKey: string; calls: Array<{ to: string; data: string; valueRaw: string }> }): Promise<ControlledExecutionProof> {
    const { client } = await sdk();
    const session = boundaryFinancialSessions.get(input.sessionPublicKey.toLowerCase());
    if (!session) throw new Error("The exact boundary financial session signer is not available in this browser process. Spotriq does not reconstruct or download session private keys. Revoke the old grant if necessary and create a fresh boundary financial session.");
    if (normalizeAddress(session.walletAddress) !== normalizeAddress(input.expectedWalletAddress)) throw new Error("Boundary financial session wallet does not match the controlled execution wallet.");
    if (!input.calls.length) throw new Error("Controlled execution contains no calls.");
    const result = await client.execute({
      session,
      calls: input.calls.map((call) => ({ to: call.to, data: call.data, value: BigInt(call.valueRaw) })),
      chainId: 97,
    });
    return { callsId: result.callsId, status: result.status, transactionHash: result.transactionHash };
  },

  async revokeBoundaryFinancialSession(input: { expectedWalletAddress: string; sessionPublicKey: string }): Promise<{ transactionHash?: string }> {
    const { client } = await sdk();
    if (!wallet) throw new Error("Recover the Altana BSC Testnet passkey wallet before revoking the financial session.");
    if (normalizeAddress(wallet.address) !== normalizeAddress(input.expectedWalletAddress)) throw new Error("Recovered Altana wallet does not match the financial-session wallet.");
    const result = await client.revokeSession({ wallet, signer: wallet.signer, session: input.sessionPublicKey, chainId: 97 });
    if (String(result?.status ?? "").toUpperCase() === "FAILED") throw new Error("Altana returned FAILED while revoking the BSC Testnet financial session.");
    boundaryFinancialSessions.delete(input.sessionPublicKey.toLowerCase());
    return { transactionHash: result?.transactionHash };
  },

  async revokeReadOnlyProbe(input: { expectedWalletAddress: string; sessionPublicKey: string }): Promise<{ transactionHash?: string }> {
    const { client } = await sdk();
    if (!wallet) throw new Error("Recover the Altana BSC Testnet passkey wallet before revoking the probe.");
    if (normalizeAddress(wallet.address) !== normalizeAddress(input.expectedWalletAddress)) throw new Error("Recovered Altana wallet does not match the probe wallet.");
    const result = await client.revokeSession({ wallet, signer: wallet.signer, session: input.sessionPublicKey, chainId: 97 });
    if (String(result?.status ?? "").toUpperCase() === "FAILED") throw new Error("Altana returned FAILED while revoking the BSC Testnet probe session.");
    return { transactionHash: result?.transactionHash };
  },
};
