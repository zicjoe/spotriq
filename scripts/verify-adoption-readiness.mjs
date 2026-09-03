import process from "node:process";

const base=(process.env.SPOTRIQ_ACCEPTANCE_BASE_URL||process.env.PUBLIC_API_BASE_URL||"https://spotriq-production.up.railway.app").replace(/\/$/,"");
async function request(path){const response=await fetch(`${base}${path}`,{headers:{accept:"application/json"}});const body=await response.json().catch(()=>undefined);return{response,body};}
function versionAtLeast(actual,minimum){const parse=value=>{const match=String(value??"").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);return match?match.slice(1,4).map(Number):null;};const a=parse(actual),m=parse(minimum);if(!a||!m)return false;for(let i=0;i<3;i++){if(a[i]>m[i])return true;if(a[i]<m[i])return false;}return true;}

const health=await request("/health");
if(![200,503].includes(health.response.status)||health.body?.service!=="spotriq-api"||!versionAtLeast(health.body?.version,"0.38.0"))throw new Error(`v0.38 adoption acceptance requires deployed Spotriq >=0.38.0; live /health reports ${JSON.stringify(health.body)}.`);

const adoption=await request("/v1/public/adoption");
if(!adoption.response.ok)throw new Error(`/v1/public/adoption returned HTTP ${adoption.response.status}: ${JSON.stringify(adoption.body)}`);
const manifest=adoption.body?.data;
if(manifest?.schemaVersion!=="spotriq.public-adoption@1.0.0"||!versionAtLeast(manifest?.release?.version,"0.38.0")||!versionAtLeast(manifest?.release?.acceptedThrough,"0.37.0"))throw new Error("Public adoption manifest no longer preserves the accepted v0.38 release floor.");
if(manifest?.product?.descriptor!=="BSC financial-agent marketplace"||!Array.isArray(manifest?.product?.categories)||manifest.product.categories.length!==4)throw new Error("Public adoption manifest lost the Spotriq product/four-category contract.");
if(manifest?.networks?.discovery?.chainId!==56||manifest?.networks?.transactionalDevelopment?.chainId!==97||manifest?.networks?.bscMainnetFinancialExecutionApproved!==false)throw new Error("Public adoption manifest must preserve BSC Mainnet discovery vs BSC Testnet transactional policy and keep mainnet financial execution unapproved.");
const codes=new Set((manifest?.integrations??[]).map(item=>item?.code));
for(const code of ["BSC","ERC8004","BNB_AGENT_STUDIO","ERC8183","X402_B402","PANCAKESWAP","VENUS"])if(!codes.has(code))throw new Error(`Public adoption manifest is missing integration ${code}.`);
for(const boundary of ["Permission ≠ Activation ≠ Execution","Evidence ≠ AI explanation","AI explains. Deterministic systems decide."])if(!manifest?.truthBoundaries?.includes(boundary))throw new Error(`Public adoption manifest is missing truth boundary: ${boundary}`);
if(manifest?.readiness?.mainnetFinancialExecutionApproved!==false||manifest?.readiness?.publicDocsComplete!==true||manifest?.readiness?.liveAcceptanceVerifierIncluded!==true||manifest?.readiness?.evidenceCaptureScriptIncluded!==true)throw new Error("Public launch readiness flags are incomplete or incorrectly approve mainnet financial execution.");

const capsResult=await request("/v1/system/capabilities");
if(!capsResult.response.ok)throw new Error(`/v1/system/capabilities returned HTTP ${capsResult.response.status}.`);
const caps=capsResult.body?.data;
for(const key of ["publicAdoptionManifestEnabled","publicLaunchDocumentationEnabled","publicEvidenceCaptureEnabled"])if(caps?.[key]!==true)throw new Error(`v0.38 capability ${key} must be true.`);
if(caps?.bscMainnetFinancialExecutionApproved!==false||caps?.paymentSettlementDispatchEnabled!==false||caps?.categoryExecutionDispatchEnabled!==false||caps?.workerFinancialJobDispatchEnabled!==false)throw new Error("v0.38 public launch readiness must not enable mainnet/payment/category/worker financial dispatch.");

const refs=await request("/v1/reference-agents");
if(!refs.response.ok||!Array.isArray(refs.body?.data?.agents)||refs.body.data.agents.length<4)throw new Error("Public launch proof must expose all four first-party reference AgentServices.");
const categories=new Set(refs.body.data.agents.map(agent=>String(agent?.category)));
for(const category of ["rebalancing","grid","yield","health"])if(!categories.has(category))throw new Error(`Reference-agent public proof is missing category ${category}.`);

const serialized=JSON.stringify(manifest);
if(/private[_-]?key|wallet[_-]?password|api[_-]?key\s*[:=]/i.test(serialized))throw new Error("Public adoption manifest contains secret-shaped material.");

console.log(`PASS public adoption manifest: version=${manifest.release.version}; acceptedThrough=${manifest.release.acceptedThrough}; integrations=${[...codes].join(",")}.`);
console.log("PASS launch boundary: BSC Mainnet discovery=56; transactional development=BSC Testnet/97; mainnet financial execution remains unapproved; four reference categories are publicly provable.");
console.log("PASS: Spotriq v0.38 Ecosystem Adoption + Judge/Public Launch Readiness contract passed: public docs/proof surfaces are machine-readable and evidence-oriented without collapsing identity, readiness, payment, permission, execution or outcome boundaries.");
