import assert from "node:assert/strict";
import test from "node:test";
import { createX402PaymentAdapter, createB402PaymentAdapter } from "./index.js";
import type { BscChainReader } from "@spotriq/chain";
import type { CommercialHire, CommercialQuote, CommercialOfferTerms } from "@spotriq/domain";

const buyer="0x1111111111111111111111111111111111111111", payTo="0x2222222222222222222222222222222222222222", token="0x3333333333333333333333333333333333333333", hash=`0x${"ab".repeat(32)}`;
const topic=(a:string)=>`0x${"0".repeat(24)}${a.slice(2)}`;
const transferTopic="0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
function chain():BscChainReader{return {network:"testnet",definition:{network:"testnet",chainId:97,nativeSymbol:"tBNB",explorerUrl:"https://testnet.bscscan.com",defaultRpcUrls:["https://rpc1.example","https://rpc2.example"]},rpcMode:"configured",getTransactionReceipt:async()=>({network:"testnet",chainId:97,transactionHash:hash,blockNumber:"100",blockHash:`0x${"cd".repeat(32)}`,status:"SUCCESS",gasUsedRaw:"1",logs:[{address:token,topics:[transferTopic,topic(buyer),topic(payTo)],data:`0x${1000000n.toString(16).padStart(64,"0")}`,logIndex:7}]}) ,getTransaction:async()=>({network:"testnet",chainId:97,hash,blockNumber:"100",from:"0x4444444444444444444444444444444444444444",to:token,valueRaw:"0",input:"0x"}),getBlock:async()=>({network:"testnet",chainId:97,number:"100",hash:`0x${"cd".repeat(32)}`,parentHash:`0x${"ef".repeat(32)}`,timestamp:"2026-09-01T12:05:00.000Z"}),getStatus:async()=>({network:"testnet",expectedChainId:97,rpcMode:"configured",endpoints:[]}),getHealth:async()=>({name:"bsc",state:"ok",latencyMs:1}),getBlockNumber:async()=>"100",getNativeBalance:async()=>{throw new Error("unused")},getErc20Balance:async()=>{throw new Error("unused")},getWalletBalances:async()=>{throw new Error("unused")},callContract:async()=>{throw new Error("unused")},callContractFrom:async()=>{throw new Error("unused")}} as BscChainReader;}
function ctx(rail:"X402"|"B402") {const terms:CommercialOfferTerms={termsVersion:"1",commercialModel:"PER_TASK",serviceType:"TASK_SERVICE",price:{amount:"1",amountRaw:"1000000",currency:"USDT",tokenAddress:token,decimals:6},network:"BSC",chainId:97,paymentRail:rail,payment:{payToAddress:payTo,endpoint:"https://agent.example/pay"},scope:{summary:"paid read",protocols:[],financialAuthorityRequired:false,walletSigningRequired:false},availability:"AVAILABLE",quoteValiditySeconds:600};const quote={quoteId:"q",offerId:"o",serviceId:"s",buyerAddress:buyer,buyerChainId:97,state:"OPEN",termsSnapshot:terms,termsHash:"h",idempotencyKey:"q",quotedAt:"2026-09-01T12:00:00.000Z",expiresAt:"2026-09-01T12:10:00.000Z",methodVersion:"test",evidence:[],limitations:[]} as CommercialQuote;const hire={hireId:"h",quoteId:"q",offerId:"o",serviceId:"s",buyerAddress:buyer,buyerChainId:97,state:"AWAITING_PAYMENT",termsHash:"h",paymentRequired:true,permissionRequired:false,idempotencyKey:"h",acceptedAt:"2026-09-01T12:01:00.000Z",updatedAt:"2026-09-01T12:01:00.000Z",methodVersion:"test",limitations:[]} as CommercialHire;return{hire,quote,terms,reference:{transactionHash:hash},now:new Date("2026-09-01T12:06:00.000Z")};}
for(const rail of ["X402","B402"] as const)test(`${rail} verifies exact canonical ERC20 settlement`,async()=>{const adapter=rail==="X402"?createX402PaymentAdapter({chain:chain()}):createB402PaymentAdapter({chain:chain()});const p=await adapter.reconcile(ctx(rail));assert.equal(p.state,"VERIFIED");assert.equal(p.providerRef,`97:${hash}:7`);assert.equal(p.observation?.kind,"HTTP402_SETTLEMENT");});

test("X402 fails closed when transaction and receipt block evidence disagree",async()=>{
  const base=chain();
  const bad={...base,getTransaction:async()=>({...await base.getTransaction(hash)!,blockNumber:"101"})} as BscChainReader;
  await assert.rejects(()=>createX402PaymentAdapter({chain:bad}).reconcile(ctx("X402")),/block evidence do not reconcile/i);
});

test("X402 does not verify a transfer without a concrete log index",async()=>{
  const base=chain();
  const receipt=await base.getTransactionReceipt(hash);
  const bad={...base,getTransactionReceipt:async()=>receipt?({...receipt,logs:receipt.logs?.map(({logIndex:_omit,...log})=>log)}):null} as BscChainReader;
  const evidence=await createX402PaymentAdapter({chain:bad}).reconcile(ctx("X402"));
  assert.equal(evidence.state,"MISMATCH");
  assert.match(evidence.limitations.join(" "),/transferLogIndexPresent=false/);
});

test("X402 rejects settlement timestamps implausibly ahead of observation time",async()=>{
  const base=chain();
  const bad={...base,getBlock:async()=>({...await base.getBlock("100"),timestamp:"2026-09-01T13:00:00.000Z"})} as BscChainReader;
  const evidence=await createX402PaymentAdapter({chain:bad}).reconcile(ctx("X402"));
  assert.equal(evidence.state,"MISMATCH");
  assert.equal(evidence.observation?.kind==="HTTP402_SETTLEMENT"&&evidence.observation.timingSatisfied,false);
});
