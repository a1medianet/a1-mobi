import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { bootstrapStore } from "@/server/bootstrap-service";

type Context={actorId:string;tenantId:string;branchId:string;permissions:Set<string>};
let active:Context|null=null;
vi.mock("@/server/auth-http",async getOriginal=>{
 const original=await getOriginal<typeof import("@/server/auth-http")>();
 return {...original,currentStoreContext:async (permission?:string)=>{
  if(!active)throw new Error("AUTH_REQUIRED");
  if(permission&&!active.permissions.has(permission))throw new Error("PERMISSION_DENIED");
  return active;
 }};
});
const runDb=process.env.DATABASE_URL?describe:describe.skip;
runDb("C-LIVE-02 repair HTTP route / PostgreSQL",()=>{
 let route:typeof import("@/app/api/ops/live-02/route");
 let a:Context,b:Context;let repairId:string;
 const prev=process.env.A1_MOBI_C_LIVE_02_ENABLED;
 const base=process.env.APP_ORIGIN||"http://127.0.0.1:3195";
 const post=(body:unknown,origin=base)=>route.POST(new Request(base+"/api/ops/live-02",{
  method:"POST",headers:{"content-type":"application/json",origin},body:JSON.stringify(body),
 }));
 beforeAll(async()=>{
  process.env.A1_MOBI_C_LIVE_02_ENABLED="1";
  const id=randomUUID().slice(0,10);
  const x=await bootstrapStore({tenantSlug:"repair-ui-a-"+id,tenantName:"Repair A",branchCode:"MAIN",
   branchName:"Main",ownerEmail:"owner-a-"+id+"@example.test",ownerDisplayName:"Owner A",
   ownerPassword:"Repair-Owner-Test-Password-"+id,locale:"ar"});
  const y=await bootstrapStore({tenantSlug:"repair-ui-b-"+id,tenantName:"Repair B",branchCode:"MAIN",
   branchName:"Main",ownerEmail:"owner-b-"+id+"@example.test",ownerDisplayName:"Owner B",
   ownerPassword:"Repair-Owner-Test-Password-"+id,locale:"ar"});
  a={actorId:x.ownerId,tenantId:x.tenantId,branchId:x.branchId,permissions:new Set(["repair.manage","cash.manage"])};
  b={actorId:y.ownerId,tenantId:y.tenantId,branchId:y.branchId,permissions:new Set(["repair.manage","cash.manage"])};
  route=await import("@/app/api/ops/live-02/route");
 },90000);
 afterAll(()=>{
  active=null;if(prev===undefined)delete process.env.A1_MOBI_C_LIVE_02_ENABLED;
  else process.env.A1_MOBI_C_LIVE_02_ENABLED=prev;
 });
 it("intake → diagnosis/estimate → approval → in progress → ready, persisted timeline",async()=>{
  active=a;
  const created=await post({action:"intake",customerName:"Demo Test Customer",
   customerPhone:"+961 70 765 432",deviceDescription:"Test Samsung Phone",
   condition:"Scratched screen",reportedIssue:"Display damaged",
   imei:"356938035643809",accessories:["Case"]});
  expect(created.status).toBe(201);
  const intake=await created.json();
  expect(intake.status).toBe("INTAKE");repairId=intake.id;
  const estimate=await post({action:"estimate",repairId,diagnosis:"Broken display",estimateAmount:120});
  expect(estimate.status).toBe(200);expect((await estimate.json()).status).toBe("ESTIMATE_PENDING");
  const approved=await post({action:"approve",repairId});
  expect(approved.status).toBe(200);
  const started=await post({action:"start",repairId});
  expect((await started.json()).status).toBe("IN_PROGRESS");
  const ready=await post({action:"ready",repairId,finalPrice:120,laborCost:20,directCost:5});
  expect(ready.status).toBe(200);
  expect((await ready.json()).status).toBe("READY");
  const get=await (await route.GET()).json();
  expect(get.totalOrders).toBeGreaterThanOrEqual(get.orders.length);
  const record=get.orders.find((o:{id:string})=>o.id===repairId);
  expect(record.status).toBe("READY");
  expect(record.balanceDue).toBe(120);
  expect(record.timeline.map((x:{status:string})=>x.status)).toEqual([
   "INTAKE","DIAGNOSIS","ESTIMATE_PENDING","APPROVED","IN_PROGRESS","READY"
  ]);
  const persisted=await db.repairOrder.findFirstOrThrow({where:{id:repairId,tenantId:a.tenantId,branchId:a.branchId}});
  expect(persisted.technicianId).toBe(a.actorId);
  expect(Number(persisted.finalPrice)).toBe(120);
  expect((await db.auditEvent.count({where:{tenantId:a.tenantId,entityId:repairId}}))).toBeGreaterThanOrEqual(3);
 },90000);

 it("does not deliver unpaid repair or take cash without open till; records payment exactly once",async()=>{
  active=a;
  const deliverPayload={action:"deliver",repairId,confirmedPickup:true,warrantyDays:30,
    warrantyTerms:"Parts and labor from pickup date"};
  expect((await post(deliverPayload)).status).toBe(409);
  const key=randomUUID();
  const first={action:"pay",repairId,amount:50,idempotencyKey:key};
  const noTill=await post(first);
  expect(noTill.status).toBe(409);
  expect((await noTill.json()).error).toBe("OPEN_CASH_SESSION_REQUIRED");
  const opened=await post({action:"openCash",openingUsd:0,openingLbp:0,
    openingExchangeRate:90000});
  expect(opened.status).toBe(201);
  const openId=(await opened.json()).cashSessionId;
  expect((await (await route.GET()).json()).cashOpen).toBe(true);
  const paid=await post(first);
  expect(paid.status).toBe(201);
  const firstResult=await paid.json();
  expect(firstResult.replayed).toBe(false);
  const replay=await post(first);
  expect(replay.status).toBe(200);
  expect((await replay.json()).paymentId).toBe(firstResult.paymentId);
  const reuse=await post({...first,amount:40});
  expect(reuse.status).toBe(409);
  const afterPartial=await db.repairOrder.findUniqueOrThrow({where:{id:repairId}});
  expect(Number(afterPartial.paidTotal)).toBe(50);
  expect(Number(afterPartial.balanceDue)).toBe(70);
  expect((await post(deliverPayload)).status).toBe(409);
  const overpay=await post({action:"pay",repairId,amount:71,idempotencyKey:randomUUID()});
  expect(overpay.status).toBe(409);
  const final=await post({action:"pay",repairId,amount:70,idempotencyKey:randomUUID()});
  expect(final.status).toBe(201);
  const state=await db.repairOrder.findUniqueOrThrow({where:{id:repairId}});
  expect(Number(state.balanceDue)).toBe(0);
  expect(Number(state.paidTotal)).toBe(120);
  const rows=await db.cashMovement.findMany({where:{tenantId:a.tenantId,
    cashSessionId:openId,type:"REPAIR",sourceType:"Payment"}});
  expect(rows).toHaveLength(2);
  expect(rows.reduce((acc,row)=>acc+Number(row.amount),0)).toBe(120);
  expect((await db.payment.count({where:{repairOrderId:repairId,status:"POSTED"}}))).toBe(2);
  active=b;
  expect((await post({action:"pay",repairId,amount:1,idempotencyKey:randomUUID()})).status).toBe(404);
  expect((await post(deliverPayload)).status).toBe(404);
  active={...a,permissions:new Set(["repair.manage"])};
  expect((await post({action:"pay",repairId,amount:1,idempotencyKey:randomUUID()})).status).toBe(403);
  active=a;
  const delivered=await post(deliverPayload);
  expect(delivered.status).toBe(201);
  const delivery=await delivered.json();
  expect(delivery.warrantyId).toBeTruthy();
  const deliveredAgain=await post(deliverPayload);
  expect(deliveredAgain.status).toBe(200);
  expect((await deliveredAgain.json()).warrantyId).toBe(delivery.warrantyId);
  const finalState=await (await route.GET()).json();
  const item=finalState.orders.find((o:{id:string})=>o.id===repairId);
  expect(item.status).toBe("DELIVERED");
  expect(item.warranty.status).toBe("ACTIVE");
  expect(item.balanceDue).toBe(0);
  expect((await db.warranty.count({where:{tenantId:a.tenantId,repairOrderId:repairId}}))).toBe(1);
  expect((await db.repairStatusEvent.count({where:{
    repairOrderId:repairId,toStatus:"DELIVERED"}}))).toBe(1);
 },90000);

 it("rejects tenant crossover, invalid transitions and duplicated request",async()=>{
  active=b;
  const other=(await route.GET()).status;expect(other).toBe(200);
  const otherRows=(await (await route.GET()).json()).orders;
  expect(otherRows.some((o:{id:string})=>o.id===repairId)).toBe(false);
  expect((await post({action:"approve",repairId})).status).toBe(404);
  active=a;
  expect((await post({action:"start",repairId})).status).toBe(409);
  expect((await post({action:"ready",repairId,finalPrice:120,laborCost:0,directCost:0})).status).toBe(409);
 },50000);
 it("rejects unauthorized, cross-origin, malformed and disabled requests",async()=>{
  active=null;expect((await route.GET()).status).toBe(401);
  active={...a,permissions:new Set()};
  expect((await route.GET()).status).toBe(403);
  active=a;
  expect((await post({action:"start",repairId}, "https://not-our-store.invalid")).status).toBe(403);
  expect((await post({action:"intake",customerName:"Bad",customerPhone:"123",deviceDescription:"A",
   condition:"B",reportedIssue:"C",imei:"123"})).status).toBe(400);
  process.env.A1_MOBI_C_LIVE_02_ENABLED="0";
  expect((await route.GET()).status).toBe(404);
  expect((await post({action:"approve",repairId})).status).toBe(404);
  process.env.A1_MOBI_C_LIVE_02_ENABLED="1";
 },50000);
});
