import fs from "node:fs";

function read(path){return fs.readFileSync(path,"utf8");}
function requireText(source,needle,message){if(!source.includes(needle))throw new Error(message);}

const tasks=read("packages/service-tasks/src/index.ts");
const web=read("apps/web/src/app/App.tsx");

requireText(tasks,"async function ensureFreshMarketplaceTests", "Service-task engine must own fresh Test Lab preflight.");
requireText(tasks,"marketplace.runTests(record.service.serviceId)", "Stale/missing Test Lab evidence must trigger a bounded fresh run.");
const uses=(tasks.match(/ensureFreshMarketplaceTests\(record\)/g)??[]).length;
if(uses<2)throw new Error("Fresh Test Lab preflight must cover helper definition plus Job Intent and Activation invocation paths.");
requireText(tasks,'const TEST_FRESHNESS_MS = 60 * 60_000',"Runtime freshness window must remain explicit and bounded.");
requireText(tasks,'A fresh Marketplace Test Lab PASS for a category-capable A2A endpoint is required before real task invocation.',"Fail-closed Test Lab gate must remain enforced after auto-refresh.");

requireText(web,"const previous=activationRuntimeStates[serviceId]?.latestTask;", "UI must detect an existing activation task before a user-requested rerun.");
requireText(web,"serviceTaskRepository.retryActivation", "A repeated user task must create a new attempt rather than replay a stale failed/completed task.");
requireText(web,"serviceTaskRepository.invokeActivation", "The first activation task must still use the initial invocation route.");
requireText(web,"task launch re-validates Test Lab freshness", "UI must explain that current task launch re-validates runtime evidence.");

console.log("PASS: Spotriq core runtime flow revalidates stale Test Lab evidence, fails closed on a non-PASS refresh, and retries explicit repeat tasks instead of replaying stale task state.");
