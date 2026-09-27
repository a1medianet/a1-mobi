import { ProductType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import {
  receiveSerializedDevice,
  registerProduct,
} from "@/modules/inventory/inventory-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("inventory database integration", () => {
  it("receives one IMEI with movement and audit", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({
      data: { slug: `test-${suffix}`, name: "Stage 2 Test" },
    });
    const branch = await db.branch.create({
      data: { tenantId: tenant.id, code: "MAIN", name: "Main" },
    });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: `owner-${suffix}@example.test`,
        displayName: "Owner",
        passwordHash: "test-only",
      },
    });
    const category = await db.category.create({
      data: {
        tenantId: tenant.id, code: "PHONES",
        nameAr: "هواتف", nameEn: "Phones",
      },
    });
    const product = await registerProduct({
      tenantId: tenant.id,
      actorId: user.id,
      categoryId: category.id,
      sku: `PHONE-${suffix}`,
      nameAr: "هاتف تجريبي",
      nameEn: "Test Phone",
      type: ProductType.DEVICE,
      isSerialized: true,
      barcodes: [`A1-${suffix}`],
    });
    const manufacturer = await db.manufacturer.create({
      data: { tenantId: tenant.id, code: "TEST", name: "Test" },
    });
    const family = await db.deviceFamily.create({
      data: { tenantId: tenant.id, manufacturerId: manufacturer.id, name: "Family" },
    });
    const model = await db.deviceModel.create({
      data: { tenantId: tenant.id, familyId: family.id, name: "Model" },
    });
    const variant = await db.deviceVariant.create({
      data: { tenantId: tenant.id, modelId: model.id, name: "256 GB" },
    });
    const location = await db.stockLocation.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        code: "MAIN-STOCK", name: "Main Stock",
      },
    });
    const device = await receiveSerializedDevice({
      tenantId: tenant.id,
      branchId: branch.id,
      actorId: user.id,
      productId: product.id,
      variantId: variant.id,
      stockLocationId: location.id,
      imei: "490154203237518",
      unitCost: 500,
      idempotencyKey: `receive-${suffix}`,
    });
    const movement = await db.stockMovement.findFirst({
      where: { serializedDeviceId: device.id },
    });
    const audit = await db.auditEvent.findFirst({
      where: {
        tenantId: tenant.id,
        entityType: "SerializedDevice",
        entityId: device.id,
      },
    });
    expect(device.status).toBe("IN_STOCK");
    expect(movement?.quantity.toNumber()).toBe(1);
    expect(audit?.action).toBe("inventory.serialized-device.received");
  }, 20_000);
});