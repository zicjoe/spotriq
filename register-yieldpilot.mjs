import { EVMWalletProvider } from "@bnbagent/sdk";
import { AgentEndpoint, ERC8004Agent } from "@bnbagent/sdk/erc8004";

const password = process.env.WALLET_PASSWORD;

if (!password) {
  throw new Error("WALLET_PASSWORD is missing.");
}

const wallet = new EVMWalletProvider({
  password,
});

const sdk = await ERC8004Agent.create({
  walletProvider: wallet,
  network: "bsc-testnet",
});

const agentUri = sdk.generateAgentUri({
  name: "YieldPilot",
  description:
    "First-party Spotriq reference service for deterministic BSC yield opportunity analysis using supported protocol data, without fabricating realised yield or autonomous wallet authority.",
  endpoints: [
    new AgentEndpoint({
      name: "A2A",
      endpoint:
        "https://spotriq-production.up.railway.app/v1/reference-agents/yieldpilot/.well-known/agent-card.json",
    }),
  ],
});

const result = await sdk.registerAgent(agentUri);

console.log("YieldPilot ERC-8004 registration complete");
console.log("Owner:", wallet.address);
console.log("Agent ID:", result.agentId);
console.log("Transaction:", result.transactionHash);
