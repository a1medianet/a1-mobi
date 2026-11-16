import {beforeEach,afterEach,describe,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({
 currentStoreContext:vi.fn(),sameOriginMutation:vi.fn(),readAuthJson:vi.fn(),
 supportLocalConfigFromEnv:vi.fn(),supportCsrfToken:vi.fn(),verifySupportCsrf:vi.fn(),invokeLocalMobiSupport:vi.fn(),
}));
vi.mock("@/server/auth-http",()=>({
 currentStoreContext:mocks.currentStoreContext,
 sameOriginMutation:mocks.sameOriginMutation,
 authJson:(body:unknown,status=200)=>Response.json(body,{status})
}));
vi.mock("@/core/auth/request",()=>({readAuthJson:mocks.readAuthJson}));
vi.mock("@/core/support-local-contract",()=>({
 supportLocalConfigFromEnv:mocks.supportLocalConfigFromEnv,
 supportCsrfToken:mocks.supportCsrfToken,
 verifySupportCsrf:mocks.verifySupportCsrf,
 invokeLocalMobiSupport:mocks.invokeLocalMobiSupport,
}));
import {GET,POST} from "@/app/api/a1-support/[operation]/route";
const actor={sessionId:"c"+"a".repeat(24),tenantId:"c"+"b".repeat(24),actorId:"c"+"d".repeat(24)};
const flags=["A1_MOBI_SUPPORT_FEATURE","A1_MOBI_SUPPORT_API_ACCEPTED"] as const;
const envBackup=Object.fromEntries(flags.map(k=>[k,process.env[k]]));
const params=(operation:string)=>({params:Promise.resolve({operation})});
function enable(){process.env.A1_MOBI_SUPPORT_FEATURE="enabled";process.env.A1_MOBI_SUPPORT_API_ACCEPTED="true";}
beforeEach(()=>{
 vi.clearAllMocks();mocks.currentStoreContext.mockResolvedValue(actor);
 mocks.sameOriginMutation.mockReturnValue(true);
 mocks.supportLocalConfigFromEnv.mockReturnValue({csrfKey:"fixture"});
 mocks.supportCsrfToken.mockReturnValue("fixture-token");
 mocks.verifySupportCsrf.mockReturnValue(true);
 mocks.invokeLocalMobiSupport.mockResolvedValue([{id:"support-ticket"}]);
 mocks.readAuthJson.mockResolvedValue({subject:"Issue",message:"Details",category:"support"});
});
afterEach(()=>{for(const k of flags){if(envBackup[k]===undefined)delete process.env[k];else process.env[k]=envBackup[k];}});
describe("Mobi Support same-origin pilot routes",()=>{
 it("requires both flags and does not touch session when disabled",async()=>{
  delete process.env.A1_MOBI_SUPPORT_FEATURE;delete process.env.A1_MOBI_SUPPORT_API_ACCEPTED;
  const response=await GET(new Request("http://127.0.0.1/api/a1-support/tickets"),params("tickets"));
  expect(response.status).toBe(404);
  expect(mocks.currentStoreContext).not.toHaveBeenCalled();
 });
 it("requires a verified current Mobi session",async()=>{
  enable();mocks.currentStoreContext.mockResolvedValue(null);
  expect((await GET(new Request("http://127.0.0.1/api/a1-support/tickets"),params("tickets"))).status).toBe(401);
 });
 it("returns server-issued CSRF token and never a service signing key",async()=>{
  enable();
  const response=await GET(new Request("http://127.0.0.1/api/a1-support/session"),params("session"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({csrfToken:"fixture-token"});
  expect(mocks.invokeLocalMobiSupport).not.toHaveBeenCalled();
 });
 it("denies unsafe mutations before contacting Support",async()=>{
  enable();mocks.sameOriginMutation.mockReturnValue(false);
  const request=new Request("http://127.0.0.1/api/a1-support/tickets",{method:"POST",body:"{}"});
  expect((await POST(request,params("tickets"))).status).toBe(403);
  expect(mocks.invokeLocalMobiSupport).not.toHaveBeenCalled();
 });
 it("requires verified CSRF and obtains actor exclusively from server session",async()=>{
  enable();mocks.verifySupportCsrf.mockReturnValue(false);
  const request=new Request("http://127.0.0.1/api/a1-support/tickets",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
  expect((await POST(request,params("tickets"))).status).toBe(403);
  expect(mocks.invokeLocalMobiSupport).not.toHaveBeenCalled();
  mocks.verifySupportCsrf.mockReturnValue(true);
  const response=await POST(new Request("http://127.0.0.1/api/a1-support/tickets",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}),params("tickets"));
  expect(response.status).toBe(200);
  expect(mocks.invokeLocalMobiSupport).toHaveBeenCalledWith({csrfKey:"fixture"},actor,"createTicket",{subject:"Issue",message:"Details",category:"support"});
 });
 it("denies unsupported actions",async()=>{
  enable();
  expect((await GET(new Request("http://127.0.0.1/api/a1-support/admin"),params("admin"))).status).toBe(404);
 });
});
