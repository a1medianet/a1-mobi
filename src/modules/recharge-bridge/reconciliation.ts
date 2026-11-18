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

/**
 * A safe, bounded multi-page diagnostic. Failure is explicit rather than silently
 * declaring an incomplete page set consistent. No cursor is persisted.
 */
export async function scanRechargeReconciliation(input:{
 fetchPage:(cursor:string)=>Promise<{items:FeedEvent[];nextCursor:string;hasMore:boolean;sandbox:true}>;
 findInbox:(eventIds:string[])=>Promise<InboxRow[]>;
 maxPages?:number;
}){
 const maxPages=input.maxPages??20;
 if(!Number.isSafeInteger(maxPages)||maxPages<1||maxPages>20)
  throw new RechargeBridgeError("INVALID_PAGE_LIMIT",400);
 let cursor="0",pages=0,events=0;
 const seenCursors=new Set<string>(),seenEventIds=new Set<string>();
 const missing=new Set<string>(),conflicting=new Set<string>(),gaps=new Set<string>();
 const versions=new Map<string,Set<number>>();
 let completed=false;
 while(pages<maxPages){
  if(seenCursors.has(cursor))throw new RechargeBridgeError("RECONCILIATION_CURSOR_LOOP",409);
  seenCursors.add(cursor);
  const page=await input.fetchPage(cursor);
  if(page.sandbox!==true||!Array.isArray(page.items)||page.items.length>50||
    typeof page.hasMore!=="boolean"||
    !/^(0|[1-9]\d{0,14})$/.test(page.nextCursor))
   throw new RechargeBridgeError("INVALID_SOURCE_PAGE",502);
  const rows=await input.findInbox(page.items.map(e=>e.eventId));
  const result=summarizeRechargeReconciliation(page,rows);
  pages++;events+=page.items.length;
  for(const event of page.items){
   if(seenEventIds.has(event.eventId))
    throw new RechargeBridgeError("DUPLICATE_SOURCE_EVENT",409);
   seenEventIds.add(event.eventId);
   const group=versions.get(event.rechargeOrderId)??new Set<number>();
   group.add(event.version);versions.set(event.rechargeOrderId,group);
  }
  result.missingEventIds.forEach(v=>missing.add(v));
  result.conflictingEventIds.forEach(v=>conflicting.add(v));
  if(!page.hasMore){completed=true;break;}
  if(page.nextCursor===cursor||page.items.length===0)
   throw new RechargeBridgeError("RECONCILIATION_CURSOR_STALLED",409);
  cursor=page.nextCursor;
 }
 for(const [id,group] of versions){
  const sorted=[...group].sort((a,b)=>a-b);
  if(sorted[0]>1)gaps.add(id);
  for(let i=1;i<sorted.length;i++){
   if(sorted[i]!==sorted[i-1]+1){gaps.add(id);break;}
  }
 }
 return {
  sandbox:true as const,readOnly:true as const,financePosted:false as const,
  pagesScanned:pages,sourceEventsScanned:events,
  sourceExhausted:completed,diagnosticOnly:true as const,
  missingEventIds:[...missing],conflictingEventIds:[...conflicting],
  versionGapOrderIds:[...gaps],
  status:conflicting.size||gaps.size?"REVIEW_REQUIRED" as const:
   missing.size?"DELIVERY_BACKLOG" as const:
   !completed?"SCAN_LIMIT_REACHED" as const:"ALL_SCANNED_PAGES_MATCHED" as const,
  note:"Read-only bounded scan; does not reconcile money, source order intents, or commercial readiness.",
 };
}
