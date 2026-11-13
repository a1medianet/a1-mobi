import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { importProductsCsv } from "@/modules/reports/product-import";

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
const header = "category_code,sku,name_ar,name_en,type,barcode,cost,base_price,minimum_price,low_stock,serialized";

describeDb("catalog import barcode integrity on local database", () => {
  it("rolls back duplicate-barcode imports without reassigning a prior product", async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tenant = await db.tenant.create({ data: { slug: `import-${suffix}`, name: "Synthetic import UAT" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const owner = await db.user.create({ data: {
      tenantId: tenant.id, branchId: branch.id, email: `import-${suffix}@example.test`,
      displayName: "Synthetic owner", passwordHash: "not-a-login",
    } });
    const csv = (sku: string, barcode: string) =>
      [header, `ACCESSORY,${sku},غطاء,Case,ACCESSORY,${barcode},2,5,3,2,false`].join("\n");
    const first = await importProductsCsv({ tenantId: tenant.id, actorId: owner.id, csv: csv("CASE001", "BARCODE001") });
    expect(first).toEqual({ created: 1, updated: 0, total: 1 });
    const original = await db.product.findUniqueOrThrow({
      where: { tenantId_sku: { tenantId: tenant.id, sku: "CASE001" } },
    });
    await expect(importProductsCsv({ tenantId: tenant.id, actorId: owner.id, csv: csv("CASE002", "BARCODE001") }))
      .rejects.toThrow("Barcode already belongs to another product");
    expect(await db.product.count({ where: { tenantId: tenant.id } })).toBe(1);
    const barcode = await db.barcode.findUniqueOrThrow({
      where: { tenantId_value: { tenantId: tenant.id, value: "BARCODE001" } },
    });
    expect(barcode.productId).toBe(original.id);
    const updated = await importProductsCsv({ tenantId: tenant.id, actorId: owner.id, csv: csv("CASE001", "BARCODE001") });
    expect(updated).toEqual({ created: 0, updated: 1, total: 1 });
  }, 30_000);
});
