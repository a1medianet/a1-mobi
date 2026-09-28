import {
  PaymentMethod,
  Prisma,
  SaleStatus,
  SerializedDeviceStatus,
  StockMovementType,
} from "@prisma/client";
import { db } from "@/server/db";
import { calculateLocationBalance } from "@/modules/inventory/balance";
import { priceSale, type SaleLineInput } from "./sale-rules";
import type { PaymentInput } from "./payments";

export type CheckoutLineInput = {
  productId: string;
  stockLocationId: string;
  serializedDeviceId?: string;
  quantity: number;
  finalPrice: number;
  overrideReason?: string;
};

export type CheckoutPaymentInput = PaymentInput & {
  method: PaymentMethod;
  reference?: string;
};

export type CheckoutInput = {
  tenantId: string;
  branchId: string;
  actorId: string;
  customerId?: string;
  number: string;
  invoiceNumber: string;
  idempotencyKey: string;
  lines: CheckoutLineInput[];
  payments: CheckoutPaymentInput[];
};

async function actorCanOverride(tx: Prisma.TransactionClient, actorId: string) {
  const count = await tx.rolePermission.count({
    where: {
      permission: { code: "sell.price.override" },
      role: { userRoles: { some: { userId: actorId } } },
    },
  });
  return count > 0;
}

export async function checkoutSale(input: CheckoutInput) {
  if (!input.idempotencyKey.trim()) throw new Error("Sale idempotency key is required");
  if (!input.number.trim() || !input.invoiceNumber.trim()) throw new Error("Sale and invoice numbers are required");

  return db.$transaction(
    async (tx) => {
      const existing = await tx.sale.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
        include: { lines: true, payments: true, invoice: true },
      });
      if (existing) return existing;

      const [tenant, branch, actor, canOverrideFloor] = await Promise.all([
        tx.tenant.findUniqueOrThrow({ where: { id: input.tenantId } }),
        tx.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
        tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
        actorCanOverride(tx, input.actorId),
      ]);
      if (branch.tenantId !== tenant.id || actor.tenantId !== tenant.id) {
        throw new Error("Cross-tenant sale is forbidden");
      }

      const productIds = [...new Set(input.lines.map((line) => line.productId))];
      const locationIds = [...new Set(input.lines.map((line) => line.stockLocationId))];
      const deviceIds = input.lines.flatMap((line) => (line.serializedDeviceId ? [line.serializedDeviceId] : []));

      const [products, locations, devices] = await Promise.all([
        tx.product.findMany({ where: { id: { in: productIds }, tenantId: tenant.id, isActive: true } }),
        tx.stockLocation.findMany({ where: { id: { in: locationIds }, tenantId: tenant.id, branchId: branch.id } }),
        tx.serializedDevice.findMany({ where: { id: { in: deviceIds }, tenantId: tenant.id } }),
      ]);
      if (products.length !== productIds.length) throw new Error("Invalid or cross-tenant product");
      if (locations.length !== locationIds.length) throw new Error("Invalid or cross-branch stock location");
      if (devices.length !== deviceIds.length) throw new Error("Invalid or cross-tenant serialized device");

      const productMap = new Map(products.map((product) => [product.id, product]));
      const deviceMap = new Map(devices.map((device) => [device.id, device]));

      const ruleLines: SaleLineInput[] = input.lines.map((line) => {
        const product = productMap.get(line.productId)!;
        const device = line.serializedDeviceId ? deviceMap.get(line.serializedDeviceId) : undefined;
        if (product.isSerialized) {
          if (!device || device.productId !== product.id || device.stockLocationId !== line.stockLocationId) {
            throw new Error("Serialized device does not match product and location");
          }
          if (device.status !== SerializedDeviceStatus.IN_STOCK) throw new Error("Serialized device is not available");
        }

        return {
          productId: product.id,
          stockLocationId: line.stockLocationId,
          serializedDeviceId: line.serializedDeviceId,
          isSerialized: product.isSerialized,
          quantity: line.quantity,
          basePrice: Number(product.basePrice),
          minimumPrice: Number(product.minimumPrice),
          finalPrice: line.finalPrice,
          canOverrideFloor,
          overrideActorId: canOverrideFloor ? actor.id : undefined,
          overrideReason: line.overrideReason,
        };
      });

      const priced = priceSale(ruleLines, input.payments);

      for (const [index, line] of input.lines.entries()) {
        const product = productMap.get(line.productId)!;
        if (!product.isSerialized) {
          const movements = await tx.stockMovement.findMany({
            where: {
              tenantId: tenant.id,
              productId: product.id,
              OR: [{ fromLocationId: line.stockLocationId }, { toLocationId: line.stockLocationId }],
            },
            select: { quantity: true, fromLocationId: true, toLocationId: true },
          });
          const balance = calculateLocationBalance(
            line.stockLocationId,
            movements.map((movement) => ({
              quantity: Number(movement.quantity),
              fromLocationId: movement.fromLocationId ?? undefined,
              toLocationId: movement.toLocationId ?? undefined,
            })),
          );
          const requestedForProduct = input.lines
            .filter((candidate) => candidate.productId === line.productId && candidate.stockLocationId === line.stockLocationId)
            .reduce((sum, candidate) => sum + candidate.quantity, 0);
          if (balance < requestedForProduct) throw new Error("Insufficient stock");
        }
        if (priced.pricedLines[index].lineTotal < 0) throw new Error("Invalid line total");
      }

      const status = priced.status as SaleStatus;
      const sale = await tx.sale.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          actorId: actor.id,
          customerId: input.customerId,
          number: input.number.trim(),
          status,
          subtotal: priced.subtotal,
          total: priced.total,
          paidTotal: priced.paidTotal,
          balanceDue: priced.balanceDue,
          baseCurrency: tenant.baseCurrency,
          idempotencyKey: input.idempotencyKey.trim(),
          lines: {
            create: input.lines.map((line, index) => {
              const product = productMap.get(line.productId)!;
              const rule = ruleLines[index];
              const price = priced.pricedLines[index];
              return {
                productId: product.id,
                stockLocationId: line.stockLocationId,
                serializedDeviceId: line.serializedDeviceId,
                quantity: line.quantity,
                baseUnitPrice: rule.basePrice,
                minimumUnitPrice: rule.minimumPrice,
                finalUnitPrice: rule.finalPrice,
                unitCost: line.serializedDeviceId
                  ? Number(deviceMap.get(line.serializedDeviceId)!.unitCost)
                  : Number(product.costAmount),
                lineTotal: price.lineTotal,
                priceOverrideActorId: price.overrideRequired ? actor.id : undefined,
                priceOverrideReason: price.overrideRequired ? line.overrideReason?.trim() : undefined,
              };
            }),
          },
          payments: {
            create: input.payments.map((payment) => ({
              tenantId: tenant.id,
              branchId: branch.id,
              method: payment.method,
              currency: payment.currency.toUpperCase(),
              amount: payment.amount,
              exchangeRate: payment.exchangeRate,
              baseAmount: payment.amount / payment.exchangeRate,
              reference: payment.reference,
            })),
          },
          invoice: {
            create: {
              tenantId: tenant.id,
              branchId: branch.id,
              number: input.invoiceNumber.trim(),
              snapshot: {
                saleNumber: input.number,
                baseCurrency: tenant.baseCurrency,
                total: priced.total,
                paid: priced.paidTotal,
                balanceDue: priced.balanceDue,
              },
            },
          },
        },
      });

      await Promise.all(
        input.lines.map(async (line, index) => {
          const product = productMap.get(line.productId)!;
          const device = line.serializedDeviceId ? deviceMap.get(line.serializedDeviceId)! : undefined;
          await tx.stockMovement.create({
            data: {
              tenantId: tenant.id,
              branchId: branch.id,
              productId: product.id,
              serializedDeviceId: device?.id,
              fromLocationId: line.stockLocationId,
              type: StockMovementType.SALE,
              quantity: line.quantity,
              unitCost: device ? device.unitCost : product.costAmount,
              referenceType: "Sale",
              referenceId: sale.id,
              idempotencyKey: `${input.idempotencyKey}:line:${index}`,
            },
          });
          if (device) {
            await tx.serializedDevice.update({
              where: { id: device.id },
              data: { status: SerializedDeviceStatus.SOLD, stockLocationId: null },
            });
          }
        }),
      );

      await tx.auditEvent.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          actorId: actor.id,
          action: "sale.checkout",
          entityType: "Sale",
          entityId: sale.id,
          after: {
            number: sale.number,
            total: priced.total,
            paidTotal: priced.paidTotal,
            balanceDue: priced.balanceDue,
            status,
          },
        },
      });

      return tx.sale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { lines: true, payments: true, invoice: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
