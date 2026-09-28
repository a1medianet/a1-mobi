import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { collectOperationalAlerts } from "@/modules/reports/alerts";
import { importProductsCsv } from "@/modules/reports/product-import";
import { buildOwnerSummary } from "@/modules/reports/report-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("reports database integration", () => {
  it("imports products and derives owner summary and low-stock alerts from source records", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({ data: { slug: `reports-${suffix}`, name: "Stage 8 Test" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        email: `owner-${suffix}@example.test`, displayName: "Owner", passwordHash: "test-only",
      },
    });
    await db.category.create({
      data: { tenantId: tenant.id, code: "ACC", nameAr: "إكسسوارات", nameEn: "Accessories" },
    });
    const csv = [
      "category_code,sku,name_ar,name_en,type,barcode,cost,base_price,minimum_price,low_stock,serialized",
      `ACC,CASE-${suffix},غطاء,Case,ACCESSORY,BAR-${suffix},2,5,3,1,false`,
    ].join("\n");
    const imported = await importProductsCsv({ tenantId: tenant.id, actorId: user.id, csv });
    const now = new Date();
    const summary = await buildOwnerSummary({
      tenantId: tenant.id,
      from: new Date(now.getTime() - 86_400_000),
      to: new Date(now.getTime() + 86_400_000),
    });
    const alerts = await collectOperationalAlerts(tenant.id, now);

    expect(imported).toEqual({ created: 1, updated: 0, total: 1 });
    expect(summary.sales.revenue).toBe(0);
    expect(summary.stock.lowItems).toHaveLength(1);
    expect(alerts.some((alert) => alert.code === "LOW_STOCK")).toBe(true);
  }, 30_000);
});
