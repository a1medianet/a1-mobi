import { authJson,currentStoreContext,sameOriginMutation } from "@/server/auth-http";
import { readAuthJson } from "@/core/auth/request";
import { mobiSupportGate } from "@/core/support-gate";
import { invokeLocalMobiSupport,supportCsrfToken,supportLocalConfigFromEnv,verifySupportCsrf } from "@/core/support-local-contract";

export const runtime="nodejs";
export const dynamic="force-dynamic";

type RouteContext={params:Promise<{operation:string}>};
function active(){
 // Explicit localhost-only pilot. This code must never contact VPS unchanged.
 return process.env.NODE_ENV!=="production"&&mobiSupportGate(process.env);
}
function unavailable(){return authJson({error:"SUPPORT_UNAVAILABLE"},503);}
async function session(){
 const verified=await currentStoreContext();
 if(!verified)return null;
 return {sessionId:verified.sessionId,tenantId:verified.tenantId,actorId:verified.actorId};
}
export async function GET(request:Request,{params}:RouteContext){
 if(!active())return authJson({error:"NOT_FOUND"},404);
 const {operation}=await params;
 if(!["session","tickets","thread"].includes(operation))return authJson({error:"NOT_FOUND"},404);
 const actor=await session();
 if(!actor)return authJson({error:"AUTH_REQUIRED"},401);
 try{
  const config=supportLocalConfigFromEnv(process.env);
  if(operation==="session")return authJson({csrfToken:supportCsrfToken(actor,config.csrfKey)});
  if(operation==="tickets")return authJson(await invokeLocalMobiSupport(config,actor,"listTickets",{}));
  const url=new URL(request.url);
  return authJson(await invokeLocalMobiSupport(config,actor,"getThread",{ticketId:url.searchParams.get("ticketId")}));
 }catch{return unavailable();}
}
export async function POST(request:Request,{params}:RouteContext){
 if(!active())return authJson({error:"NOT_FOUND"},404);
 const {operation}=await params;
 if(operation!=="tickets"&&operation!=="reply")return authJson({error:"NOT_FOUND"},404);
 if(!sameOriginMutation(request))return authJson({error:"FORBIDDEN_ORIGIN"},403);
 const actor=await session();
 if(!actor)return authJson({error:"AUTH_REQUIRED"},401);
 try{
  const config=supportLocalConfigFromEnv(process.env);
  if(!verifySupportCsrf(actor,config.csrfKey,request.headers.get("x-csrf-token")??""))
   return authJson({error:"INVALID_CSRF"},403);
  if(!request.headers.get("content-type")?.startsWith("application/json"))
   return authJson({error:"INVALID_REQUEST"},400);
  const body=await readAuthJson(request,9000);
  return authJson(await invokeLocalMobiSupport(config,actor,operation==="tickets"?"createTicket":"reply",body));
 }catch{return unavailable();}
}
