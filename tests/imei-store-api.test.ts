import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
const m=vi.hoisted(()=>({
 context:vi.fn(),origin:vi.fn(),inventory:vi.fn(),deviceLinks:vi.fn(),incidents:vi.fn(),
 customer:vi.fn(),audit:vi.fn(),create:vi.fn(),update:vi.fn(),transact:vi.fn(),identity:vi.fn(),
}));
vi.mock("@/server/auth-http",()=>({
 currentStoreContext:m.context,sameOriginMutation:m.origin,
 authJson:(value:unknown,status=200)=>new Response(JSON.stringify(value),{status}),
}));
vi.mock("@/modules/device-trust/device-trust-service",()=>({imeiIdentity:m.identity}));
vi.mock("@/server/db",()=>({db:{
 serializedDevice:{findMany:m.inventory},customerDevice:{findMany:m.deviceLinks},
 customer:{findFirst:m.customer},
 deviceIncidentReport:{findMany:m.incidents},
 auditEvent:{create:m.audit},$transaction:m.transact,
}}));
import {POST} from "@/app/api/ops/imei/route";
function req(body:unknown){return new Request("https://mobi.a1medianet.com/api/ops/imei",{
 method:"POST",headers:{"content-type":"application/json",origin:"https://mobi.a1medianet.com"},
 body:JSON.stringify(body),
});}
const imei="490154203237518";
beforeEach(()=>{
 vi.clearAllMocks();vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","1");
 m.origin.mockReturnValue(true);
 m.context.mockResolvedValue({tenantId:"t",branchId:"b",actorId:"u",permissions:new Set(["customers.read"])});
 m.identity.mockReturnValue({hash:"hash",last4:"7518"});
 m.inventory.mockResolvedValue([]);
 m.deviceLinks.mockResolvedValue([]);
 m.incidents.mockResolvedValue([]);
 m.audit.mockResolvedValue({});
 m.customer.mockResolvedValue({id:"c",name:"Customer"});
 m.create.mockResolvedValue({id:"r",status:"EVIDENCE_PENDING"});
 m.update.mockResolvedValue({count:1});
 m.transact.mockImplementation((fn:(tx:unknown)=>Promise<unknown>)=>fn({
  deviceIncidentReport:{findFirst:m.incidents,create:m.create,updateMany:m.update},
  auditEvent:{create:m.audit},
 }));
});
afterEach(()=>vi.unstubAllEnvs());
describe("IMEI branch search and private lost reports",()=>{
 it("requires authenticated permission and refuses cross-origin writes",async()=>{
   m.context.mockRejectedValue(new Error("AUTH_REQUIRED"));
   expect((await POST(req({action:"lookup",imei}))).status).toBe(401);
   m.origin.mockReturnValue(false);
   expect((await POST(req({action:"lookup",imei}))).status).toBe(403);
   expect(m.inventory).not.toHaveBeenCalled();
 });
 it("searches only current branch and never claims external registry coverage",async()=>{
   const res=await POST(req({action:"lookup",imei}));
   expect(res.status).toBe(200);
   expect(await res.json()).toMatchObject({externalRegistryChecked:false});
   expect(m.inventory).toHaveBeenCalledWith(expect.objectContaining({
     where:expect.objectContaining({tenantId:"t",imei,
       stockLocation:{tenantId:"t",branchId:"b"}}),
   }));
   expect(m.deviceLinks).toHaveBeenCalledWith(expect.objectContaining({
     where:expect.objectContaining({tenantId:"t",imei,
       customer:{tenantId:"t",createdBranchId:"b"}}),
   }));
 });
 it("does not disclose customer links without customers.read",async()=>{
   m.context.mockResolvedValue({tenantId:"t",branchId:"b",actorId:"u",permissions:new Set()});
   expect((await POST(req({action:"lookup",imei}))).status).toBe(200);
   expect(m.deviceLinks).not.toHaveBeenCalled();
 });
 it("requires existing branch customer before accepting missing-device claim",async()=>{
   m.customer.mockResolvedValue(null);
   const res=await POST(req({action:"reportLoss",imei,customerPhone:"70123456",
      evidenceReference:"Invoice 00024",kind:"LOST",confirmed:true}));
   expect(res.status).toBe(404);
   expect(m.create).not.toHaveBeenCalled();
 });
 it("submits proof-pending store-only report, linked by customer reference",async()=>{
   m.incidents.mockResolvedValue(null);
   const res=await POST(req({action:"reportLoss",imei,customerPhone:"70123456",
      evidenceReference:"Invoice 00024",kind:"STOLEN",confirmed:true}));
   expect(res.status).toBe(201);
   expect(await res.json()).toMatchObject({verified:false,externalRegistryNotified:false,visibility:"STORE_ONLY"});
   expect(m.create).toHaveBeenCalledWith({data:expect.objectContaining({
     status:"EVIDENCE_PENDING",visibility:"STORE_ONLY",ownerContactRef:"c",imeiHash:"hash",imeiLast4:"7518",
   })});
   expect(m.audit).toHaveBeenCalledWith({data:expect.objectContaining({
     tenantId:"t",branchId:"b",actorId:"u",action:"device.lost_report.submitted_for_review",
   })});
 });
 it("requires explicit consent and reasonable proof reference",async()=>{
   const res=await POST(req({action:"reportLoss",imei,customerPhone:"70123456",
     evidenceReference:"x",kind:"LOST",confirmed:true}));
   expect(res.status).toBe(400);
   expect(m.create).not.toHaveBeenCalled();
 });
 it("returns conflict for duplicate active reports instead of multiplying claims",async()=>{
   m.incidents.mockResolvedValue({id:"existing",status:"EVIDENCE_PENDING"});
   const res=await POST(req({action:"reportLoss",imei,customerPhone:"70123456",
     evidenceReference:"Invoice 00024",kind:"LOST",confirmed:true}));
   expect(res.status).toBe(409);
   expect(m.create).not.toHaveBeenCalled();
 });
 it("can close a previously reported device with audit",async()=>{
   m.incidents.mockResolvedValue({id:"report-1",imeiLast4:"7518",status:"EVIDENCE_PENDING"});
   const res=await POST(req({action:"closeReport",reportId:"report-1",reason:"Device recovered",
     confirmed:true}));
   expect(res.status).toBe(200);
   expect(m.update).toHaveBeenCalledWith(expect.objectContaining({
     where:{id:"report-1",tenantId:"t",status:"EVIDENCE_PENDING"},
     data:expect.objectContaining({status:"CLOSED"}),
   }));
 });
});
