import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
import {signedEvent} from "@/modules/recharge-bridge/webhook";

const memory=vi.hoisted(()=>({
 rows:new Map<string,Record<string,unknown>>(),
 findUnique:vi.fn(async({where}:{where:{eventId:string}})=>
   memory.rows.get(where.eventId)??null),
 create:vi.fn(async({data}:{data:Record<string,unknown>})=>{
   const eventId=String(data.eventId);
   if(memory.rows.has(eventId))throw new Error("UNIQUE");
   memory.rows.set(eventId,data);return data;
 }),
}));
vi.mock("@/server/db",()=>({
 db:{rechargeWebhookInbox:{findUnique:memory.findUnique,create:memory.create}},
}));
const secret="sandbox-only-hmac-secret-32-bytes-minimum-012345";
const mapping=[
 {tenantId:"mobi-demo-A",branchId:"mobi-branch-A",merchantId:"merchant-A",rechargeBranchId:"branch-A",token:"sandbox-token-A-123"},
 {tenantId:"mobi-demo-B",branchId:"mobi-branch-B",merchantId:"merchant-B",rechargeBranchId:"branch-B",token:"sandbox-token-B-123"},
];
const keys=["A1_MOBI_RECHARGE_ADAPTER_ENABLED","A1_RECHARGE_SANDBOX_ONLY",
 "A1_MOBI_RECHARGE_WEBHOOK_HMAC_SECRET","A1_RECHARGE_API_BASE_URL",
 "A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON","A1_MOBI_RECHARGE_REAL_MONEY_ENABLED"] as const;
const previous=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
beforeEach(()=>{
 memory.rows.clear();memory.findUnique.mockClear();memory.create.mockClear();
 Object.assign(process.env,{
  A1_MOBI_RECHARGE_ADAPTER_ENABLED:"true",A1_RECHARGE_SANDBOX_ONLY:"true",
  A1_MOBI_RECHARGE_WEBHOOK_HMAC_SECRET:secret,A1_RECHARGE_API_BASE_URL:"http://127.0.0.1:45000/",
  A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON:JSON.stringify(mapping),
 });
 delete process.env.A1_MOBI_RECHARGE_REAL_MONEY_ENABLED;
});
afterEach(()=>{for(const k of keys){const value=previous[k];if(value===undefined)delete process.env[k];else process.env[k]=value;}});
const timestamp=1795000000000;
const event={eventId:"evt-test-0001",type:"recharge.order.v1",
 merchantId:"merchant-A",branchId:"branch-A",rechargeOrderId:"recharge-order-A",
 externalRef:"mobi-synthetic-A",version:1,state:"PENDING",
 occurredAt:new Date(timestamp).toISOString()};
function makeRequest(payload:object=event,sigOverride?:string){
 const raw=JSON.stringify(payload);
 const eventId=(payload as {eventId?:string}).eventId??event.eventId;
 return new Request("http://localhost/api/ops/recharge-webhook",{
  method:"POST",headers:{"Content-Type":"application/json",
   "x-a1-event-id":eventId,"x-a1-event-timestamp":String(timestamp),
   "x-a1-event-signature":sigOverride??signedEvent(secret,timestamp,eventId,raw)},
  body:raw,
 });
}
describe("G5 v0.2 Mobi signed webhook capture-only route",()=>{
 it("rejects every event when disabled",async()=>{
  process.env.A1_MOBI_RECHARGE_ADAPTER_ENABLED="false";
  const {POST}=await import("@/app/api/ops/recharge-webhook/route");
  expect((await POST(makeRequest())).status).toBe(404);
  expect(memory.create).not.toHaveBeenCalled();
 });
 it("persists signed event before 202, then acknowledges exact replay without new row",async()=>{
  const {POST}=await import("@/app/api/ops/recharge-webhook/route");
  const first=await POST(makeRequest());
  expect(first.status).toBe(202);
  expect(await first.json()).toMatchObject({accepted:true,outcome:"INSERTED",financePosted:false});
  expect(memory.rows.size).toBe(1);
  const replay=await POST(makeRequest());
  expect(replay.status).toBe(200);
  expect(await replay.json()).toMatchObject({outcome:"DUPLICATE",financePosted:false});
  expect(memory.create).toHaveBeenCalledTimes(1);
 });
 it("rejects forged signature and cross-merchant/cross-branch claims",async()=>{
  const {POST}=await import("@/app/api/ops/recharge-webhook/route");
  expect((await POST(makeRequest(event,"0".repeat(64)))).status).toBe(401);
  expect((await POST(makeRequest({...event,merchantId:"merchant-X"}))).status).toBe(403);
  expect((await POST(makeRequest({...event,branchId:"branch-B"}))).status).toBe(403);
  expect(memory.create).not.toHaveBeenCalled();
 });
 it("does not return success when durable persistence is unavailable",async()=>{
  const {POST}=await import("@/app/api/ops/recharge-webhook/route");
  memory.create.mockRejectedValueOnce(new Error("DB_DOWN"));
  const response=await POST(makeRequest());
  expect(response.status).toBe(503);
  expect(memory.rows.size).toBe(0);
 });
});
