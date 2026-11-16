import test from "node:test";
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {supportCsrfToken,verifySupportCsrf,supportLocalConfigFromEnv,invokeLocalMobiSupport} from "../src/core/support-local-contract.ts";
const tenant="c"+"a".repeat(24),actor="c"+"b".repeat(24),sessionId="c"+"d".repeat(24);
const supportTenant="11111111-1111-4111-8111-111111111111";
const context={sessionId,tenantId:tenant,actorId:actor};
const key="fixture-local-mobi-service-key-0123456789";
const csrfKey="fixture-local-mobi-csrf-key-0123456789";
const validEnv={A1_SUPPORT_LOCAL_ENDPOINT:"http://127.0.0.1:4389/internal/support",
 A1_SUPPORT_MOBI_SERVICE_KEY:key,A1_SUPPORT_MOBI_CSRF_KEY:csrfKey,
 A1_SUPPORT_MOBI_TENANTS_JSON:JSON.stringify({[tenant]:supportTenant})};
test("local contract rejects missing secrets, production network addresses and unprovisioned mappings",()=>{
 assert.throws(()=>supportLocalConfigFromEnv({}),/SUPPORT_LOCAL_DENIED/);
 assert.throws(()=>supportLocalConfigFromEnv({...validEnv,A1_SUPPORT_LOCAL_ENDPOINT:"https://support.example.com/internal/support"}),/SUPPORT_LOCAL_DENIED/);
 assert.throws(()=>supportLocalConfigFromEnv({...validEnv,A1_SUPPORT_MOBI_TENANTS_JSON:JSON.stringify({[tenant]:"invalid"})}),/SUPPORT_LOCAL_DENIED/);
});
test("CSRF is session-bound, keyed and rejects invalid tokens",()=>{
 const valid=supportCsrfToken(context,csrfKey);
 assert.equal(valid.length,43);
 assert.equal(verifySupportCsrf(context,csrfKey,valid),true);
 assert.equal(verifySupportCsrf({...context,sessionId:"c"+"f".repeat(24)},csrfKey,valid),false);
 assert.equal(verifySupportCsrf(context,csrfKey,"a".repeat(43)),false);
 assert.equal(verifySupportCsrf(context,csrfKey,""),false);
});
test("signed host call derives actor and support tenant exclusively from trusted context",async()=>{
 const config=supportLocalConfigFromEnv(validEnv);
 let body;
 const fakeFetch=async(url,options)=>{
  assert.equal(url,validEnv.A1_SUPPORT_LOCAL_ENDPOINT);
  assert.equal(options.method,"POST");
  body=JSON.parse(options.body);
  return new Response(JSON.stringify({result:{id:"verified"}}),{status:200,headers:{"content-type":"application/json"}});
 };
 const result=await invokeLocalMobiSupport(config,context,"createTicket",
  {subject:"  Help  ",message:"  Text  ",category:"complaint",verifiedSubject:"admin",tenantId:"forged",role:"owner"},fakeFetch);
 assert.deepEqual(result,{id:"verified"});
 assert.equal(body.envelope.payload.tenantId,supportTenant);
 assert.equal(body.envelope.payload.verifiedSubject,"mobi:"+actor);
 assert.equal(body.envelope.payload.subject,"Help");
 assert.equal(body.envelope.payload.message,"Text");
 assert.equal(body.envelope.payload.role,undefined);
 assert.equal(body.envelope.issuer,"a1-mobi");
 assert.equal(body.envelope.audience,"a1-support");
 assert.equal(body.mac,createHmac("sha256",key).update(JSON.stringify(body.envelope)).digest("hex"));
});
test("unmapped Mobi tenant, unsupported payloads, foreign ticket and failed Support service deny",async()=>{
 const config=supportLocalConfigFromEnv(validEnv);
 const reply=async()=>new Response("{}",{status:403});
 await assert.rejects(invokeLocalMobiSupport(config,{...context,tenantId:"c"+"e".repeat(24)},"listTickets",{},reply),/SUPPORT_LOCAL_DENIED/);
 await assert.rejects(invokeLocalMobiSupport(config,context,"reply",{ticketId:"bad",message:"x"},reply),/SUPPORT_LOCAL_DENIED/);
 await assert.rejects(invokeLocalMobiSupport(config,context,"createTicket",{subject:"x",message:"y",category:"owner"},reply),/SUPPORT_LOCAL_DENIED/);
 await assert.rejects(invokeLocalMobiSupport(config,context,"listTickets",{},reply),/SUPPORT_LOCAL_DENIED/);
});
