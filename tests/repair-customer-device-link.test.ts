import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeviceServiceContext } from "@prisma/client";

const m = vi.hoisted(() => ({
  tenant:vi.fn(), branch:vi.fn(), actor:vi.fn(), device:vi.fn(),
  customer:vi.fn(), upsertCustomer:vi.fn(), addDevice:vi.fn(),
  repair:vi.fn(), trust:vi.fn(), audit:vi.fn(), checkTrust:vi.fn(),
}));
vi.mock("@/modules/device-trust/workflow-guard",()=>({
  assertTrustCheckForWorkflow:m.checkTrust,
}));
vi.mock("@/server/db",()=>({db:{
  $transaction:async (fn:(tx:unknown)=>Promise<unknown>)=>fn({
    tenant:{findUniqueOrThrow:m.tenant},branch:{findUniqueOrThrow:m.branch},
    user:{findUniqueOrThrow:m.actor},serializedDevice:{findUniqueOrThrow:m.device},
    customer:{findFirst:m.customer,upsert:m.upsertCustomer},
    customerDevice:{upsert:m.addDevice},
    repairOrder:{create:m.repair},deviceTrustCheck:{update:m.trust},
    auditEvent:{create:m.audit},
  }),
}}));
import { createRepairIntake } from "@/modules/repairs/repair-service";

const base={tenantId:"t1",branchId:"b1",actorId:"a1",trustCheckId:"check-a",
  number:"REP-REAL-123",customerName:"Customer New",customerPhone:"+961 70 123 456",
  deviceDescription:"Samsung S24",imei:"356938035643809",
  condition:"Screen damaged",accessories:["Charger"],reportedIssue:"No display",
};
beforeEach(()=>{
  vi.clearAllMocks();
  m.tenant.mockResolvedValue({id:"t1",baseCurrency:"USD"});
  m.branch.mockResolvedValue({id:"b1",tenantId:"t1"});
  m.actor.mockResolvedValue({id:"a1",tenantId:"t1"});
  m.upsertCustomer.mockResolvedValue({id:"customer-new",tenantId:"t1",phone:"+961 70 123 456"});
  m.repair.mockResolvedValue({id:"repair-created",status:"INTAKE",number:base.number,imei:base.imei});
  m.addDevice.mockResolvedValue({id:"device-link"});
  m.trust.mockResolvedValue({id:"check-a"});
  m.audit.mockResolvedValue({id:"event-a"});
  m.checkTrust.mockResolvedValue(undefined);
});
describe("repair intake links customer and device atomically",()=>{
  it("uses normalized phone to attach existing or new tenant customer and device IMEI",async()=>{
    const item=await createRepairIntake(base);
    expect(item.id).toBe("repair-created");
    expect(m.checkTrust).toHaveBeenCalledWith(expect.anything(),expect.objectContaining({
      trustCheckId:"check-a",tenantId:"t1",branchId:"b1",context:DeviceServiceContext.REPAIR,
    }));
    expect(m.upsertCustomer).toHaveBeenCalledWith(expect.objectContaining({
      where:{tenantId_phoneNormalized:{tenantId:"t1",phoneNormalized:"+96170123456"}},
      create:expect.objectContaining({tenantId:"t1",createdBranchId:"b1",phoneNormalized:"+96170123456"}),
    }));
    expect(m.repair).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({customerId:"customer-new",tenantId:"t1",branchId:"b1"}),
    }));
    expect(m.addDevice).toHaveBeenCalledWith(expect.objectContaining({
      where:{customerId_imei:{customerId:"customer-new",imei:base.imei}},
    }));
  });
  it("rejects a customer ID belonging to another tenant before writing the repair",async()=>{
    m.customer.mockResolvedValue(null);
    await expect(createRepairIntake({...base,customerId:"foreign"})).rejects.toThrow("CUSTOMER_NOT_FOUND");
    expect(m.repair).not.toHaveBeenCalled();
    expect(m.upsertCustomer).not.toHaveBeenCalled();
  });
  it("rejects a selected customer whose phone does not match the intake",async()=>{
    m.customer.mockResolvedValue({id:"customer-existing",tenantId:"t1",phone:"00961 71 222 333"});
    await expect(createRepairIntake({...base,customerId:"customer-existing"})).rejects.toThrow("CUSTOMER_PHONE_MISMATCH");
    expect(m.repair).not.toHaveBeenCalled();
  });
  it("rejects a serialized device from another tenant",async()=>{
    m.device.mockResolvedValue({id:"serial-foreign",tenantId:"other",imei:base.imei});
    await expect(createRepairIntake({...base,serializedDeviceId:"serial-foreign"}))
      .rejects.toThrow("Cross-tenant repair intake");
    expect(m.upsertCustomer).not.toHaveBeenCalled();
    expect(m.repair).not.toHaveBeenCalled();
  });
  it("never links an explicitly selected serialized device to a different IMEI",async()=>{
    m.device.mockResolvedValue({id:"serial-a",tenantId:"t1",imei:"490154203237518"});
    await expect(createRepairIntake({...base,serializedDeviceId:"serial-a"}))
      .rejects.toThrow("DEVICE_IMEI_MISMATCH");
    expect(m.repair).not.toHaveBeenCalled();
  });
});
