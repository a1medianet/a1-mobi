/**
 * Bounded, read-only diagnostic: compares one signed-source-equivalent event-feed
 * page against tenant-scoped durable Inbox rows. Never makes money movements.
 * This is deliberately NOT a persisted cursor or automated event processor.
 */
import {RechargeBridgeError} from "./receiver";
type FeedEvent={
 eventId:string;rechargeOrderId:string;version:number;state:string;
};
type InboxRow={
 eventId:string;rechargeOrderId:string;orderVersion:number;state:string;
};
export function summarizeRechargeReconciliation(
 feed:{items:FeedEvent[];nextCursor:string;hasMore:boolean;sandbox:true},
 rows:InboxRow[],
){
 if(!Array.isArray(feed.items)||feed.items.length>50||!Array.isArray(rows))
  throw new RechargeBridgeError("INVALID_RECONCILIATION_DATA",400);
 const saved=new Map<string,InboxRow>();
 for(const row of rows){
  if(saved.has(row.eventId))throw new RechargeBridgeError("DUPLICATE_INBOX_ID",409);
  saved.set(row.eventId,row);
 }
 const missing:string[]=[],conflicting:string[]=[];
 const expectedVersions=new Map<string,number[]>();
 for(const event of feed.items){
  const existing=saved.get(event.eventId);
  if(!existing)missing.push(event.eventId);
  else if(existing.rechargeOrderId!==event.rechargeOrderId||
    existing.orderVersion!==event.version||existing.state!==event.state)
   conflicting.push(event.eventId);
  const group=expectedVersions.get(event.rechargeOrderId)??[];
  group.push(event.version);
  expectedVersions.set(event.rechargeOrderId,group);
 }
 const gaps:string[]=[];
 for(const [id,versions] of expectedVersions){
  const sorted=[...new Set(versions)].sort((a,b)=>a-b);
  for(let i=1;i<sorted.length;i++)
   if(sorted[i]!==sorted[i-1]+1){gaps.push(id);break;}
 }
 return {
  sandbox:true as const,readOnly:true as const,
  financePosted:false as const,
  pageSize:feed.items.length,nextCursor:feed.nextCursor,
  hasMore:feed.hasMore,missingEventIds:missing,
  conflictingEventIds:conflicting,versionGapOrderIds:gaps,
  complete:false as const,
  status:conflicting.length||gaps.length?"REVIEW_REQUIRED" as const:
   missing.length?"DELIVERY_BACKLOG" as const:
   feed.hasMore?"MORE_PAGES_REQUIRED" as const:"PAGE_MATCHED" as const,
  note:"Single page only. No persisted cursor, global reconciliation or financial posting.",
 };
}
