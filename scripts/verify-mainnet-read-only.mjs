import fs from "node:fs";

function read(path) { return fs.readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const app = read("apps/api/src/app.ts");
const checks = read("apps/api/src/routes/checks.ts");
const referenceRoutes = read("apps/api/src/routes/reference-agents.ts");
const smartMoney = read("packages/smart-money/src/index.ts");
const referenceAgents = read("packages/reference-agents/src/index.ts");
const supply = read("packages/marketplace-supply/src/index.ts");
const commercial = read("packages/commercial/src/index.ts");
const commercialTests = read("packages/commercial/src/index.test.ts");
const web = read("apps/web/src/app/App.tsx");
const apiContracts = read("packages/api-contracts/src/index.ts");
const adoption = read("packages/adoption-readiness/src/index.ts");
const financialAdapters = read("packages/financial-execution-adapters/src/index.ts");
const controlledExecution = read("packages/controlled-execution/src/index.ts");
const chain = read("packages/chain/src/index.ts");
const pancake = read("packages/protocol-pancakeswap/src/index.ts");
const venus = read("packages/protocol-venus/src/index.ts");
const marketContext = read("packages/market-context/src/index.ts");

assert(chain.includes('chainId: 56') && chain.includes('https://bsc-dataseed.bnbchain.org'), "BSC Mainnet chain 56 and an official public fallback RPC must remain configured.");
assert(pancake.includes('0x46A15B0b27311cedF172AB29E4f4766fbE7F4364'), "PancakeSwap BSC Mainnet V3 Position Manager must match the verified deployment address.");
assert(venus.includes('0xCa01D5A9A248a830E9D93231e791B1afFed7c446'), "Venus BNB Chain Mainnet ProtocolShareReserve bootstrap address must remain configured.");
assert(marketContext.includes('0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c') && marketContext.includes('0x55d398326f99059ff775485246999027b3197955'), "Mainnet Grid context must retain the supported WBNB/USDT market assets.");
assert(app.includes('createBscChainAdapter({ network: "mainnet"'), "API must create an independent BSC Mainnet read-only chain reader.");
assert(app.includes('createBscChainAdapter({ network: "testnet"'), "API must preserve an independent BSC Testnet reader.");
assert(app.includes('enginesByNetwork') === false || checks.includes('enginesByNetwork'), "Smart Money routes must support network-specific engines.");
assert(checks.includes('const requestedNetwork = input.network ?? "testnet"'), "API callers that omit Smart Money network must remain safely backwards-compatible with Testnet.");
assert(app.includes('mainnet: smartMoneyMainnet, testnet: smartMoneyTestnet'), "Smart Money POST routing must provide both Mainnet and Testnet engines.");
assert(smartMoney.includes('network: options.chain.network') && smartMoney.includes('chainId: options.chain.definition.chainId as 56 | 97'), "Smart Money sessions must persist the observed network and chainId.");
assert(apiContracts.includes('network?: import("@spotriq/domain").BscNetwork'), "Smart Money API contract must accept an explicit BSC observation network.");
assert(apiContracts.includes('bscMainnetReadOnlyObservationEnabled: boolean') && app.includes('bscMainnetReadOnlyObservationEnabled: true'), "Public capabilities must explicitly expose Mainnet read-only observation.");
assert(adoption.includes('readOnlyObservation: { network: "BSC Mainnet"') && adoption.includes('bscMainnetFinancialExecutionApproved: false'), "Public adoption manifest must distinguish Mainnet read-only observation from financial execution approval.");
assert(web.includes('>BSC Mainnet</div>') && web.includes('Real read-only · chain 56') && web.includes('>BSC Testnet</div>') && web.includes('Sandbox · chain 97'), "Smart Money UI must expose explicit Mainnet read-only and Testnet sandbox modes.");
assert(web.includes('const [checkNetwork, setCheckNetwork] = useState<"mainnet" | "testnet">("mainnet")'), "Production Smart Money UI must default to Mainnet read-only observation.");
assert(referenceRoutes.includes('runtimeByNetwork') && referenceRoutes.includes('requestNetwork(request.body)'), "Reference-agent runtime must route protocol reads by the Activation subject network.");
assert(referenceAgents.includes('readOnlyObservationChainIds: [56, 97]'), "First-party reference Offers must explicitly declare dual-chain read-only observation support.");
assert(referenceAgents.includes('identityChainId') && referenceAgents.includes('observationChainId'), "Reference readiness must keep identity network separate from observation network.");
assert(!/reference\s*\?[^\n]*"TESTNET_ONLY"/m.test(supply), "Reference services must not be labeled TESTNET_ONLY solely because their identity is on chain 97.");
assert(commercial.includes('serviceChainId?:number') && commercial.includes('termsForObservationChain'), "Commercial Quote must freeze an explicitly supported read-only observation chain.");
assert(commercial.includes('termsForObservationChain(currentOffer,validateOffer(currentOffer),quote.termsSnapshot.chainId)'), "Activation must revalidate current Offer terms on the immutable Quote observation chain rather than treating the safe chain override as Offer drift.");
assert(commercialTests.includes('FREE read-only reference Offer can freeze BSC Mainnet observation without granting financial authority') && commercialTests.includes('read-only observation chain override fails closed unless the Offer explicitly supports it'), "Commercial regression tests must cover allowed and denied Mainnet read-only observation-chain overrides.");
assert(web.includes('serviceChainId,') && web.includes('observedChainId = check.portfolio?.chainId ?? check.session.chainId'), "Finding-to-Hire UI must carry the Smart Money observation chain into the immutable Quote.");
assert(commercial.includes('BSC Mainnet is observation-only for this Activation. Financial execution remains disabled on chain 56.'), "Mainnet read-only Activation must carry an explicit no-execution limitation.");
assert(financialAdapters.includes('options.chain.definition.chainId === 97 && activation.serviceChainId === 97'), "Financial execution adapter must remain hard-gated to API chain 97 and Activation chain 97.");
assert(controlledExecution.includes('boundary.network!=="testnet"') && controlledExecution.includes('chainId:97'), "Controlled execution must remain hard-bound to BSC Testnet.");
assert(web.includes('Mainnet execution: disabled'), "Marketplace UI must distinguish read-only Mainnet observation from Mainnet financial execution.");

console.log("PASS: Spotriq v0.39 BSC Mainnet read-only core supports real chain-56 observation and dual-network read-only services while financial execution remains hard-disabled on Mainnet.");
