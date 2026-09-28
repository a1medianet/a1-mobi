import {
  DeviceIncidentStatus, DeviceIncidentVisibility, DeviceServiceContext, DeviceTrustResult,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  checkDeviceTrust, overrideDeviceTrustBlock, reportDeviceIncident,
} from "@/modules/device-trust/device-trust-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("device trust network integration", () => {
  it("matches a network report across stores and audits a permissioned override", async () => {
    const suffix = Date.now().toString();
    const permission = await db.permission.upsert({
      where: { code: "device-trust.override" },
      update: {}, create: { code: "device-trust.override", description: "Override trust hold" },
    });
    const ownerTenant = await db.tenant.create({
      data: { slug: `trust-owner-${suffix}`, name: "Reporting Store" },
    });
    const ownerBranch = await db.branch.create({
      data: { tenantId: ownerTenant.id, code: "MAIN", name: "Main" },
    });
    const reporter = await db.user.create({ data: {
      tenantId: ownerTenant.id, branchId: ownerBranch.id,
      email: `reporter-${suffix}@test.local`, displayName: "Reporter", passwordHash: "test",
    } });
    const storeTenant = await db.tenant.create({
      data: { slug: `trust-store-${suffix}`, name: "Checking Store" },
    });
    const storeBranch = await db.branch.create({
      data: { tenantId: storeTenant.id, code: "MAIN", name: "Main" },
    });
    const manager = await db.user.create({ data: {
      tenantId: storeTenant.id, branchId: storeBranch.id,
      email: `manager-${suffix}@test.local`, displayName: "Manager", passwordHash: "test",
    } });
    const role = await db.role.create({ data: {
      tenantId: storeTenant.id, code: "MANAGER", name: "Manager",
      permissions: { create: { permissionId: permission.id } },
      userRoles: { create: { userId: manager.id } },
    } });
    expect(role.code).toBe("MANAGER");
    const report = await reportDeviceIncident({
      tenantId: ownerTenant.id, reporterId: reporter.id, imei: "490154203237518",
      status: DeviceIncidentStatus.VERIFIED_OWNER,
      visibility: DeviceIncidentVisibility.NETWORK, evidenceReference: "invoice:test",
    });
    const check = await checkDeviceTrust({
      tenantId: storeTenant.id, branchId: storeBranch.id, actorId: manager.id,
      context: DeviceServiceContext.REPAIR, devicePresent: true, imei: "490154203237518",
      referenceType: "RepairIntake", referenceId: "pending",
    });
    expect(check.result).toBe(DeviceTrustResult.MATCH);
    expect(check.blocked).toBe(true);
    expect(check.matchedReportId).toBe(report.id);

    const override = await overrideDeviceTrustBlock({
      tenantId: storeTenant.id, checkId: check.id, overrideActorId: manager.id,
      reason: "Police authorized documented intake",
    });
    expect(override.blocked).toBe(false);
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityId: check.id, action: "device-trust.block.overridden" },
    });
    expect(audit.reason).toContain("Police");
    const remoteTopup = await checkDeviceTrust({
      tenantId: storeTenant.id, branchId: storeBranch.id, actorId: manager.id,
      context: DeviceServiceContext.TOPUP_PRESENT, devicePresent: false,
      referenceType: "TopUpTransaction", referenceId: "remote",
    });
    expect(remoteTopup.result).toBe(DeviceTrustResult.NOT_PRESENT);
    await expect(checkDeviceTrust({
      tenantId: storeTenant.id, branchId: storeBranch.id, actorId: manager.id,
      context: DeviceServiceContext.REPAIR, devicePresent: true,
    })).rejects.toThrow(/required/);
  }, 30_000);
});
