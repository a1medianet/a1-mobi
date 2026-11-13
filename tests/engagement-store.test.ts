import {beforeEach,describe,expect,it,vi} from "vitest";
vi.mock("server-only",()=>({}));
vi.mock("@/server/db",()=>({db:{$transaction:vi.fn(),featureFlag:{findUnique:vi.fn()}}}));
import {db} from "@/server/db";
import {changeEngagement,listEngagement} from "@/modules/engagement/engagement-store";
import type {EngagementRecord} from "@/modules/engagement/engagement-store";
const base={tenantId:"tenant1",branchId:"branch1",actorId:"actor1"};
function setup(records:EngagementRecord[]=[]){
  const tx={
    featureFlag:{
      upsert:vi.fn().mockResolvedValue({id:"flag1"}),
      findUniqueOrThrow:vi.fn().mockResolvedValue({id:"flag1",config:{records}}),
      update:vi.fn().mockResolvedValue({}),
    },
    $queryRaw:vi.fn().mockResolvedValue([]),
    auditEvent:{create:vi.fn().mockResolvedValue({})},
  };
  vi.mocked(db.$transaction).mockImplementation((async(fn:unknown)=>
    (fn as (arg:typeof tx)=>Promise<unknown>)(tx)) as never);
  return tx;
}
describe("tenant and branch engagement",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("creates a saved follow-up without calling an external channel",async()=>{
    const tx=setup();
    const r=await changeEngagement({...base,action:"CREATE",type:"FOLLOWUP",
      title:"Contact customer",detail:"Check repair pickup",channel:"INTERNAL"});
    expect(r.status).toBe("OPEN");
    expect(r.branchId).toBe(base.branchId);
    expect(tx.featureFlag.update).toHaveBeenCalledOnce();
    expect(tx.auditEvent.create).toHaveBeenCalledOnce();
  });
  it("campaigns are draft-only",async()=>{
    setup();
    const r=await changeEngagement({...base,action:"CREATE",type:"CAMPAIGN",
      title:"Eid greeting",detail:"Approved greeting draft",channel:"WHATSAPP"});
    expect(r.status).toBe("DRAFT");
    expect(r.channel).toBe("WHATSAPP");
  });
  it("prevents cross-branch completion",async()=>{
    const tx=setup([{
      id:"f9b69d09-239f-490f-bc99-1ce7b6b9d0e4",branchId:"other",type:"FOLLOWUP",
      title:"A different branch",detail:"No cross-branch updates",status:"OPEN",
      createdAt:new Date().toISOString(),
    }]);
    await expect(changeEngagement({...base,action:"COMPLETE",type:"FOLLOWUP",
      id:"f9b69d09-239f-490f-bc99-1ce7b6b9d0e4"})).rejects.toThrow("FOLLOWUP_NOT_FOUND");
    expect(tx.featureFlag.update).not.toHaveBeenCalled();
  });
  it("lists only the requesting branch and type",async()=>{
    vi.mocked(db.featureFlag.findUnique).mockResolvedValue({config:{records:[
      {id:"a",branchId:"branch1",type:"FOLLOWUP",title:"One",detail:"A followup",status:"OPEN",createdAt:"2026-11-13"},
      {id:"b",branchId:"branch2",type:"FOLLOWUP",title:"Two",detail:"A followup",status:"OPEN",createdAt:"2026-11-13"},
      {id:"c",branchId:"branch1",type:"CAMPAIGN",title:"Three",detail:"A campaign",status:"DRAFT",createdAt:"2026-11-13"},
    ]}} as never);
    expect((await listEngagement({...base,type:"FOLLOWUP"})).map(x=>x.id)).toEqual(["a"]);
  });
});
