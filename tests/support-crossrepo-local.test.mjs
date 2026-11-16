// A1Hub cross-project acceptance: requires adjacent a1-support and its isolated test DB.
// Uses simulated verified Mobi session (NOT a real user cookie or production route).
import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {createRequire} from "node:module";
import {supportLocalConfigFromEnv,invokeLocalMobiSupport} from "../src/core/support-local-contract.ts";
import {createLocalProvisioner} from "../../a1-support/src/provisioning.mjs";
import {createLocalRegistryResolver} from "../../a1-support/src/registry-resolver.mjs";
import {createLocalSupportTransport} from "../../a1-support/src/local-service-transport.mjs";
import {createServiceVerifier} from "../../a1-support/src/service-envelope.mjs";
import {createAuthorizedSupport} from "../../a1-support/src/authorized.mjs";
const require=createRequire(new URL("../../a1-support/package.json",import.meta.url));
const pg=require("pg");
const db=process.env.A1_SUPPORT_TEST_DATABASE_URL;
(db?test:test.skip)("real Mobi local signer -> signed HTTP -> Support identity registry -> RLS PostgreSQL",async()=>{
 process.env.A1_SUPPORT_LOCAL_PROVISIONING="enabled";
 process.env.A1_SUPPORT_LOCAL_TRANSPORT="enabled";
 const uuid=randomUUID(),mobiTenant="c"+"e".repeat(24),mobiActor="c"+"f".repeat(24),session="c"+"d".repeat(24);
 const operator="a1:local-operator",key="local-real-mobi-test-key-0123456789abcdef",csrfKey="local-real-mobi-csrf-key-0123456789abcdef";
 const admin=new pg.Client({connectionString:db});await admin.connect();
 const provisioner=createLocalProvisioner({connectionString:db,operatorSubject:operator});
 const registry=createLocalRegistryResolver({connectionString:db});
 const store=createAuthorizedSupport({connectionString:db});
 const transport=createLocalSupportTransport({
  verifiers:new Map([["a1-mobi",createServiceVerifier({key,issuer:"a1-mobi",audience:"a1-support"})]]),
  resolveActor:registry.resolveActor,supportAdapter:store
 });
 try{
  await admin.query("INSERT INTO tenants(id,app_id,external_tenant_id,slug) VALUES($1,$2,$3,$4)",[uuid,"a1-mobi",mobiTenant,"g28-"+uuid.slice(0,12)]);
  await provisioner.linkIdentity({appId:"a1-mobi",externalTenantId:mobiTenant,externalSubject:mobiActor,actorSubject:"mobi:"+mobiActor});
  await provisioner.changeMembership({appId:"a1-mobi",externalTenantId:mobiTenant,actorSubject:"mobi:"+mobiActor,role:"requester",active:true});
  await new Promise(resolve=>transport.server.listen(0,"127.0.0.1",resolve));
  const config=supportLocalConfigFromEnv({
   A1_SUPPORT_LOCAL_ENDPOINT:"http://127.0.0.1:"+transport.server.address().port+"/internal/support",
   A1_SUPPORT_MOBI_SERVICE_KEY:key,A1_SUPPORT_MOBI_CSRF_KEY:csrfKey,
   A1_SUPPORT_MOBI_TENANTS_JSON:JSON.stringify({[mobiTenant]:uuid})
  });
  const identity={sessionId:session,tenantId:mobiTenant,actorId:mobiActor};
  const ticket=await invokeLocalMobiSupport(config,identity,"createTicket",{subject:"Mobi cross-repo",message:"Private local"});
  assert.ok(ticket.id);
  const list=await invokeLocalMobiSupport(config,identity,"listTickets",{});
  assert.deepEqual(list.map(x=>x.id),[ticket.id]);
  const thread=await invokeLocalMobiSupport(config,identity,"getThread",{ticketId:ticket.id});
  assert.equal(thread.messages.length,1);
  await provisioner.changeMembership({appId:"a1-mobi",externalTenantId:mobiTenant,actorSubject:"mobi:"+mobiActor,active:false});
  await assert.rejects(invokeLocalMobiSupport(config,identity,"listTickets",{}),/SUPPORT_LOCAL_DENIED/);
 }finally{
  if(transport.server.listening)await transport.close();
  await store.close();await registry.close();await provisioner.close();
  for(const table of ["audit_events","ticket_messages","tickets","support_provisioning_events","support_identity_links","tenant_memberships"])
   await admin.query("DELETE FROM "+table+" WHERE tenant_id=$1",[uuid]);
  await admin.query("DELETE FROM tenants WHERE id=$1",[uuid]);
  await admin.end();
  delete process.env.A1_SUPPORT_LOCAL_PROVISIONING;delete process.env.A1_SUPPORT_LOCAL_TRANSPORT;
 }
});
