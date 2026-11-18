import {describe,expect,it} from "vitest";
import {scanRechargeReconciliation} from "@/modules/recharge-bridge/reconciliation";

type Event={eventId:string;rechargeOrderId:string;version:number;state:string};
function syntheticEvents(store:string,orders:number,versionsPerOrder:number):Event[]{
 const events:Event[]=[];
 for(let version=1;version<=versionsPerOrder;version++)
  for(let order=0;order<orders;order++)
   events.push({
    eventId:`${store}-event-${order}-${version}`,
    rechargeOrderId:`${store}-order-${order}`,
    version,state:version===versionsPerOrder?"COMPLETED":"PENDING",
   });
 // Deliberately reverse the event order: matching must not assume sorted pages.
 return events.reverse();
}
function sourcePages(events:Event[]){
 return async(cursor:string)=>{
  const offset=Number(cursor);
  const items=events.slice(offset,offset+50);
  const next=offset+items.length;
  return {items,nextCursor:String(next),hasMore:next<events.length,sandbox:true as const};
 };
}
const matchingInbox=async(ids:string[],all:Event[])=>ids.flatMap(id=>{
 const event=all.find(x=>x.eventId===id);
 return event?[{...event,orderVersion:event.version}]:[];
});

describe("G5 high-volume source reconciliation safety gate",()=>{
 it("scans three real-sized source pages (125 events) with deliberately reversed versions",async()=>{
  const events=syntheticEvents("store-a",25,5);
  const result=await scanRechargeReconciliation({
   fetchPage:sourcePages(events),
   findInbox:ids=>matchingInbox(ids,events),
  });
  expect(result).toMatchObject({
   pagesScanned:3,sourceEventsScanned:125,sourceExhausted:true,
   status:"ALL_SCANNED_PAGES_MATCHED",missingEventIds:[],
   conflictingEventIds:[],conflictingVersionOrderIds:[],
   versionGapOrderIds:[],financePosted:false,readOnly:true,diagnosticOnly:true,
  });
 });
 it("does not conflate two independent synthetic store scans",async()=>{
  const first=syntheticEvents("store-a",11,5);
  const second=syntheticEvents("store-b",11,5);
  const a=await scanRechargeReconciliation({
   fetchPage:sourcePages(first),findInbox:ids=>matchingInbox(ids,first),
  });
  const b=await scanRechargeReconciliation({
   fetchPage:sourcePages(second),findInbox:ids=>matchingInbox(ids,second),
  });
  expect(a.sourceEventsScanned).toBe(55);
  expect(b.sourceEventsScanned).toBe(55);
  expect(a.status).toBe("ALL_SCANNED_PAGES_MATCHED");
  expect(b.status).toBe("ALL_SCANNED_PAGES_MATCHED");
 });
 it("holds same-order/same-version with two distinct source event IDs for manual review",async()=>{
  const events:Event[]=[
   {eventId:"one",rechargeOrderId:"order-1",version:1,state:"PENDING"},
   {eventId:"two",rechargeOrderId:"order-1",version:1,state:"FAILED"},
  ];
  const result=await scanRechargeReconciliation({
   fetchPage:sourcePages(events),findInbox:ids=>matchingInbox(ids,events),
  });
  expect(result).toMatchObject({
   status:"REVIEW_REQUIRED",conflictingVersionOrderIds:["order-1"],
   sourceExhausted:true,financePosted:false,readOnly:true,
  });
 });
});
