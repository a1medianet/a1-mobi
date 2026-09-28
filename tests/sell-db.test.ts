import { DeviceServiceContext, PaymentMethod, ProductType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { checkDeviceTrust } from "@/modules/device-trust/device-trust-service";
import { receiveSerializedDevice, registerProduct } from "@/modules/inventory/inventory-service";
import { checkoutSale } from "@/modules/sell/sell-service";
import { postSaleReturn } from "@/modules/sell/return-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("sell database integration", () => {
  it("checks out an IMEI with mixed currency, invoice, stock and audit", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({
      data: { slug: `sell-${suffix}`, name: "Stage 3 Test" },
    });
    const branch = await db.branch.create({
      data: { tenantId: tenant.id, code: "MAIN", name: "Main" },
    });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: `cashier-${suffix}@example.test`,
        displayName: "Cashier",
        passwordHash: "test-only",
      },
    });
    const category = await db.category.create({
      data: { tenantId: tenant.id, code: "PHONES", nameAr: "هواتف", nameEn: "Phones" },
    });
    const product = await registerProduct({
      tenantId: tenant.id,
      actorId: user.id,
      categoryId: category.id,
      sku: `PHONE-${suffix}`,
      nameAr: "هاتف بيع",
      nameEn: "Sale Phone",
      type: ProductType.DEVICE,
      isSerialized: true,
      barcodes: [`SELL-${suffix}`],
    });
    await db.product.update({
      where: { id: product.id },
      data: { costAmount: 400, basePrice: 600, minimumPrice: 450 },
    });
    const manufacturer = await db.manufacturer.create({
      data: { tenantId: tenant.id, code: `M-${suffix}`, name: "Test" },
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
      data: { tenantId: tenant.id, branchId: branch.id, code: "SHOP", name: "Shop" },
    });
    const stockTrustCheck = await checkDeviceTrust({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      context: DeviceServiceContext.STOCK_IN, devicePresent: true, imei: "352099001761481",
    });
    const device = await receiveSerializedDevice({
      tenantId: tenant.id,
      trustCheckId: stockTrustCheck.id,
      branchId: branch.id,
      actorId: user.id,
      productId: product.id,
      variantId: variant.id,
      stockLocationId: location.id,
      imei: "352099001761481",
      unitCost: 400,
      idempotencyKey: `receive-sell-${suffix}`,
    });

    const saleTrustCheck = await checkDeviceTrust({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      context: DeviceServiceContext.SALE, devicePresent: true, imei: "352099001761481",
    });
    const input = {
      tenantId: tenant.id,
      branchId: branch.id,
      actorId: user.id,
      number: `S-${suffix}`,
      invoiceNumber: `INV-${suffix}`,
      idempotencyKey: `checkout-${suffix}`,
      lines: [{
        productId: product.id,
        stockLocationId: location.id,
        serializedDeviceId: device.id,
        trustCheckId: saleTrustCheck.id,
        quantity: 1,
        finalPrice: 500,
      }],
      payments: [
        { method: PaymentMethod.CASH, currency: "USD", amount: 300, exchangeRate: 1 },
        { method: PaymentMethod.CASH, currency: "LBP", amount: 17_900_000, exchangeRate: 89_500 },
      ],
    };

    const sale = await checkoutSale(input);
    const replay = await checkoutSale(input);
    const soldDevice = await db.serializedDevice.findUniqueOrThrow({ where: { id: device.id } });
    const movement = await db.stockMovement.findFirstOrThrow({
      where: { referenceType: "Sale", referenceId: sale.id },
    });
    const audit = await db.auditEvent.findFirstOrThrow({
      where: { entityType: "Sale", entityId: sale.id, action: "sale.checkout" },
    });

    expect(sale.id).toBe(replay.id);
    expect(sale.status).toBe("COMPLETED");
    expect(sale.total.toNumber()).toBe(500);
    expect(sale.paidTotal.toNumber()).toBe(500);
    expect(sale.balanceDue.toNumber()).toBe(0);
    expect(sale.payments).toHaveLength(2);
    expect(sale.invoice?.number).toBe(`INV-${suffix}`);
    expect(soldDevice.status).toBe("SOLD");
    expect(soldDevice.stockLocationId).toBeNull();
    expect(movement.type).toBe("SALE");
    expect(audit.after).toMatchObject({ status: "COMPLETED" });

    const returnTrustCheck = await checkDeviceTrust({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      context: DeviceServiceContext.RETURN, devicePresent: true, imei: "352099001761481",
    });
    const saleReturn = await postSaleReturn({
      tenantId: tenant.id,
      branchId: branch.id,
      actorId: user.id,
      saleId: sale.id,
      number: `R-${suffix}`,
      reason: "Customer changed mind",
      idempotencyKey: `return-${suffix}`,
      lines: [{
        originalSaleLineId: sale.lines[0].id,
        trustCheckId: returnTrustCheck.id,
        quantity: 1,
        stockLocationId: location.id,
      }],
    });
    const returnedDevice = await db.serializedDevice.findUniqueOrThrow({ where: { id: device.id } });
    const returnedSale = await db.sale.findUniqueOrThrow({ where: { id: sale.id } });
    expect(saleReturn.refundBase.toNumber()).toBe(500);
    expect(returnedDevice.status).toBe("RETURNED");
    expect(returnedDevice.stockLocationId).toBe(location.id);
    expect(returnedSale.status).toBe("RETURNED");
  }, 30_000);
});
