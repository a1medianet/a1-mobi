import { describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { ensureCatalogDeviceVariant } from "@/modules/inventory/catalog-device-variant";

function fakeTransaction(oldVariant: { id: string } | null = null) {
  const manufacturer = { upsert: vi.fn(async () => ({ id: "manufacturer" })) };
  const deviceFamily = { upsert: vi.fn(async () => ({ id: "family" })) };
  const deviceModel = { upsert: vi.fn(async () => ({ id: "model" })) };
  const deviceVariant = {
    findFirst: vi.fn(async () => oldVariant),
    upsert: vi.fn(async () => ({ id: "new-variant" })),
    update: vi.fn(async () => ({ id: "old-variant" })),
  };
  return {
    tx: { manufacturer, deviceFamily, deviceModel, deviceVariant } as unknown as Prisma.TransactionClient,
    deviceVariant, deviceModel,
  };
}

describe("catalog IMEI variant identity", () => {
  it("creates an exact SKU variant under the catalog product's model", async () => {
    const { tx, deviceVariant, deviceModel } = fakeTransaction();
    await ensureCatalogDeviceVariant(tx, { tenantId: "tenant", sku: "SKU-1", nameEn: "Phone A" });
    expect(deviceModel.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_familyId_name: { tenantId: "tenant", familyId: "family", name: "Phone A" } },
    }));
    expect(deviceVariant.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_modelId_name: { tenantId: "tenant", modelId: "model", name: "SKU-1" } },
    }));
  });

  it("preserves the variant ID across product SKU/model edits so IMEI links survive", async () => {
    const { tx, deviceVariant } = fakeTransaction({ id: "old-variant" });
    await ensureCatalogDeviceVariant(tx, {
      tenantId: "tenant", sku: "SKU-NEW", nameEn: "Phone B",
      previous: { sku: "SKU-OLD", nameEn: "Phone A" },
    });
    expect(deviceVariant.findFirst).toHaveBeenCalled();
    expect(deviceVariant.update).toHaveBeenCalledWith({
      where: { id: "old-variant" }, data: { name: "SKU-NEW", modelId: "model" },
    });
    expect(deviceVariant.upsert).not.toHaveBeenCalled();
  });

  it("uses idempotent upsert when a matching variant already exists", async () => {
    const { tx, deviceVariant } = fakeTransaction();
    await ensureCatalogDeviceVariant(tx, {
      tenantId: "tenant", sku: "SKU-1", nameEn: "Phone A",
      previous: { sku: "SKU-1", nameEn: "Phone A" },
    });
    expect(deviceVariant.findFirst).not.toHaveBeenCalled();
    expect(deviceVariant.upsert).toHaveBeenCalledTimes(1);
  });
});
