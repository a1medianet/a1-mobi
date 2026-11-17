/**
 * G5 inbox persistence policy for authenticated Recharge sandbox events.
 * This module never creates a cash movement, receipt, top-up or settlement.
 * Verification of signature and registered merchant-to-tenant mapping precedes it.
 */
import {RechargeBridgeError} from "./receiver";
import type {RechargeOrder} from "./receiver";

export type RechargeInboxRow = {
 eventId:string;tenantId:string;branchId:string;merchantId:string;
 rechargeOrderId:string;orderVersion:number;payloadHash:string;state:string;
};
export type RechargeInboxStore = {
 findUnique(args:{where:{eventId:string}}):Promise<RechargeInboxRow|null>;
 create(args:{data:RechargeInboxRow}):Promise<RechargeInboxRow>;
};
export async function acceptRechargeEventToInbox(input:{
 store:RechargeInboxStore;
 scope:{tenantId:string;branchId:string;merchantId:string};
 order:RechargeOrder;eventId:string;payloadHash:string;
}):Promise<{outcome:"INSERTED"|"DUPLICATE";eventId:string;financialPostingAllowed:false}>{
 const {store,scope,order,eventId,payloadHash}=input;
 if(!scope.tenantId||!scope.branchId||!scope.merchantId ||
    order.branchId!==scope.branchId||order.merchantId!==scope.merchantId)
   throw new RechargeBridgeError("INBOX_SCOPE_MISMATCH",403);
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(eventId)||!/^[a-f0-9]{64}$/.test(payloadHash))
   throw new RechargeBridgeError("INBOX_INVALID_EVENT");
 const row:RechargeInboxRow={
   eventId,tenantId:scope.tenantId,branchId:scope.branchId,merchantId:scope.merchantId,
   rechargeOrderId:order.rechargeOrderId,orderVersion:order.version,
   payloadHash,state:order.state,
 };
 const same=(saved:RechargeInboxRow)=>
   Object.keys(row).every(key=>saved[key as keyof RechargeInboxRow]===row[key as keyof RechargeInboxRow]);
 const existing=await store.findUnique({where:{eventId}});
 if(existing){
   if(!same(existing))throw new RechargeBridgeError("INBOX_EVENT_COLLISION",409);
   return {outcome:"DUPLICATE",eventId,financialPostingAllowed:false};
 }
 try{
   await store.create({data:row});
   return {outcome:"INSERTED",eventId,financialPostingAllowed:false};
 }catch(error){
   // Simultaneous duplicate delivery can race between findUnique and create.
   // Never acknowledge failures unless a fully identical durable row now exists.
   const raced=await store.findUnique({where:{eventId}});
   if(!raced)throw error;
   if(!same(raced))throw new RechargeBridgeError("INBOX_EVENT_COLLISION",409);
   return {outcome:"DUPLICATE",eventId,financialPostingAllowed:false};
 }
}
