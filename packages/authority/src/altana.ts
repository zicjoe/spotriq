import type { BscChainReader } from "@spotriq/chain";
import { decodeFunctionResult, encodeFunctionData, keccak256, type Hex } from "viem";
import type { AltanaKeystoreVerifier } from "./index.js";

export const ALTANA_KEYSTORE_BY_NETWORK = {
  mainnet: "0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a",
  testnet: "0x6b8361C29d05D498b1a12B54A37310f94171E94A",
} as const;

const KEYSTORE_ABI = [{
  name: "isValidKey",
  type: "function",
  stateMutability: "view",
  inputs: [
    { name: "user", type: "address" },
    { name: "keyId", type: "bytes32" },
  ],
  outputs: [{ type: "bool" }],
}] as const;

export function createAltanaKeystoreVerifier(readers: Record<"mainnet" | "testnet", BscChainReader>): AltanaKeystoreVerifier {
  return {
    async verify({ walletAddress, sessionPublicKey, network }) {
      const reader = readers[network];
      if (!reader || reader.network !== network) throw new Error(`No BSC ${network} reader is configured for Altana authority verification.`);
      const publicKey = sessionPublicKey as Hex;
      const keyId = keccak256(publicKey);
      const keystoreAddress = ALTANA_KEYSTORE_BY_NETWORK[network];
      const data = encodeFunctionData({ abi: KEYSTORE_ABI, functionName: "isValidKey", args: [walletAddress as `0x${string}`, keyId] });
      const response = await reader.callContract(keystoreAddress, data);
      const valid = decodeFunctionResult({ abi: KEYSTORE_ABI, functionName: "isValidKey", data: response.data as Hex });
      return { keyId, keystoreAddress, valid: Boolean(valid), blockNumber: response.blockNumber };
    },
  };
}
