import type { Prisma } from "@prisma/client";

/**
 * Keep catalog-managed IMEI variant identity aligned when a product is first
 * registered or renamed. This preserves the existing deviceVariant.id and
 * therefore existing serialized-device links during product edits.
 */
export async function ensureCatalogDeviceVariant(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    sku: string;
    nameEn: string;
    previous?: { sku: string; nameEn: string } | null;
  },
) {
  const manufacturer = await tx.manufacturer.upsert({
    where: { tenantId_code: { tenantId: input.tenantId, code: "UNSPECIFIED" } },
    create: { tenantId: input.tenantId, code: "UNSPECIFIED", name: "Unspecified" },
    update: {},
  });
  const family = await tx.deviceFamily.upsert({
    where: { tenantId_manufacturerId_name: {
      tenantId: input.tenantId, manufacturerId: manufacturer.id, name: "Phones",
    } },
    create: { tenantId: input.tenantId, manufacturerId: manufacturer.id, name: "Phones" },
    update: {},
  });
  const model = await tx.deviceModel.upsert({
    where: { tenantId_familyId_name: {
      tenantId: input.tenantId, familyId: family.id, name: input.nameEn,
    } },
    create: { tenantId: input.tenantId, familyId: family.id, name: input.nameEn },
    update: {},
  });
  const oldVariant = input.previous && (
    input.previous.sku !== input.sku || input.previous.nameEn !== input.nameEn
  ) ? await tx.deviceVariant.findFirst({
    where: {
      tenantId: input.tenantId, name: input.previous.sku,
      model: { name: input.previous.nameEn, familyId: family.id },
    },
    select: { id: true },
  }) : null;
  if (oldVariant) {
    return tx.deviceVariant.update({
      where: { id: oldVariant.id },
      data: { name: input.sku, modelId: model.id },
    });
  }
  return tx.deviceVariant.upsert({
    where: { tenantId_modelId_name: {
      tenantId: input.tenantId, modelId: model.id, name: input.sku,
    } },
    create: { tenantId: input.tenantId, modelId: model.id, name: input.sku },
    update: {},
  });
}
