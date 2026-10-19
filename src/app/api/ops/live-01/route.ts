import { randomUUID } from "node:crypto";
import { DeviceServiceContext, DeviceTrustResult, PaymentMethod, ProductType, Prisma } from "@prisma/client";
import { z } from "zod";
import { readAuthJson } from "@/core/auth/request";
import { authJson, currentStoreContext, sameOriginMutation } from "@/server/auth-http";
import { controlError } from "@/server/control-http";
import { db } from "@/server/db";
import { registerProduct, receiveSerializedDevice } from "@/modules/inventory/inventory-service";
import { checkDeviceTrust } from "@/modules/device-trust/device-trust-service";
import { checkoutSale } from "@/modules/sell/sell-service";
import { roundMoney } from "@/modules/sell/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Each mutation is tenant/branch-scoped and protected by existing session RBAC.
// This is a dedicated operational pilot. The demo POS remains non-persistent.
const identifier = z.string().trim().min(2).max(90);
const amount = z.number().finite().min(0).max(999_999_999);
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("createProduct"),
    sku: identifier.regex(/^[A-Za-z0-9._-]+$/),
    brand: identifier.regex(/^[A-Za-z0-9._-]+$/),
    model: identifier,
    variant: identifier,
    nameAr: identifier,
    nameEn: identifier,
    unitCost: amount,
    price: amount.positive(),
  }).strict(),
  z.object({
    action: z.literal("receive"),
    productId: identifier,
    variantId: identifier,
    locationId: identifier,
    imei: z.string().trim().regex(/^\d{15}$/),
    unitCost: amount,
    idempotencyKey: z.string().uuid(),
  }).strict(),
  z.object({
    action: z.literal("sell"),
    deviceId: identifier,
    idempotencyKey: z.string().uuid(),
  }).strict(),
  z.object({
    action: z.literal("sellCart"),
    deviceIds: z.array(identifier).min(1).max(12).refine(ids => new Set(ids).size === ids.length),
    idempotencyKey: z.string().uuid(),
  }).strict(),
]);

function rejected(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  if (code === "AUTH_REQUIRED" || code === "PERMISSION_DENIED") return controlError(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return authJson({ error: "ALREADY_EXISTS" }, 409);
  }
  if (/ALREADY|Insufficient stock|not available|Duplicate|STOCK_LOCATION_NOT_FOUND/.test(code)) {
    return authJson({ error: "CONFLICT_OR_OUT_OF_STOCK" }, 409);
  }
  // Do not return raw domain exceptions, SQL, PII, or authorization details to clients.
  return authJson({ error: "OPERATION_REJECTED" }, 400);
}

export async function GET() {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);
  try {
    const ctx = await currentStoreContext("inventory.read");
    const [products, variants, locations, devices, sales] = await Promise.all([
      db.product.findMany({ where: { tenantId: ctx.tenantId, isActive: true },
        orderBy: { createdAt: "desc" }, take: 100 }),
      db.deviceVariant.findMany({ where: { tenantId: ctx.tenantId },
        include: { model: true }, take: 100 }),
      db.stockLocation.findMany({ where: { tenantId: ctx.tenantId, branchId: ctx.branchId },
        orderBy: { name: "asc" }, take: 100 }),
      db.serializedDevice.findMany({ where: {
        tenantId: ctx.tenantId, OR: [{ stockLocation: { branchId: ctx.branchId } }, { saleLines: { some: { sale: { branchId: ctx.branchId } } } }],
      }, include: { product: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      ctx.permissions.has("reports.read") ? db.sale.findMany({ where: { tenantId: ctx.tenantId, branchId: ctx.branchId },
        include: { invoice: true }, orderBy: { occurredAt: "desc" }, take: 30 }) : Promise.resolve([]),
    ]);
    return authJson({
      mode: "LIVE_PILOT", branchId: ctx.branchId,
      products: products.map(p => ({ id: p.id, sku: p.sku, nameAr: p.nameAr, nameEn: p.nameEn,
        isSerialized: p.isSerialized, price: Number(p.basePrice) })),
      variants: variants.map(v => ({ id: v.id, name: v.name, model: v.model.name })),
      locations: locations.map(l => ({ id: l.id, name: l.name })),
      devices: devices.map(v => ({ id: v.id, productId: v.productId, productName: v.product.nameAr, productNameEn: v.product.nameEn,
        imei: v.imei, status: v.status, locationId: v.stockLocationId })),
      sales: sales.map(s => ({ id: s.id, number: s.number, invoiceNumber: s.invoice?.number ?? "",
        total: Number(s.total), status: s.status, createdAt: s.occurredAt.toISOString() })),
      counts: { products: products.length,
        availableDevices: devices.filter(device => device.status === "IN_STOCK").length,
        sales: sales.length },
    });
  } catch (error) {
    return controlError(error);
  }
}

export async function POST(request: Request) {
  if (process.env.A1_MOBI_C_LIVE_01_ENABLED !== "1") return authJson({ error: "NOT_FOUND" }, 404);
  if (!sameOriginMutation(request)) return authJson({ error: "FORBIDDEN_ORIGIN" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return authJson({ error: "INVALID_REQUEST" }, 400);
  }
  let parsed;
  try { parsed = actionSchema.safeParse(await readAuthJson(request, 8_192)); }
  catch { return authJson({ error: "INVALID_REQUEST" }, 400); }
  if (!parsed.success) return authJson({ error: "INVALID_REQUEST" }, 400);

  const input = parsed.data;
  const permission = input.action === "sell" || input.action === "sellCart" ? "sell.create" : "foundation.manage";
  try {
    const ctx = await currentStoreContext(permission);
    if (input.action === "createProduct") {
      const category = await db.category.upsert({
        where: { tenantId_code: { tenantId: ctx.tenantId, code: "PHONES" } },
        create: { tenantId: ctx.tenantId, code: "PHONES", nameAr: "هواتف", nameEn: "Phones" },
        update: {},
      });
      const brandCode = input.brand.toUpperCase();
      const manufacturer = await db.manufacturer.upsert({
        where: { tenantId_code: { tenantId: ctx.tenantId, code: brandCode } },
        create: { tenantId: ctx.tenantId, code: brandCode, name: input.brand }, update: {},
      });
      const family = await db.deviceFamily.upsert({
        where: { tenantId_manufacturerId_name: { tenantId: ctx.tenantId,
          manufacturerId: manufacturer.id, name: "Phones" } },
        create: { tenantId: ctx.tenantId, manufacturerId: manufacturer.id, name: "Phones" }, update: {},
      });
      const model = await db.deviceModel.upsert({
        where: { tenantId_familyId_name: { tenantId: ctx.tenantId,
          familyId: family.id, name: input.model } },
        create: { tenantId: ctx.tenantId, familyId: family.id, name: input.model }, update: {},
      });
      const variant = await db.deviceVariant.upsert({
        where: { tenantId_modelId_name: { tenantId: ctx.tenantId,
          modelId: model.id, name: input.variant } },
        create: { tenantId: ctx.tenantId, modelId: model.id, name: input.variant }, update: {},
      });
      const location = await db.stockLocation.upsert({
        where: { tenantId_code: { tenantId: ctx.tenantId, code: "SHOP-" + ctx.branchId } },
        create: { tenantId: ctx.tenantId, branchId: ctx.branchId, code: "SHOP-" + ctx.branchId,
          name: "Store inventory" }, update: {},
      });
      const product = await registerProduct({
        tenantId: ctx.tenantId, actorId: ctx.actorId, categoryId: category.id,
        sku: input.sku, nameAr: input.nameAr, nameEn: input.nameEn,
        type: ProductType.DEVICE, isSerialized: true, barcodes: [],
        costAmount: input.unitCost, basePrice: input.price, minimumPrice: input.price,
      });
      return authJson({ id: product.id, variantId: variant.id, locationId: location.id }, 201);
    }

    if (input.action === "receive") {
      const trust = await checkDeviceTrust({
        tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
        context: DeviceServiceContext.STOCK_IN, devicePresent: true, imei: input.imei,
      });
      if (trust.result !== DeviceTrustResult.CLEAR || trust.blocked) {
        return authJson({ error: "DEVICE_REQUIRES_MANUAL_REVIEW" }, 409);
      }
      const received = await receiveSerializedDevice({
        tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
        productId: input.productId, variantId: input.variantId,
        stockLocationId: input.locationId, imei: input.imei, unitCost: input.unitCost,
        trustCheckId: trust.id, idempotencyKey: input.idempotencyKey,
      });
      return authJson({ id: received.id, status: received.status }, 201);
    }

    const deviceIds = input.action === "sell" ? [input.deviceId] : input.deviceIds;
    const devices = await db.serializedDevice.findMany({
      where: {
        id: { in: deviceIds }, tenantId: ctx.tenantId,
        stockLocation: { branchId: ctx.branchId }, status: "IN_STOCK",
      },
      include: { product: true },
    });
    if (devices.length !== deviceIds.length || devices.some(d => !d.imei || !d.stockLocationId || !d.product.isActive)) {
      return authJson({ error: "DEVICE_NOT_AVAILABLE" }, 409);
    }
    const found = new Map(devices.map(device => [device.id, device]));
    const trustChecks: { id: string }[] = [];
    for (const id of deviceIds) {
      const device = found.get(id)!;
      const trust = await checkDeviceTrust({
        tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
        context: DeviceServiceContext.SALE, devicePresent: true, imei: device.imei!,
      });
      if (trust.result !== DeviceTrustResult.CLEAR || trust.blocked) {
        return authJson({ error: "DEVICE_REQUIRES_MANUAL_REVIEW" }, 409);
      }
      trustChecks.push(trust);
    }
    const token = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const sale = await checkoutSale({
      tenantId: ctx.tenantId, branchId: ctx.branchId, actorId: ctx.actorId,
      number: "S-" + token, invoiceNumber: "INV-" + token,
      idempotencyKey: input.idempotencyKey,
      lines: deviceIds.map((id, index) => {
        const device = found.get(id)!;
        return {
          productId: device.productId, stockLocationId: device.stockLocationId!,
          serializedDeviceId: device.id, trustCheckId: trustChecks[index].id,
          quantity: 1, finalPrice: Number(device.product.basePrice),
        };
      }),
      payments: [{
        method: PaymentMethod.CASH, currency: "USD",
        amount: roundMoney(devices.reduce((sum, d) => sum + Number(d.product.basePrice), 0)),
        exchangeRate: 1,
      }],
    });
    return authJson({ id: sale.id, number: sale.number,
      invoiceNumber: sale.invoice?.number, status: sale.status, itemCount: sale.lines.length }, 201);
  } catch (error) {
    return rejected(error);
  }
}
