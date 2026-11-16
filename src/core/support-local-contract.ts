import {createHmac,randomUUID,timingSafeEqual} from "node:crypto";

// Only for the explicitly enabled Thaghr localhost pilot. Never use this
// HMAC contract for VPS / distributed deployments without a new security gate.
export type MobiSupportSession={
 sessionId:string;tenantId:string;actorId:string;
};
export type SupportLocalConfig={
 endpoint:string;serviceKey:string;csrfKey:string;
 tenantMap:ReadonlyMap<string,string>;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CUID=/^c[a-z0-9]{20,35}$/;
function deny():never{throw new Error("SUPPORT_LOCAL_DENIED");}
function validSession(s:MobiSupportSession){
 // Mobi's own Tenant/User/Session primary keys are Prisma cuid(), not UUID.
 if(!s||!CUID.test(s.tenantId)||!CUID.test(s.actorId)||!CUID.test(s.sessionId))deny();
}
function validKey(k:string){if(typeof k!=="string"||k.length<32)deny();}
export function supportCsrfToken(s:MobiSupportSession,key:string){
 validSession(s);validKey(key);
 return createHmac("sha256",key).update("a1-mobi-support-csrf:v1:"+s.sessionId).digest("base64url");
}
export function verifySupportCsrf(s:MobiSupportSession,key:string,token:string){
 if(typeof token!=="string"||token.length!==43)return false;
 const a=Buffer.from(supportCsrfToken(s,key));const b=Buffer.from(token);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function supportLocalConfigFromEnv(env:Record<string,string|undefined>):SupportLocalConfig{
 const endpoint=env.A1_SUPPORT_LOCAL_ENDPOINT??"";
 const serviceKey=env.A1_SUPPORT_MOBI_SERVICE_KEY??"";
 const csrfKey=env.A1_SUPPORT_MOBI_CSRF_KEY??"";
 if(!/^http:\/\/127\.0\.0\.1:[0-9]{2,5}\/internal\/support$/.test(endpoint))deny();
 validKey(serviceKey);validKey(csrfKey);
 let parsed:unknown;
 try{parsed=JSON.parse(env.A1_SUPPORT_MOBI_TENANTS_JSON??"");}catch{deny();}
 if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))deny();
 const values=Object.entries(parsed);
 if(!values.length||values.length>100)deny();
 const tenantMap=new Map<string,string>();
 for(const [external,support] of values){
  if(!CUID.test(external)||typeof support!=="string"||!UUID.test(support))deny();
  tenantMap.set(external,support);
 }
 return {endpoint,serviceKey,csrfKey,tenantMap};
}
type Operation="listTickets"|"getThread"|"createTicket"|"reply";
export function sanitizeSupportAction(action:Operation,input:unknown){
 if(action==="listTickets")return {};
 if(!input||typeof input!=="object"||Array.isArray(input))deny();
 const obj=input as Record<string,unknown>;
 if(action==="getThread"){
  if(typeof obj.ticketId!=="string"||!UUID.test(obj.ticketId))deny();
  return {ticketId:obj.ticketId};
 }
 if(action==="createTicket"){
  if(typeof obj.subject!=="string"||!obj.subject.trim()||obj.subject.length>200||
     typeof obj.message!=="string"||!obj.message.trim()||obj.message.length>8000||
     !["support","complaint","feedback"].includes(String(obj.category??"support")))deny();
  return {subject:obj.subject.trim(),message:obj.message.trim(),category:obj.category??"support"};
 }
 if(action==="reply"){
  if(typeof obj.ticketId!=="string"||!UUID.test(obj.ticketId)||
     typeof obj.message!=="string"||!obj.message.trim()||obj.message.length>8000)deny();
  return {ticketId:obj.ticketId,message:obj.message.trim()};
 }
 deny();
}
export async function invokeLocalMobiSupport(
 config:SupportLocalConfig,session:MobiSupportSession,operation:Operation,input:unknown,
 fetchImpl:typeof fetch=fetch
){
 validSession(session);validKey(config.serviceKey);
 const tenantId=config.tenantMap.get(session.tenantId);
 if(!tenantId||!UUID.test(tenantId))deny();
 if(!/^http:\/\/127\.0\.0\.1:[0-9]{2,5}\/internal\/support$/.test(config.endpoint))deny();
 const actor="mobi:"+session.actorId;
 const payload={tenantId,verifiedSubject:actor,...sanitizeSupportAction(operation,input)};
 const envelope={issuer:"a1-mobi",audience:"a1-support",iat:Date.now(),nonce:randomUUID(),operation,payload};
 const mac=createHmac("sha256",config.serviceKey).update(JSON.stringify(envelope)).digest("hex");
 const response=await fetchImpl(config.endpoint,{method:"POST",redirect:"error",headers:{"content-type":"application/json"},
  body:JSON.stringify({envelope,mac}),signal:AbortSignal.timeout(5000),cache:"no-store"});
 if(!response.ok)deny();
 const json:unknown=await response.json();
 if(!json||typeof json!=="object"||!("result" in json))deny();
 return (json as {result:unknown}).result;
}
