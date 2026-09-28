import { ProductType } from "@prisma/client";
import { db } from "@/server/db";
import { normalizeBarcode } from "@/modules/catalog/barcode";
import { parseCsv } from "./csv";

const requiredHeaders = [
  "category_code", "sku", "name_ar", "name_en", "type",
  "barcode", "cost", "base_price", "minimum_price", "low_stock", "serialized",
];

export function validateProductImport(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("Product import must contain header and data");
  const headers = rows[0].map((header) => header.toLowerCase());
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) throw new Error(`Missing import column: ${header}`);
  }
  const index = Object.fromEntries(headers.map((header, position) => [header, position]));
  return rows.slice(1).map((row, offset) => {
    const type = row[index.type] as ProductType;
    if (!Object.values(ProductType).includes(type)) throw new Error(`Invalid product type at row ${offset + 2}`);
    const numeric = (header: string) => {
      const value = Number(row[index[header]]);
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${header} at row ${offset + 2}`);
      return value;
    };
    const basePrice = numeric("base_price");
    const minimumPrice = numeric("minimum_price");
    if (minimumPrice > basePrice) throw new Error(`Minimum price exceeds base price at row ${offset + 2}`);
    return {
      categoryCode: row[index.category_code].trim(),
      sku: row[index.sku].trim(),
      nameAr: row[index.name_ar].trim(),
      nameEn: row[index.name_en].trim(),
      type,
      barcode: normalizeBarcode(row[index.barcode]),
      cost: numeric("cost"),
      basePrice,
      minimumPrice,
      lowStock: numeric("low_stock"),
      serialized: ["1", "true", "yes"].includes(row[index.serialized].trim().toLowerCase()),
    };
  });
}

export async function importProductsCsv(input: {
  tenantId: string;
  actorId: string;
  csv: string;
}) {
  const rows = validateProductImport(input.csv);
  return db.$transaction(async (tx) => {
    const actor = await tx.user.findUniqueOrThrow({ where: { id: input.actorId } });
    if (actor.tenantId !== input.tenantId) throw new Error("Cross-tenant import is forbidden");
    let created = 0;
    let updated = 0;
    for (const row of rows) {
      const category = await tx.category.findUniqueOrThrow({
        where: { tenantId_code: { tenantId: input.tenantId, code: row.categoryCode } },
      });
      const existing = await tx.product.findUnique({
        where: { tenantId_sku: { tenantId: input.tenantId, sku: row.sku } },
      });
      const product = await tx.product.upsert({
        where: { tenantId_sku: { tenantId: input.tenantId, sku: row.sku } },
        create: {
          tenantId: input.tenantId, categoryId: category.id, sku: row.sku,
          nameAr: row.nameAr, nameEn: row.nameEn, type: row.type,
          isSerialized: row.serialized, costAmount: row.cost, basePrice: row.basePrice,
          minimumPrice: row.minimumPrice, lowStockLevel: row.lowStock,
        },
        update: {
          categoryId: category.id, nameAr: row.nameAr, nameEn: row.nameEn, type: row.type,
          isSerialized: row.serialized, costAmount: row.cost, basePrice: row.basePrice,
          minimumPrice: row.minimumPrice, lowStockLevel: row.lowStock,
        },
      });
      await tx.barcode.upsert({
        where: { tenantId_value: { tenantId: input.tenantId, value: row.barcode } },
        create: { tenantId: input.tenantId, productId: product.id, value: row.barcode, isPrimary: true },
        update: { productId: product.id },
      });
      if (existing) updated += 1;
      else created += 1;
    }
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId, branchId: actor.branchId, actorId: actor.id,
        action: "catalog.products.imported", entityType: "ProductImport",
        entityId: `import-${Date.now()}`, after: { created, updated, total: rows.length },
      },
    });
    return { created, updated, total: rows.length };
  });
}
