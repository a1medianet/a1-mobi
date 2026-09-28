import {
  PaymentMethod,
  ProductType,
  RepairPartSource,
  RepairStatus,
  StockMovementType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { registerProduct } from "@/modules/inventory/inventory-service";
import {
  addRepairPart,
  advanceRepair,
  approveRepairEstimate,
  createRepairIntake,
  finalizeRepairFinancials,
  issueRepairWarranty,
  recordRepairPayment,
} from "@/modules/repairs/repair-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("repair database integration", () => {
  it("runs intake through delivery with stock part, payment, profit and warranty", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({ data: { slug: `repair-${suffix}`, name: "Stage 4 Test" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        email: `tech-${suffix}@example.test`,
        displayName: "Technician",
        passwordHash: "test-only",
      },
    });
    const category = await db.category.create({
      data: { tenantId: tenant.id, code: "PARTS", nameAr: "قطع", nameEn: "Parts" },
    });
    const part = await registerProduct({
      tenantId: tenant.id,
      actorId: user.id,
      categoryId: category.id,
      sku: `PART-${suffix}`,
      nameAr: "شاشة",
      nameEn: "Screen",
      type: ProductType.PART,
      isSerialized: false,
      barcodes: [`PART-BAR-${suffix}`],
    });
    await db.product.update({ where: { id: part.id }, data: { costAmount: 30 } });
    const location = await db.stockLocation.create({
      data: { tenantId: tenant.id, branchId: branch.id, code: "PARTS", name: "Parts Store" },
    });
    await db.stockMovement.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        productId: part.id,
        toLocationId: location.id,
        type: StockMovementType.PURCHASE_RECEIPT,
        quantity: 5,
        unitCost: 30,
        idempotencyKey: `part-stock-${suffix}`,
      },
    });

    let repair = await createRepairIntake({
      tenantId: tenant.id,
      branchId: branch.id,
      actorId: user.id,
      number: `REP-${suffix}`,
      customerName: "Ali",
      customerPhone: "+961 70 123 456",
      deviceDescription: "Samsung phone",
      imei: "490154203237518",
      condition: "Screen cracked",
      accessories: ["Case"],
      reportedIssue: "Broken display",
    });
    repair = await advanceRepair({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      repairOrderId: repair.id, toStatus: RepairStatus.DIAGNOSIS,
    });
    repair = await advanceRepair({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      repairOrderId: repair.id, toStatus: RepairStatus.ESTIMATE_PENDING,
      diagnosis: "Display assembly failed", estimateAmount: 120,
    });
    repair = await approveRepairEstimate({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      repairOrderId: repair.id, approved: true,
    });
    await addRepairPart({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      repairOrderId: repair.id, source: RepairPartSource.STOCK,
      description: "Replacement display", productId: part.id,
      stockLocationId: location.id, quantity: 1, unitCost: 30,
      idempotencyKey: `repair-part-${suffix}`,
    });
    repair = await advanceRepair({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      technicianId: user.id, repairOrderId: repair.id, toStatus: RepairStatus.IN_PROGRESS,
    });
    await recordRepairPayment({
      tenantId: tenant.id, branchId: branch.id, repairOrderId: repair.id,
      method: PaymentMethod.CASH, currency: "USD", amount: 50, exchangeRate: 1,
    });
    const truth = await finalizeRepairFinancials({
      tenantId: tenant.id, actorId: user.id, repairOrderId: repair.id,
      finalPrice: 120, laborCost: 20, directCost: 5,
    });
    repair = await advanceRepair({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      repairOrderId: repair.id, toStatus: RepairStatus.READY,
    });
    repair = await advanceRepair({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      repairOrderId: repair.id, toStatus: RepairStatus.DELIVERED,
    });
    const warranty = await issueRepairWarranty({
      tenantId: tenant.id, branchId: branch.id, repairOrderId: repair.id,
      number: `W-${suffix}`, days: 30, terms: "Display workmanship",
    });
    const timeline = await db.repairStatusEvent.findMany({
      where: { repairOrderId: repair.id },
      orderBy: { occurredAt: "asc" },
    });
    const partMovement = await db.stockMovement.findFirstOrThrow({
      where: { referenceType: "RepairPart", productId: part.id },
    });

    expect(repair.status).toBe("DELIVERED");
    expect(timeline.map((event) => event.toStatus)).toEqual([
      "INTAKE", "DIAGNOSIS", "ESTIMATE_PENDING", "APPROVED", "IN_PROGRESS", "READY", "DELIVERED",
    ]);
    expect(truth.partsCost).toBe(30);
    expect(truth.totalCost).toBe(55);
    expect(truth.profit).toBe(65);
    expect(truth.balanceDue).toBe(70);
    expect(partMovement.type).toBe("REPAIR_USE");
    expect(warranty.status).toBe("ACTIVE");
  }, 30_000);
});
