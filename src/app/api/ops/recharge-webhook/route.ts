/**
 * G5 sandbox-only Recharge webhook capture.
 * No Mobi payment, receipt, cash movement or supplier settlement writes.
 * Sender contract is provisional until Recharge ships its signed outbox.
 */
import {db} from "@/server/db";
import {authJson} from "@/server/auth-http";
import {acceptRechargeEventToInbox} from "@/modules/recharge-bridge/inbox";
import {verifyIncomingRechargeEvent,IncomingRechargeEvent} from "@/modules/recharge-bridge/webhook";
import {resolveRechargeSandboxMapping} from "@/modules/recharge-bridge/sandbox-config";
import {RechargeBridgeError} from "@/modules/recharge-bridge/receiver";

export const runtime="nodejs";
export const dynamic="force-dynamic";

async function boundedRaw(request:Request):Promise<Buffer>{
  const stream=request.body;
  if(!stream)throw new RechargeBridgeError("EMPTY_WEBHOOK",400);
  const reader=stream.getReader(),chunks:Uint8Array[]=[];
  let length=0;
  try{
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>16384)throw new RechargeBridgeError("WEBHOOK_TOO_LARGE",413);
      chunks.push(value);
    }
  }finally{reader.releaseLock();}
  return Buffer.concat(chunks.map(c=>Buffer.from(c)));
}
function errorReply(error:unknown){
 if(error instanceof RechargeBridgeError){
  const status=error.status>=400&&error.status<600?error.status:
   ["STALE_WEBHOOK","INVALID_SIGNATURE","INVALID_EVENT_ID","WEBHOOK_SECRET_UNAVAILABLE"].includes(error.code)?401:400;
  return authJson({error:error.code},status);
 }
 return authJson({error:"WEBHOOK_PERSISTENCE_UNAVAILABLE"},503);
}
export async function POST(request:Request){
 if(process.env.A1_MOBI_RECHARGE_ADAPTER_ENABLED!=="true"||
    process.env.A1_RECHARGE_SANDBOX_ONLY!=="true"||
    process.env.A1_MOBI_RECHARGE_REAL_MONEY_ENABLED==="1")
  return authJson({error:"NOT_FOUND"},404);
 const secret=process.env.A1_MOBI_RECHARGE_WEBHOOK_HMAC_SECRET;
 if(!secret||secret.length<32)return authJson({error:"WEBHOOK_SECRET_UNAVAILABLE"},503);
 if(!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
  return authJson({error:"INVALID_REQUEST"},415);
 try{
  const rawBody=await boundedRaw(request);
  const eventId=request.headers.get("x-a1-event-id")??"";
  const timestamp=Number(request.headers.get("x-a1-event-timestamp")??"NaN");
  const signature=request.headers.get("x-a1-event-signature")??"";
  // Signature is checked *before* payload can be trusted as a merchant identity.
  const input={secret,timestamp,eventId,signature,rawBody};
  // These values are not trusted until verified; only use them to select a
  // configured test mapping, which the signature validator then checks.
  let candidate:Partial<IncomingRechargeEvent>;
  try{candidate=JSON.parse(rawBody.toString("utf8")) as Partial<IncomingRechargeEvent>;}
  catch{throw new RechargeBridgeError("INVALID_EVENT_BODY",400);}
  if(!candidate||typeof candidate!=="object"||Array.isArray(candidate))
    throw new RechargeBridgeError("INVALID_EVENT_BODY",400);
  const mappingsRaw=process.env.A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON;
  let mappingRows:unknown;
  try{mappingRows=JSON.parse(mappingsRaw??"[]");}
  catch{throw new RechargeBridgeError("RECHARGE_MAPPING_INVALID",503);}
  if(!Array.isArray(mappingRows))throw new RechargeBridgeError("RECHARGE_MAPPING_INVALID",503);
  const matches=mappingRows.filter(m=>m&&typeof m==="object"&&
    m.merchantId===candidate.merchantId&&m.rechargeBranchId===candidate.branchId);
  if(matches.length!==1)throw new RechargeBridgeError("WEBHOOK_SCOPE_MISMATCH",403);
  const enrolled=matches[0] as {tenantId:string;branchId:string};
  const {mapping}=resolveRechargeSandboxMapping(enrolled.tenantId,enrolled.branchId);
  const {event,order,payloadHash}=verifyIncomingRechargeEvent({
    ...input,scope:{merchantId:mapping.merchantId,branchId:mapping.rechargeBranchId},
  });
  if((event as IncomingRechargeEvent&{type?:string}).type!=="recharge.order.v1")
    throw new RechargeBridgeError("WEBHOOK_EVENT_TYPE_UNSUPPORTED",422);
  const persisted=await acceptRechargeEventToInbox({
    store:db.rechargeWebhookInbox,
    scope:{tenantId:mapping.tenantId,branchId:mapping.branchId,merchantId:mapping.merchantId},
    eventId:event.eventId,order,payloadHash,
  });
  return authJson({accepted:true,outcome:persisted.outcome,eventId:persisted.eventId,
    financePosted:false},persisted.outcome==="INSERTED"?202:200);
 }catch(error){return errorReply(error);}
}
