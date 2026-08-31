import test from "node:test";
import assert from "node:assert/strict";
import type { RebalancingJobIntent, ServiceTask } from "@spotriq/domain";
import { registerServiceTaskRoutes } from "./service-tasks.js";

class FakeApp {
  handlers = new Map<string, (request: any, reply: any) => Promise<any>>();
  post(path: string, handler: any): void { this.handlers.set(`POST ${path}`, handler); }
  get(path: string, handler: any): void { this.handlers.set(`GET ${path}`, handler); }
}
function replyRecorder() { return { statusCode: 200, payload: undefined as any, code(value:number){this.statusCode=value;return this;}, send(value:any){this.payload=value;return value;} }; }

const job = { jobIntentId:"job-1", findingId:"finding-1", selectedService:{serviceId:"service-1",agentId:"agent-1"} } as unknown as RebalancingJobIntent;
const task = { serviceTaskId:"service-task-1", jobIntentId:"job-1", findingId:"finding-1", serviceId:"service-1", agentId:"agent-1", state:"COMPLETED", originProof:{state:"VERIFIED"}, proposalState:"STRUCTURED" } as unknown as ServiceTask;

test("service-task invocation is server-authoritative and ignores browser-fabricated runtime/proposal/origin fields", async () => {
  const app = new FakeApp();
  let invokedWith: RebalancingJobIntent | undefined;
  let linkedWith: ServiceTask | undefined;
  const tasks = {
    invoke: async (value: RebalancingJobIntent) => { invokedWith = value; return task; },
  };
  const jobs = {
    get: async (id: string) => { assert.equal(id,"job-1"); return job; },
    linkServiceTask: async (_id: string, value: ServiceTask) => { linkedWith=value; return { ...job, serviceTask:{serviceTaskId:value.serviceTaskId} } as unknown as RebalancingJobIntent; },
  };
  const commercial = {
    assertActivationForService: async () => { throw new Error("commercial activation should not be queried when activationId is omitted"); },
  };
  await registerServiceTaskRoutes(app as any, tasks as any, jobs as any, commercial as any);
  const handler=app.handlers.get("POST /v1/job-intents/:jobIntentId/service-tasks");
  assert.ok(handler);
  const reply=replyRecorder();
  const maliciousBody={runtimeEndpoint:"https://attacker.example/a2a",proposal:{targetTickLower:-999,targetTickUpper:999},originProof:{state:"VERIFIED"},remoteTaskId:"browser-made-it-up",financialSigner:"0xdeadbeef"};
  await handler!({id:"req-task",params:{jobIntentId:"job-1"},body:maliciousBody},reply);
  assert.equal(reply.statusCode,201);
  assert.equal(invokedWith,job);
  assert.equal(linkedWith,task);
  assert.equal(reply.payload.data.task,task);
  assert.notEqual((invokedWith as any)?.runtimeEndpoint,maliciousBody.runtimeEndpoint);
  assert.notEqual((linkedWith as any)?.remoteTaskId,maliciousBody.remoteTaskId);
});
