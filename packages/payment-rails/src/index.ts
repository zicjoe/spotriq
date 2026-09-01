import { encodeFunctionData, decodeFunctionResult } from "viem";
import type { BscChainReader } from "@spotriq/chain";
import { CommercialError, type CommercialPaymentAdapter, type PaymentReconciliationContext } from "@spotriq/commercial";
import type { CommercialPaymentEvidence, CommercialPaymentRail, Http402SettlementObservation, PaymentRailStatus } from "@spotriq/domain";
import { createEvidenceEnvelope, DATA_SOURCES, EVIDENCE_METHODS } from "@spotriq/evidence";

export const PAYMENT_RAILS_METHOD = "marketplace.payment-rails@1.0.0";
const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ERC8183_BY_CHAIN: Record<56|97,string> = {
  56: "0xea4daa3100a767e86fded867729ae7446476eba6",
  97: "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de",
};
const PAYMENT_TOKEN_ABI=[{type:"function",name:"paymentToken",stateMutability:"view",inputs:[],outputs:[{name:"",type:"address"}]}] as const;

function address(v:string,label:string):string{const x=v.trim().toLowerCase();if(!/^0x[0-9a-f]{40}$/.test(x))throw new CommercialError(`${label} must be a valid EVM address.`,"PAYMENT_MISMATCH");return x;}
function txHash(v:string|undefined):string{const x=(v??"").trim().toLowerCase();if(!/^0x[0-9a-f]{64}$/.test(x))throw new CommercialError("transactionHash is required and must be a 32-byte EVM transaction hash.","INVALID_INPUT");return x;}
function rawAmount(ctx:PaymentReconciliationContext):bigint{const value=ctx.terms.price.amountRaw;if(!value||!/^\d+$/.test(value)||BigInt(value)<=0n)throw new CommercialError("Paid x402/B402 Offer must pin price.amountRaw to a positive integer.","PAYMENT_MISMATCH");return BigInt(value);}
function topicAddress(topic:string):string{return `0x${topic.slice(-40)}`.toLowerCase();}
function transferValue(data:string):bigint{if(!/^0x[0-9a-fA-F]{64}$/.test(data))return -1n;return BigInt(data);}
function paymentEvidenceId(rail:string,hireId:string,hash:string):string{return `payment:${rail.toLowerCase()}:${hireId}:${hash.slice(2,18)}`;}

function createHttp402Adapter(rail:"X402"|"B402",chain:BscChainReader):CommercialPaymentAdapter{
  return {rail,async reconcile(ctx){
    if(ctx.terms.chainId!==chain.definition.chainId)throw new CommercialError(`${rail} Quote chain ${ctx.terms.chainId} does not match configured BSC chain ${chain.definition.chainId}.`,"NETWORK_MISMATCH");
    const hash=txHash(ctx.reference.transactionHash);
    const token=address(ctx.terms.price.tokenAddress??"","price.tokenAddress");
    const payTo=address(ctx.terms.payment?.payToAddress??ctx.terms.payment?.providerAddress??"","payment.payToAddress");
    const expected=rawAmount(ctx);
    const [receipt,tx]=await Promise.all([chain.getTransactionReceipt(hash),chain.getTransaction(hash)]);
    if(!receipt||!tx)throw new CommercialError(`${rail} settlement transaction is not currently observable on BSC.`,"ONCHAIN_OBSERVATION_FAILED",true);
    const block=await chain.getBlock(receipt.blockNumber);
    const transfer=(receipt.logs??[]).find(log=>log.address===token&&log.topics[0]?.toLowerCase()===TRANSFER_TOPIC&&log.topics.length>=3&&topicAddress(log.topics[1])===ctx.hire.buyerAddress&&topicAddress(log.topics[2])===payTo&&transferValue(log.data)===expected);
    const success=receipt.status==="SUCCESS";
    const timingOk=Date.parse(block.timestamp)>=Date.parse(ctx.hire.acceptedAt);
    const matched=Boolean(success&&timingOk&&transfer);
    const observation:Http402SettlementObservation={kind:"HTTP402_SETTLEMENT",rail,chainId:ctx.terms.chainId,transactionHash:hash,transactionFrom:tx.from,tokenAddress:token,payerAddress:ctx.hire.buyerAddress,payToAddress:payTo,amountRaw:expected.toString(),receiptStatus:receipt.status,blockNumber:receipt.blockNumber,blockTimestamp:block.timestamp,transferMatched:Boolean(transfer),transferLogIndex:transfer?.logIndex,timingSatisfied:timingOk,endpoint:ctx.terms.payment?.endpoint};
    const evidence=createEvidenceEnvelope({subjectType:"commercial_payment",subjectId:ctx.hire.hireId,metric:`commercial.payment.${rail.toLowerCase()}`,value:matched?"VERIFIED":"MISMATCH",provenance:"marketplace-observed",source:DATA_SOURCES.BSC_RPC,sourceRef:hash,observedAt:ctx.now.toISOString(),confidence:"high",method:rail==="X402"?EVIDENCE_METHODS.X402_PAYMENT:EVIDENCE_METHODS.B402_PAYMENT,methodInputs:[ctx.quote.quoteId,hash,token,payTo,expected.toString()],limitation:`Spotriq reconciles ${rail} from canonical BSC settlement logs. It does not trust a browser paid flag and does not sign or dispatch the payment.`});
    return {paymentEvidenceId:paymentEvidenceId(rail,ctx.hire.hireId,hash),hireId:ctx.hire.hireId,serviceId:ctx.hire.serviceId,buyerAddress:ctx.hire.buyerAddress,requirement:"REQUIRED",state:matched?"VERIFIED":"MISMATCH",rail,chainId:ctx.terms.chainId,amount:ctx.terms.price.amount,currency:ctx.terms.price.currency,tokenAddress:token,providerRef:`${ctx.terms.chainId}:${hash}:${transfer?.logIndex??"unknown"}`,observation,observedAt:ctx.now.toISOString(),methodVersion:PAYMENT_RAILS_METHOD,provenance:"marketplace-observed",evidence:[evidence],limitations:matched?[]:[`Settlement mismatch: receiptSuccess=${success}, transferMatched=${Boolean(transfer)}, timingSatisfied=${timingOk}.`] } satisfies CommercialPaymentEvidence;
  }};
}

export function createX402PaymentAdapter(options:{chain:BscChainReader}):CommercialPaymentAdapter{return createHttp402Adapter("X402",options.chain);}
export function createB402PaymentAdapter(options:{chain:BscChainReader}):CommercialPaymentAdapter{return createHttp402Adapter("B402",options.chain);}

export async function readPaymentRailsStatus(chain:BscChainReader):Promise<{chainId:number;network:string;settlementDispatchEnabled:false;rails:PaymentRailStatus[];checkedAt:string;limitations:string[]}>{
  const chainId=chain.definition.chainId;
  let erc8183:PaymentRailStatus={rail:"ERC8183",reconciliationMode:"ONCHAIN_JOB_ESCROW",state:"DEGRADED",settlementDispatchEnabled:false,requirements:["Quote payment.contractAddress","Quote payment.providerAddress","ERC-8183 jobId"],limitations:["ERC-8183 is observed/reconciled; Spotriq does not fund or settle jobs in this milestone."]};
  if(chainId===56||chainId===97){const contractAddress=ERC8183_BY_CHAIN[chainId];try{const call=await chain.callContract(contractAddress,encodeFunctionData({abi:PAYMENT_TOKEN_ABI,functionName:"paymentToken"}));const paymentToken=String(decodeFunctionResult({abi:PAYMENT_TOKEN_ABI,functionName:"paymentToken",data:call.data as `0x${string}`})).toLowerCase();erc8183={...erc8183,state:"AVAILABLE",contractAddress,paymentTokenAddress:paymentToken,observedBlockNumber:call.blockNumber};}catch(e){erc8183={...erc8183,contractAddress,limitations:[...erc8183.limitations,`Canonical contract probe failed: ${e instanceof Error?e.message:String(e)}`]};}}
  const receipt=(rail:"X402"|"B402"):PaymentRailStatus=>({rail,reconciliationMode:"ONCHAIN_ERC20_SETTLEMENT",state:"AVAILABLE",settlementDispatchEnabled:false,requirements:["Quote price.tokenAddress + amountRaw","Quote payment.payToAddress","BSC transactionHash"],limitations:[`${rail} settlement is reconciled from canonical ERC-20 Transfer evidence. Facilitator/browser claims alone are not accepted.`,`Spotriq does not create payment signatures or broadcast ${rail} settlement transactions in v0.31.`]});
  return{chainId,network:chain.network,settlementDispatchEnabled:false,rails:[erc8183,receipt("X402"),receipt("B402")],checkedAt:new Date().toISOString(),limitations:["Payment evidence remains separate from PermissionGrant, Activation, execution and outcome.","BSC Mainnet financial/payment dispatch remains disabled unless explicitly approved."]};
}
