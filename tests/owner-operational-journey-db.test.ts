import { DeviceServiceContext, PaymentMethod, ProductType, RepairStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { bootstrapStore } from "@/server/bootstrap-service";
import { loginToStore } from "@/server/auth-service";
import { checkDeviceTrust } from "@/modules/device-trust/device-trust-service";
import { receiveSerializedDevice, registerProduct } from "@/modules/inventory/inventory-service";
import { checkoutSale } from "@/modules/sell/sell-service";
import {
  advanceRepair,
  approveRepairEstimate,
  createRepairIntake,
  finalizeRepairFinancials,
  recordRepairPayment,
} from "@/modules/repairs/repair-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("owner operational journey", () => {
  it("creates a store, signs in, receives an IMEI device, sells it, and completes a repair", async () => {
    const suffix = Date.now().toString();
    const tenantSlug = "journey-" + suffix;
    const ownerEmail = "owner-" + suffix + "@example.test";
    const ownerPassword = "Journey-owner-password-" + suffix;

    const provisioned = await bootstrapStore({
      tenantSlug,
      tenantName: "Journey Store",
      branchCode: "MAIN",
      branchName: "Main Branch",
      ownerEmail,
      ownerDisplayName: "Journey Owner",
      ownerPassword,
      locale: "ar",
    });

    const login = await loginToStore(tenantSlug, ownerEmail, ownerPassword);
    expect(login.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const owner = await db.user.findUniqueOrThrow({ where: { id: provisioned.ownerId } });
    const ownerRoles = await db.userRole.findMany({
      where: { userId: owner.id },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const permissions = new Set(ownerRoles.flatMap(item => item.role.permissions.map(grant => grant.permission.code)));
    expect(permissions.has("sell.create")).toBe(true);
    expect(permissions.has("inventory.receive")).toBe(true);
    expect(permissions.has("repairs.manage")).toBe(true);

    const category = await db.category.create({
      data: { tenantId: provisioned.tenantId, code: "PHONES", nameAr: "هواتف", nameEn: "Phones" },
    });
    const product = await registerProduct({
      tenantId: provisioned.tenantId,
      actorId: owner.id,
      categoryId: category.id,
      sku: "JOURNEY-" + suffix,
      nameAr: "هاتف رحلة المالك",
      nameEn: "Owner journey phone",
      type: ProductType.DEVICE,
      isSerialized: true,
      barcodes: ["J-" + suffix],
    });
    await db.product.update({
      where: { id: product.id },
      data: { costAmount: 400, basePrice: 600, minimumPrice: 450 },
    });

    const manufacturer = await db.manufacturer.create({
      data: { tenantId: provisioned.tenantId, code: "J-" + suffix, name: "Journey" },
    });
    const family = await db.deviceFamily.create({
      data: { tenantId: provisioned.tenantId, manufacturerId: manufacturer.id, name: "Journey Family" },
    });
    const model = await db.deviceModel.create({
      data: { tenantId: provisioned.tenantId, familyId: family.id, name: "Journey Model" },
    });
    const variant = await db.deviceVariant.create({
      data: { tenantId: provisioned.tenantId, modelId: model.id, name: "256 GB" },
    });
    const location = await db.stockLocation.create({
      data: { tenantId: provisioned.tenantId, branchId: provisioned.branchId, code: "SHOP", name: "Shop" },
    });

    const stockTrust = await checkDeviceTrust({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      context: DeviceServiceContext.STOCK_IN,
      devicePresent: true,
      imei: "352099001761481",
    });
    const device = await receiveSerializedDevice({
      tenantId: provisioned.tenantId,
      trustCheckId: stockTrust.id,
      branchId: provisioned.branchId,
      actorId: owner.id,
      productId: product.id,
      variantId: variant.id,
      stockLocationId: location.id,
      imei: "352099001761481",
      unitCost: 400,
      idempotencyKey: "receive-" + suffix,
    });
    expect(device.status).toBe("IN_STOCK");

    const saleTrust = await checkDeviceTrust({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      context: DeviceServiceContext.SALE,
      devicePresent: true,
      imei: "352099001761481",
    });
    const sale = await checkoutSale({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      number: "S-" + suffix,
      invoiceNumber: "INV-" + suffix,
      idempotencyKey: "sale-" + suffix,
      lines: [{
        productId: product.id,
        stockLocationId: location.id,
        serializedDeviceId: device.id,
        trustCheckId: saleTrust.id,
        quantity: 1,
        finalPrice: 500,
      }],
      payments: [{ method: PaymentMethod.CASH, currency: "USD", amount: 500, exchangeRate: 1 }],
    });
    expect(sale.status).toBe("COMPLETED");
    expect(sale.balanceDue.toNumber()).toBe(0);

    const repairTrust = await checkDeviceTrust({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      context: DeviceServiceContext.REPAIR,
      devicePresent: true,
      imei: "356938035643809",
    });
    let repair = await createRepairIntake({
      tenantId: provisioned.tenantId,
      trustCheckId: repairTrust.id,
      branchId: provisioned.branchId,
      actorId: owner.id,
      number: "REP-" + suffix,
      customerName: "Journey Customer",
      customerPhone: "+961 70 000 777",
      deviceDescription: "Test smartphone",
      imei: "356938035643809",
      condition: "Used device",
      accessories: ["Case"],
      reportedIssue: "Battery drains quickly",
    });
    repair = await advanceRepair({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      repairOrderId: repair.id,
      toStatus: RepairStatus.DIAGNOSIS,
    });
    repair = await advanceRepair({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      repairOrderId: repair.id,
      toStatus: RepairStatus.ESTIMATE_PENDING,
      diagnosis: "Battery replacement recommended",
      estimateAmount: 80,
    });
    repair = await approveRepairEstimate({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      repairOrderId: repair.id,
      approved: true,
    });
    repair = await advanceRepair({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      technicianId: owner.id,
      repairOrderId: repair.id,
      toStatus: RepairStatus.IN_PROGRESS,
    });
    await recordRepairPayment({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      repairOrderId: repair.id,
      method: PaymentMethod.CASH,
      currency: "USD",
      amount: 80,
      exchangeRate: 1,
    });
    const repairTruth = await finalizeRepairFinancials({
      tenantId: provisioned.tenantId,
      actorId: owner.id,
      repairOrderId: repair.id,
      finalPrice: 80,
      laborCost: 10,
      directCost: 5,
    });
    expect(repairTruth.balanceDue).toBe(0);
    repair = await advanceRepair({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      repairOrderId: repair.id,
      toStatus: RepairStatus.READY,
    });
    repair = await advanceRepair({
      tenantId: provisioned.tenantId,
      branchId: provisioned.branchId,
      actorId: owner.id,
      repairOrderId: repair.id,
      toStatus: RepairStatus.DELIVERED,
    });
    expect(repair.status).toBe("DELIVERED");

    const auditCount = await db.auditEvent.count({
      where: { tenantId: provisioned.tenantId },
    });
    expect(auditCount).toBeGreaterThanOrEqual(5);
  }, 60_000);
});
