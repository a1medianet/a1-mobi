/**
 * A1 Recharge G5 sandbox webhook verifier — pure, no database writes.
 * Does not constitute a durable inbox or financial permission.
 */
import {createHmac,timingSafeEqual} from "node:crypto";
import {checkedOrder,type RechargeOrder,RechargeBridgeError} from "./receiver";

export type IncomingRechargeEvent = {
 eventId:string;occurredAt:string;merchantId:string;branchId:string;
 rechargeOrderId:string;state:RechargeOrder["state"];version:number;
 externalRef:string;requiresReconciliation?:boolean;
};
export function signedEvent(secret:string,timestamp:number,eventId:string,rawBody:Buffer|string){
 if(secret.length<32)throw new RechargeBridgeError("WEBHOOK_SECRET_UNAVAILABLE");
 return createHmac("sha256",secret).update(String(timestamp)).update(".")
  .update(eventId).update(".").update(rawBody).digest("hex");
}
export function verifyIncomingRechargeEvent(input:{
 secret:string;timestamp:number;eventId:string;signature:string;
 rawBody:Buffer|string;scope:{merchantId:string;branchId:string};now?:number;
}):{event:IncomingRechargeEvent;order:RechargeOrder;payloadHash:string}{
 const now=input.now??Date.now();
 if(!Number.isSafeInteger(input.timestamp)||Math.abs(now-input.timestamp)>300000)
   throw new RechargeBridgeError("STALE_WEBHOOK");
 if(!/^[a-zA-Z0-9_-]{8,128}$/.test(input.eventId))
   throw new RechargeBridgeError("INVALID_EVENT_ID");
 if(!/^[a-f0-9]{64}$/.test(input.signature))
   throw new RechargeBridgeError("INVALID_SIGNATURE");
 const expected=Buffer.from(signedEvent(input.secret,input.timestamp,input.eventId,input.rawBody),"hex");
 if(!timingSafeEqual(expected,Buffer.from(input.signature,"hex")))
   throw new RechargeBridgeError("INVALID_SIGNATURE");
 let data:unknown;
 try{data=JSON.parse(input.rawBody.toString());}
 catch{throw new RechargeBridgeError("INVALID_EVENT_BODY");}
 if(!data||typeof data!=="object"||Array.isArray(data))
   throw new RechargeBridgeError("INVALID_EVENT_BODY");
 const event=data as Partial<IncomingRechargeEvent>;
 if(event.eventId!==input.eventId)throw new RechargeBridgeError("EVENT_ID_MISMATCH");
 if(!event.occurredAt||!Number.isFinite(Date.parse(event.occurredAt)))
   throw new RechargeBridgeError("INVALID_EVENT_TIME");
 const order=checkedOrder({
   ...event,rechargeOrderId:event.rechargeOrderId,externalRef:event.externalRef,
   state:event.state,version:event.version,
 },input.scope);
 const payloadHash=createHmac("sha256",input.secret).update(input.rawBody).digest("hex");
 return {event:event as IncomingRechargeEvent,order,payloadHash};
}
/** Only a durable DB inbox unique(eventId) and ordered processor may call this policy. */
export function eventInboxDecision(existingHash:string|undefined,incomingHash:string) {
 if(!existingHash)return "INSERT" as const;
 if(existingHash===incomingHash)return "ACK_DUPLICATE" as const;
 throw new RechargeBridgeError("EVENT_ID_COLLISION");
}
