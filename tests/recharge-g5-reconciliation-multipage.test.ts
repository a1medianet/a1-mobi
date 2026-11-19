import {describe,it,expect} from "vitest";
import {scanRechargeReconciliation} from "@/modules/recharge-bridge/reconciliation";
type Event={eventId:string;rechargeOrderId:string;version:number;state:string};
const e=(id:string,version:number):Event=>({eventId:id,rechargeOrderId:"order-A",version,state:version===1?"PENDING":"FAILED"});
const p=(items:Event[],nextCursor:string,hasMore:boolean)=>({
 items,nextCursor,hasMore,sandbox:true as const,
});
describe("G5 merchant-specific paginated reconciliation",()=>{
 it("scans multiple pages and diagnoses unreceived events, without financial posting",async()=>{
  const out=await scanRechargeReconciliation({
   fetchPage:async cursor=>cursor==="0"?p([e("event_A_0001",1)],"1",true):
    p([e("event_A_0002",2)],"2",false),
   findInbox:async ids=>ids.includes("event_A_0001")?[{
     ...e("event_A_0001",1),orderVersion:1,
   }]:[],
  });
  expect(out).toMatchObject({pagesScanned:2,sourceEventsScanned:2,sourceExhausted:true,
   missingEventIds:["event_A_0002"],versionGapOrderIds:[],
   status:"DELIVERY_BACKLOG",financePosted:false,readOnly:true,diagnosticOnly:true});
 });
 it("matches multiple fully received pages without claiming financial acceptance",async()=>{
  const out=await scanRechargeReconciliation({
   fetchPage:async cursor=>cursor==="0"?p([e("event_A_0001",1)],"1",true):
    p([e("event_A_0002",2)],"2",false),
   findInbox:async ids=>ids.map(id=>{const v=id==="event_A_0001"?1:2;return {
    ...e(id,v),orderVersion:v,
   };}),
  });
  expect(out).toMatchObject({status:"ALL_SCANNED_PAGES_MATCHED",sourceExhausted:true,
   financePosted:false,diagnosticOnly:true});
 });
 it("detects version jumps across page boundaries",async()=>{
  const out=await scanRechargeReconciliation({
   fetchPage:async cursor=>cursor==="0"?p([e("event_A_0001",1)],"1",true):
    p([e("event_A_0003",3)],"3",false),
   findInbox:async ids=>ids.map(id=>({...e(id,id.includes("0003")?3:1),
    orderVersion:id.includes("0003")?3:1})),
  });
  expect(out.versionGapOrderIds).toEqual(["order-A"]);
  expect(out.status).toBe("REVIEW_REQUIRED");
 });
 it("refuses repeated cursor and duplicated event ids across pages",async()=>{
  await expect(scanRechargeReconciliation({
   fetchPage:async()=>p([e("event_A_0001",1)],"0",true),
   findInbox:async()=>[],
  })).rejects.toThrow("RECONCILIATION_CURSOR_STALLED");
  await expect(scanRechargeReconciliation({
   fetchPage:async cursor=>cursor==="0"?p([e("event_A_0001",1)],"1",true):
    p([e("event_A_0001",1)],"2",false),
   findInbox:async()=>[],
  })).rejects.toThrow("DUPLICATE_SOURCE_EVENT");
 });
 it("does not claim full scan when configured page cap is reached",async()=>{
  const out=await scanRechargeReconciliation({maxPages:1,
   fetchPage:async()=>p([e("event_A_0001",1)],"1",true),
   findInbox:async ids=>ids.map(id=>({...e(id,1),orderVersion:1})),
  });
  expect(out.status).toBe("SCAN_LIMIT_REACHED");
  expect(out.sourceExhausted).toBe(false);
 });
 it("rejects invalid page limits and malformed pages",async()=>{
  await expect(scanRechargeReconciliation({
   maxPages:21,fetchPage:async()=>p([], "0",false),findInbox:async()=>[],
  })).rejects.toThrow("INVALID_PAGE_LIMIT");
  await expect(scanRechargeReconciliation({
   fetchPage:async()=>p([], "01",false),findInbox:async()=>[],
  })).rejects.toThrow("INVALID_SOURCE_PAGE");
 });
});
