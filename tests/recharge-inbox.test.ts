import {describe,expect,it,vi} from "vitest";
import {acceptRechargeEventToInbox,type RechargeInboxRow,type RechargeInboxStore} from "@/modules/recharge-bridge/inbox";
const scope={tenantId:"tenant-A",branchId:"branch-A",merchantId:"merchant-A"};
const order={rechargeOrderId:"order-A",externalRef:"mobi-A",branchId:scope.branchId,
 merchantId:scope.merchantId,state:"PROCESSING" as const,version:2};
const payloadHash="a".repeat(64);
function store(){
 const rows=new Map<string,RechargeInboxRow>();
 const create=vi.fn(async({data}:{data:RechargeInboxRow})=>{
  if(rows.has(data.eventId))throw new Error("UNIQUE");
  rows.set(data.eventId,data);return data;
 });
 const findUnique=vi.fn(async({where}:{where:{eventId:string}})=>rows.get(where.eventId)??null);
 return {rows,create,findUnique,adapter:{create,findUnique} satisfies RechargeInboxStore};
}
const receive=(adapter:RechargeInboxStore,eventId="event-12345",next=order,hash=payloadHash)=>
 acceptRechargeEventToInbox({store:adapter,scope,order:next,eventId,payloadHash:hash});
describe("G5 durable webhook inbox policy",()=>{
 it("persists a new event once without side effects",async()=>{
  const s=store();
  expect(await receive(s.adapter)).toEqual({outcome:"INSERTED",eventId:"event-12345",financialPostingAllowed:false});
  expect(s.rows.size).toBe(1);
  expect(s.rows.get("event-12345")).toMatchObject({tenantId:"tenant-A",branchId:"branch-A",orderVersion:2});
 });
 it("acknowledges identical duplicate without a second insert",async()=>{
  const s=store();await receive(s.adapter);
  expect(await receive(s.adapter)).toMatchObject({outcome:"DUPLICATE",financialPostingAllowed:false});
  expect(s.create).toHaveBeenCalledTimes(1);
 });
 it("rejects collision if event id reused for another order or payload",async()=>{
  const s=store();await receive(s.adapter);
  await expect(receive(s.adapter,"event-12345",{...order,rechargeOrderId:"other"})).rejects.toThrow("INBOX_EVENT_COLLISION");
  await expect(receive(s.adapter,"event-12345",order,"b".repeat(64))).rejects.toThrow("INBOX_EVENT_COLLISION");
 });
 it("rejects cross-merchant and cross-branch data before writing",async()=>{
  const s=store();
  await expect(receive(s.adapter,"event-12345",{...order,merchantId:"merchant-B"})).rejects.toThrow("INBOX_SCOPE_MISMATCH");
  await expect(receive(s.adapter,"event-12345",{...order,branchId:"branch-B"})).rejects.toThrow("INBOX_SCOPE_MISMATCH");
  expect(s.create).not.toHaveBeenCalled();
 });
 it("handles concurrent duplicate race after a unique collision",async()=>{
  const s=store();const row:RechargeInboxRow={eventId:"event-12345",...scope,
   rechargeOrderId:"order-A",orderVersion:2,payloadHash,state:"PROCESSING"};
  s.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(row);
  s.create.mockRejectedValueOnce(new Error("UNIQUE"));
  expect(await receive(s.adapter)).toMatchObject({outcome:"DUPLICATE",financialPostingAllowed:false});
 });
 it("does not acknowledge a storage error with no durable row",async()=>{
  const s=store();s.create.mockRejectedValueOnce(new Error("DB_DOWN"));
  await expect(receive(s.adapter)).rejects.toThrow("DB_DOWN");
 });
 it("rejects forged hash and invalid event identifiers",async()=>{
  const s=store();
  await expect(receive(s.adapter,"bad",order)).rejects.toThrow("INBOX_INVALID_EVENT");
  await expect(receive(s.adapter,"event-12345",order,"not-sha256")).rejects.toThrow("INBOX_INVALID_EVENT");
 });
});
