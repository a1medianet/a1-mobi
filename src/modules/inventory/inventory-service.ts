import { DeviceServiceContext, Prisma, ProductType } from "@prisma/client";
import { db } from "@/server/db";
import { assertTrustCheckForWorkflow } from "@/modules/device-trust/workflow-guard";
import { normalizeBarcode } from "@/modules/catalog/barcode";
import { requireValidImei } from "@/modules/devices/imei";
import { assertSameTenant } from "./tenant-scope";
import { validateStockMovement } from "./movement";

export type RegisterProductInput = {
  tenantId: string;
  actorId: string;
  categoryId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  type: ProductType;
  isSerialized: boolean;
  barcodes: string[];
  costAmount?: number;
  basePrice?: number;
  minimumPrice?: number;
  lowStockLevel?: number;
};

export async function registerProduct(input: RegisterProductInput) {
  const category = await db.category.findFirst({
    where: { id: input.categoryId, tenantId: input.tenantId },
    select: { tenantId: true },
  });
  if (!category) throw new Error("CATEGORY_NOT_FOUND");
  assertSameTenant(input.tenantId, category.tenantId);
  const barcodes = [...new Set(input.barcodes.map(normalizeBarcode))];
  return db.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        tenantId: input.tenantId,
        categoryId: input.categoryId,
        sku: input.sku.trim(),
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        type: input.type,
        isSerialized: input.isSerialized,
        costAmount: input.costAmount ?? 0,
        basePrice: input.basePrice ?? 0,
        minimumPrice: input.minimumPrice ?? 0,
        lowStockLevel: input.lowStockLevel ?? 0,
        barcodes: {
          create: barcodes.map((value, index) => ({
            tenantId: input.tenantId,
            value,
            isPrimary: index === 0,
          })),
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: "catalog.product.created",
        entityType: "Product",
        entityId: product.id,
        after: product as unknown as Prisma.InputJsonValue,
      },
    });
    return product;
  });
}
export type ReceiveSerializedDeviceInput = {
  tenantId: string;
  branchId: string;
  actorId: string;
  trustCheckId: string;
  productId: string;
  variantId: string;
  stockLocationId: string;
  imei: string;
  serialNumber?: string;
  unitCost: number;
  idempotencyKey: string;
};

export async function receiveSerializedDevice(
  input: ReceiveSerializedDeviceInput,
) {
  const imei = requireValidImei(input.imei);
  validateStockMovement({
    type: "PURCHASE_RECEIPT",
    quantity: 1,
    toLocationId: input.stockLocationId,
    serializedDeviceId: "pending",
    idempotencyKey: input.idempotencyKey,
  });

  return db.$transaction(async (tx) => {
    await assertInventoryReferences(tx, input);
    await assertTrustCheckForWorkflow(tx, {
      trustCheckId: input.trustCheckId, tenantId: input.tenantId,
      branchId: input.branchId, context: DeviceServiceContext.STOCK_IN, imei,
    });
    const device = await tx.serializedDevice.create({
      data: {
        tenantId: input.tenantId,
        productId: input.productId,
        variantId: input.variantId,
        stockLocationId: input.stockLocationId,
        imei,
        serialNumber: input.serialNumber?.trim() || null,
        unitCost: input.unitCost,
      },
    });
    await tx.stockMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        productId: input.productId,
        serializedDeviceId: device.id,
        toLocationId: input.stockLocationId,
        type: "PURCHASE_RECEIPT",
        quantity: 1,
        unitCost: input.unitCost,
        idempotencyKey: input.idempotencyKey,
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: input.actorId,
        action: "inventory.serialized-device.received",
        entityType: "SerializedDevice",
        entityId: device.id,
        after: device as unknown as Prisma.InputJsonValue,
      },
    });
    return device;
  });
}

async function assertInventoryReferences(
  tx: Prisma.TransactionClient,
  input: ReceiveSerializedDeviceInput,
) {
  const [product, variant, location] = await Promise.all([
    tx.product.findFirst({
      where: { id: input.productId, tenantId: input.tenantId, isSerialized: true },
    }),
    tx.deviceVariant.findFirst({
      where: { id: input.variantId, tenantId: input.tenantId },
    }),
    tx.stockLocation.findFirst({
      where: {
        id: input.stockLocationId,
        tenantId: input.tenantId,
        branchId: input.branchId,
      },
    }),
  ]);
  if (!product) throw new Error("SERIALIZED_PRODUCT_NOT_FOUND");
  if (!variant) throw new Error("DEVICE_VARIANT_NOT_FOUND");
  if (!location) throw new Error("STOCK_LOCATION_NOT_FOUND");
  assertSameTenant(
    input.tenantId,
    product.tenantId,
    variant.tenantId,
    location.tenantId,
  );
}
