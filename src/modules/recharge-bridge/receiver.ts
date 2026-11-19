/**
 * Mobi G5 sandbox receiver; deliberately independent from the manual top-up ledger.
 * This module MUST NOT authorize provider settlement or customer cash posting.
 */
export type RechargeState = "PENDING"|"PROCESSING"|"COMPLETED"|"FAILED"|"CANCELLED";
export type RechargeOrder = {
  rechargeOrderId:string; merchantId:string; branchId:string; externalRef:string;
  state:RechargeState; version:number; requiresReconciliation?:boolean;
};
export class RechargeBridgeError extends Error {
  constructor(public code:string,public status=0){super(code);}
}
export function rechargeSandboxEnabled(env:Record<string,string|undefined>=process.env){
  return env.A1_MOBI_RECHARGE_SANDBOX_ENABLED==="1" && env.A1_MOBI_RECHARGE_REAL_MONEY_ENABLED!=="1";
}
export function checkedOrder(value:unknown,scope:{merchantId:string;branchId:string}):RechargeOrder {
  if(!value||typeof value!=="object")throw new RechargeBridgeError("INVALID_ORDER");
  const v=value as Partial<RechargeOrder>;
  if(v.merchantId!==scope.merchantId||v.branchId!==scope.branchId)
    throw new RechargeBridgeError("SCOPE_MISMATCH",403);
  if(typeof v.rechargeOrderId!=="string"||!v.rechargeOrderId||
     typeof v.externalRef!=="string"||!v.externalRef||
     !Number.isSafeInteger(v.version)||!v.version||v.version<1||
     !["PENDING","PROCESSING","COMPLETED","FAILED","CANCELLED"].includes(v.state??""))
    throw new RechargeBridgeError("INVALID_ORDER");
  return v as RechargeOrder;
}
type Transport=(path:string,request:{
  method:"GET"|"POST";idempotencyKey?:string;body?:unknown;
})=>Promise<unknown>;
export function createRechargeReceiver(input:{
 merchantId:string;branchId:string;transport:Transport;
 env?:Record<string,string|undefined>;
}){
  const {merchantId,branchId,transport}=input;
  if(!rechargeSandboxEnabled(input.env)||!merchantId||!branchId)
    throw new RechargeBridgeError("SANDBOX_DISABLED");
  const identifier=(s:string)=>{
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(s))throw new RechargeBridgeError("INVALID_IDENTIFIER");
    return encodeURIComponent(s);
  };
  return Object.freeze({
    listCatalog:async(country:string,operator:string)=>{
      if(!/^[A-Z]{2}$/.test(country)||!/^[a-zA-Z0-9_-]{1,48}$/.test(operator))
        throw new RechargeBridgeError("INVALID_CATALOG_FILTER");
      return transport("/v1/catalog?country="+country+"&operator="+operator+"&branchId="+identifier(branchId),{method:"GET"});
    },
    listSupplierSettlements:async(from:string,to:string)=>{
      if(!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(from)||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(to)||from>to)
        throw new RechargeBridgeError("INVALID_DATE_RANGE");
      // Recharge supplier balances/settlements are read-only in Mobi.
      return transport("/v1/settlements?from="+from+"&to="+to+"&branchId="+identifier(branchId),{method:"GET"});
    },
    createQuote:async(payload:{country:string;operator:string;sku:string;quantity:number},key:string)=>{
      if(!/^[A-Za-z0-9_-]{12,128}$/.test(key))throw new RechargeBridgeError("INVALID_IDEMPOTENCY_KEY");
      if(!/^[A-Z]{2}$/.test(payload.country)||!/^[A-Za-z0-9_-]{1,48}$/.test(payload.operator)||
         !/^[A-Za-z0-9_-]{1,128}$/.test(payload.sku)||
         !Number.isSafeInteger(payload.quantity)||payload.quantity<1||payload.quantity>100)
        throw new RechargeBridgeError("INVALID_QUOTE_REQUEST");
      return transport("/v1/quotes",{method:"POST",idempotencyKey:key,
        body:{...payload,merchantId,branchId}});
    },
    getOrder:async(id:string)=>checkedOrder(await transport("/v1/orders/"+identifier(id),{method:"GET"}),{merchantId,branchId}),
    getOrderByExternalRef:async(reference:string)=>{
      const raw=await transport("/v1/reconciliation/by-external-ref/"+identifier(reference),{method:"GET"});
      if(!raw||typeof raw!=="object"||Array.isArray(raw))
        throw new RechargeBridgeError("INVALID_REFERENCE_LOOKUP",502);
      const result=raw as Record<string,unknown>;
      if(result.sandboxOnly!==true||result.fulfillmentConfirmedByCarrier!==false||
         result.externalRef!==reference||result.merchantId!==merchantId||result.branchId!==branchId)
        throw new RechargeBridgeError("REFERENCE_SCOPE_MISMATCH",403);
      return checkedOrder(raw,{merchantId,branchId});
    },
    sourceReconciliation:async(id:string)=>{
      const data=await transport("/v1/reconciliation/orders/"+identifier(id),{method:"GET"});
      if(!data||typeof data!=="object"||Array.isArray(data))
        throw new RechargeBridgeError("INVALID_SOURCE_RECONCILIATION",502);
      const row=data as Record<string,unknown>;
      if(row.merchantId!==merchantId||row.branchId!==branchId||
         row.rechargeOrderId!==id)
        throw new RechargeBridgeError("SCOPE_MISMATCH",403);
      const state=row.transport as Record<string,unknown>|undefined;
      if(row.sandboxOnly!==true||row.customerCashEntriesIncluded!==false||
         !state||state.fulfillmentConfirmedByCarrier!==false||
         !Array.isArray(row.events)||!Array.isArray(row.supplierEntries))
        throw new RechargeBridgeError("INVALID_SOURCE_RECONCILIATION",502);
      return data;
    },
    sourceDeadLetters:async(limit=50)=>{
      if(!Number.isSafeInteger(limit)||limit<1||limit>100)
        throw new RechargeBridgeError("INVALID_RECONCILIATION_LIMIT",400);
      const data=await transport("/v1/reconciliation/dead-letters?limit="+limit,{method:"GET"});
      if(!data||typeof data!=="object"||Array.isArray(data))
        throw new RechargeBridgeError("INVALID_SOURCE_DEAD_LETTERS",502);
      const result=data as Record<string,unknown>;
      if(result.sandboxOnly!==true||result.immutableUntilReviewed!==true||
         result.mayReplay!==false||result.mayAcknowledge!==false||
         result.mayPostFinance!==false||!Array.isArray(result.items)||
         result.items.length>limit)
        throw new RechargeBridgeError("INVALID_SOURCE_DEAD_LETTERS",502);
      return data;
    },
    cancelOrder:async(id:string,key:string)=>{
      if(!/^[A-Za-z0-9_-]{12,128}$/.test(key))throw new RechargeBridgeError("INVALID_IDEMPOTENCY_KEY");
      return checkedOrder(await transport("/v1/orders/"+identifier(id)+"/cancel",{
        method:"POST",idempotencyKey:key,body:{merchantId,branchId},
      }),{merchantId,branchId});
    },
    replayEvents:async(cursor:string)=>{
      if(!/^(0|[1-9][0-9]{0,15})$/.test(cursor))
        throw new RechargeBridgeError("INVALID_EVENT_CURSOR");
      const result=await transport("/v1/events?cursor="+cursor,{method:"GET"});
      if(!result||typeof result!=="object"||Array.isArray(result))
        throw new RechargeBridgeError("INVALID_EVENT_FEED");
      const feed=result as {items?:unknown;nextCursor?:unknown;hasMore?:unknown;sandbox?:unknown};
      if(!Array.isArray(feed.items)||feed.items.length>50||
         typeof feed.nextCursor!=="string"||!/^(0|[1-9][0-9]{0,15})$/.test(feed.nextCursor)||
         typeof feed.hasMore!=="boolean"||feed.sandbox!==true)
        throw new RechargeBridgeError("INVALID_EVENT_FEED");
      const items=feed.items.map(item=>{
        if(!item||typeof item!=="object"||Array.isArray(item))
          throw new RechargeBridgeError("INVALID_EVENT_FEED");
        const e=item as Record<string,unknown>;
        if(typeof e.eventId!=="string"||!/^[A-Za-z0-9_-]{8,128}$/.test(e.eventId)||
           e.merchantId!==merchantId||e.branchId!==branchId||
           typeof e.rechargeOrderId!=="string"||!e.rechargeOrderId||
           !Number.isSafeInteger(e.version)||Number(e.version)<1||
           !["PENDING","PROCESSING","COMPLETED","FAILED","CANCELLED"].includes(String(e.state))||
           typeof e.occurredAt!=="string"||!Number.isFinite(Date.parse(e.occurredAt)))
          throw new RechargeBridgeError("EVENT_SCOPE_OR_SCHEMA_MISMATCH",403);
        return item;
      });
      return {items,nextCursor:feed.nextCursor,hasMore:feed.hasMore,sandbox:true as const};
    },
    createOrder:async(payload:{quoteId:string;recipient:string;externalRef:string},key:string)=>{
      if(!/^[A-Za-z0-9_-]{12,128}$/.test(key))throw new RechargeBridgeError("INVALID_IDEMPOTENCY_KEY");
      if(!payload.quoteId||!payload.recipient||!payload.externalRef)throw new RechargeBridgeError("INVALID_ORDER_REQUEST");
      // No automatic retry on ambiguous writes; caller preserves identical key.
      return checkedOrder(await transport("/v1/orders",{
        method:"POST",idempotencyKey:key,body:{...payload,merchantId,branchId},
      }),{merchantId,branchId});
    },
  });
}
/** An incoming Recharge update is observational, never a trigger for a cash entry. */
export function observeRechargeOrder(previous:RechargeOrder|undefined,next:RechargeOrder){
  if(previous&&[previous.rechargeOrderId,previous.merchantId,previous.branchId,previous.externalRef]
    .some((v,i)=>v!==[next.rechargeOrderId,next.merchantId,next.branchId,next.externalRef][i]))
    throw new RechargeBridgeError("ORDER_IDENTITY_MISMATCH");
  if(previous&&next.version<=previous.version)
    return {accepted:false,state:previous.state,reconcile:previous.requiresReconciliation===true,financialPostingAllowed:false as const};
  if(previous&&["COMPLETED","FAILED","CANCELLED"].includes(previous.state))
    throw new RechargeBridgeError("TERMINAL_STATE_IMMUTABLE");
  if(previous&&previous.state==="PROCESSING"&&next.state==="PENDING")
    throw new RechargeBridgeError("INVALID_STATE_TRANSITION");
  return {accepted:true,state:next.state,
    reconcile:next.state==="PROCESSING"&&next.requiresReconciliation===true,
    financialPostingAllowed:false as const};
}
