// G2.8 isolated integration: REAL hashed Mobi session in PostgreSQL, actual host route,
// signed localhost Support, registry + RLS. Only next/headers cookie accessor is mocked.
// No real user/customer data, production auth, or VPS access.
import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {createServer} from "node:net";
import {createRequire} from "node:module";
import {db} from "@/server/db";
import {createSessionToken} from "@/core/auth/session";
import {createLocalMobiPilot} from "../../a1-support/src/local-mobi-pilot.mjs";
import {createLocalProvisioner} from "../../a1-support/src/provisioning.mjs";
const require=createRequire(new URL("../../a1-support/package.json",import.meta.url));
const pg=require("pg");
const cookie=vi.hoisted(()=>({token:null as string|null}));
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>cookie.token?{value:cookie.token}:undefined})}));
import {GET,POST} from "@/app/api/a1-support/[operation]/route";

const mobiDatabase=process.env.DATABASE_URL;
const supportDatabase=process.env.A1_SUPPORT_TEST_DATABASE_URL;
const run=mobiDatabase&&supportDatabase?describe:describe.skip;
run("REAL Mobi PostgreSQL session -> real Next route -> signed loopback -> Support PostgreSQL",()=>{
 let tenant:{id:string},branch:{id:string},user:{id:string},session:{id:string},supportTenant:string;
 let pilot:ReturnType<typeof createLocalMobiPilot>;
 let provisioner:ReturnType<typeof createLocalProvisioner>;
 let admin:InstanceType<typeof pg.Client>;
 const serviceKey="g28-host-real-session-key-0123456789abcdef";
 const csrfKey="g28-host-real-csrf-key-0123456789abcdef";
 const requestUrl="http://127.0.0.1:4317/api/a1-support";
 const actorSubject=()=> "mobi:"+user.id;
 const flags=["A1_MOBI_SUPPORT_FEATURE","A1_MOBI_SUPPORT_API_ACCEPTED","A1_SUPPORT_LOCAL_ENDPOINT","A1_SUPPORT_MOBI_SERVICE_KEY","A1_SUPPORT_MOBI_CSRF_KEY","A1_SUPPORT_MOBI_TENANTS_JSON","APP_ORIGIN","A1_SUPPORT_LOCAL_TRANSPORT","A1_SUPPORT_LOCAL_PROVISIONING"] as const;
 const saved=Object.fromEntries(flags.map(k=>[k,process.env[k]]));
 const route=(operation:string)=>({params:Promise.resolve({operation})});
 const get=(operation:string,query="")=>GET(new Request(requestUrl+"/"+operation+query),route(operation));
 const post=(operation:string,body:unknown,csrf?:string,origin="http://127.0.0.1:4317")=>
  POST(new Request(requestUrl+"/"+operation,{method:"POST",headers:{"content-type":"application/json",
   "origin":origin,"sec-fetch-site":"same-origin",...(csrf?{"x-csrf-token":csrf}:{})},body:JSON.stringify(body)}),route(operation));
 beforeAll(async()=>{
  if(!supportDatabase)throw Error("ISOLATED_SUPPORT_DB_REQUIRED");
  const tenantSuffix=randomUUID().slice(0,12);
  tenant=await db.tenant.create({data:{slug:"g28-host-"+tenantSuffix,name:"G28 isolated test tenant"}});
  branch=await db.branch.create({data:{tenantId:tenant.id,code:"G28",name:"Test branch"}});
  user=await db.user.create({data:{tenantId:tenant.id,branchId:branch.id,email:"g28-"+tenantSuffix+"@example.test",
   displayName:"Disposable Support User",passwordHash:"not-a-login-password"}});
  const minted=createSessionToken();cookie.token=minted.token;
  session=await db.session.create({data:{userId:user.id,tokenHash:minted.tokenHash,expiresAt:new Date(Date.now()+120000)}});
  supportTenant=randomUUID();
  admin=new pg.Client({connectionString:supportDatabase});await admin.connect();
  await admin.query("INSERT INTO tenants(id,app_id,external_tenant_id,slug) VALUES($1,$2,$3,$4)",
   [supportTenant,"a1-mobi",tenant.id,"g28-"+tenantSuffix]);
  process.env.A1_SUPPORT_LOCAL_TRANSPORT="enabled";process.env.A1_SUPPORT_LOCAL_PROVISIONING="enabled";
  provisioner=createLocalProvisioner({connectionString:supportDatabase,operatorSubject:"a1:g28-local-test-operator"});
  await provisioner.linkIdentity({appId:"a1-mobi",externalTenantId:tenant.id,externalSubject:user.id,actorSubject:actorSubject()});
  await provisioner.changeMembership({appId:"a1-mobi",externalTenantId:tenant.id,actorSubject:actorSubject(),role:"requester",active:true});
  const socket=createServer();await new Promise<void>(r=>socket.listen(0,"127.0.0.1",()=>r()));
  const port=(socket.address() as {port:number}).port;await new Promise<void>(r=>socket.close(()=>r()));
  pilot=createLocalMobiPilot({env:{...process.env,NODE_ENV:"test",
   A1_SUPPORT_LOCAL_TRANSPORT:"enabled",A1_SUPPORT_LOCAL_MOBI_PILOT:"enabled",
   A1_SUPPORT_LOCAL_DATABASE_URL:supportDatabase,A1_SUPPORT_MOBI_SERVICE_KEY:serviceKey,
   A1_SUPPORT_LOCAL_PILOT_PORT:String(port)}});
  await pilot.start();
  process.env.APP_ORIGIN="http://127.0.0.1:4317";
  process.env.A1_MOBI_SUPPORT_FEATURE="enabled";process.env.A1_MOBI_SUPPORT_API_ACCEPTED="true";
  process.env.A1_SUPPORT_LOCAL_ENDPOINT="http://127.0.0.1:"+port+"/internal/support";
  process.env.A1_SUPPORT_MOBI_SERVICE_KEY=serviceKey;process.env.A1_SUPPORT_MOBI_CSRF_KEY=csrfKey;
  process.env.A1_SUPPORT_MOBI_TENANTS_JSON=JSON.stringify({[tenant.id]:supportTenant});
 },60000);
 afterAll(async()=>{
  cookie.token=null;
  if(pilot)await pilot.close();
  if(provisioner)await provisioner.close();
  if(admin&&supportTenant){
   for(const table of ["audit_events","ticket_messages","tickets","support_provisioning_events","support_identity_links","tenant_memberships"])
    await admin.query("DELETE FROM "+table+" WHERE tenant_id=$1",[supportTenant]);
   await admin.query("DELETE FROM tenants WHERE id=$1",[supportTenant]);await admin.end();
  }
  if(user)await db.user.delete({where:{id:user.id}});
  if(branch)await db.branch.delete({where:{id:branch.id}});
  if(tenant)await db.tenant.delete({where:{id:tenant.id}});
  for(const k of flags){if(saved[k]===undefined)delete process.env[k];else process.env[k]=saved[k];}
  await db.$disconnect();
 },60000);
 it("loads the same-origin CSRF session and creates a Support ticket via the real route",async()=>{
  const csrfResponse=await get("session");
  expect(csrfResponse.status).toBe(200);
  const {csrfToken}=await csrfResponse.json() as {csrfToken:string};
  expect(csrfToken).toMatch(/^[\w-]{43}$/);
  expect((await post("tickets",{subject:"No CSRF",message:"Blocked"})).status).toBe(403);
  expect((await post("tickets",{subject:"Bad origin",message:"Blocked"},csrfToken,"https://evil.example")).status).toBe(403);
  const created=await post("tickets",{subject:"REAL Mobi test",message:"Private real session",
   role:"owner",tenantId:randomUUID(),verifiedSubject:"admin:forged"},csrfToken);
  expect(created.status).toBe(200);
  const ticket=await created.json() as {id:string};
  expect(ticket.id).toMatch(/^[0-9a-f-]{36}$/);
  const list=await get("tickets");
  expect(list.status).toBe(200);
  expect((await list.json() as Array<{id:string}>).map(x=>x.id)).toEqual([ticket.id]);
  const thread=await get("thread","?ticketId="+ticket.id);
  expect(thread.status).toBe(200);
  expect((await thread.json() as {messages:unknown[]}).messages).toHaveLength(1);
  expect((await post("reply",{ticketId:ticket.id,message:"My reply"},csrfToken)).status).toBe(200);
  expect((await (await get("thread","?ticketId="+ticket.id)).json() as {messages:unknown[]}).messages).toHaveLength(2);
 },60000);
 it("denies access after Support membership revocation, even with an active Mobi session",async()=>{
  await provisioner.changeMembership({appId:"a1-mobi",externalTenantId:tenant.id,
   actorSubject:actorSubject(),active:false});
  const response=await get("tickets");
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({error:"SUPPORT_UNAVAILABLE"});
 },60000);
 it("denies a revoked Mobi session, regardless of previous Support membership",async()=>{
  await db.session.update({where:{id:session.id},data:{revokedAt:new Date()}});
  expect((await get("tickets")).status).toBe(401);
  expect((await get("session")).status).toBe(401);
 },60000);
});
