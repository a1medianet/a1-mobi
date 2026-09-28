import {
  ExchangeStatus,
  Prisma,
  SaleStatus,
  SerializedDeviceStatus,
  StockMovementType,
} from "@prisma/client";
import { db } from "@/server/db";
import { requireReturnReason, validateReturnLine } from "./return-rules";

export type PostReturnInput = {
  tenantId: string;
  branchId: string;
  actorId: string;
  saleId: string;
  number: string;
  reason: string;
  idempotencyKey: string;
  lines: Array<{
    originalSaleLineId: string;
    quantity: number;
    stockLocationId: string;
  }>;
};

export async function postSaleReturn(input: PostReturnInput) {
  if (!input.lines.length) throw new Error("Return must contain at least one line");
  const reason = requireReturnReason(input.reason);

  return db.$transaction(
    async (tx) => {
      const existing = await tx.saleReturn.findUnique({
        where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
        include: { lines: true },
      });
      if (existing) return existing;

      const [sale, actor, branch] = await Promise.all([
        tx.sale.findUniqueOrThrow({
          where: { id: input.saleId },
          include: {
            lines: {
              include: {
                returnLines: {
                  where: { saleReturn: { status: "POSTED" } },
                },
              },
            },
          },
        }),
        tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
        tx.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
      ]);
      if (sale.tenantId !== input.tenantId || actor.tenantId !== input.tenantId || branch.tenantId !== input.tenantId) {
        throw new Error("Cross-tenant return is forbidden");
      }
      if (sale.branchId !== branch.id) throw new Error("Cross-branch return is forbidden");

      const saleLineMap = new Map(sale.lines.map((line) => [line.id, line]));
      const locations = await tx.stockLocation.findMany({
        where: {
          id: { in: [...new Set(input.lines.map((line) => line.stockLocationId))] },
          tenantId: input.tenantId,
          branchId: input.branchId,
        },
      });
      if (locations.length !== new Set(input.lines.map((line) => line.stockLocationId)).size) {
        throw new Error("Invalid return stock location");
      }

      const prepared = input.lines.map((requested) => {
        const original = saleLineMap.get(requested.originalSaleLineId);
        if (!original) throw new Error("Return line is not part of the original sale");
        const previouslyReturnedQuantity = original.returnLines.reduce(
          (sum, line) => sum + Number(line.quantity),
          0,
        );
        const rule = validateReturnLine({
          soldQuantity: Number(original.quantity),
          previouslyReturnedQuantity,
          requestedQuantity: requested.quantity,
          soldUnitPrice: Number(original.finalUnitPrice),
          serializedDeviceId: original.serializedDeviceId ?? undefined,
        });
        return { requested, original, refund: rule.refund };
      });
      const refundBase = prepared.reduce((sum, line) => sum + line.refund, 0);

      const saleReturn = await tx.saleReturn.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          saleId: sale.id,
          actorId: actor.id,
          number: input.number.trim(),
          reason,
          refundBase,
          idempotencyKey: input.idempotencyKey.trim(),
          lines: {
            create: prepared.map(({ requested, original, refund }) => ({
              originalSaleLineId: original.id,
              productId: original.productId,
              stockLocationId: requested.stockLocationId,
              serializedDeviceId: original.serializedDeviceId,
              quantity: requested.quantity,
              refundUnitPrice: original.finalUnitPrice,
              lineTotal: refund,
            })),
          },
        },
        include: { lines: true },
      });

      await Promise.all(
        prepared.map(async ({ requested, original }, index) => {
          await tx.stockMovement.create({
            data: {
              tenantId: input.tenantId,
              branchId: input.branchId,
              productId: original.productId,
              serializedDeviceId: original.serializedDeviceId,
              toLocationId: requested.stockLocationId,
              type: StockMovementType.RETURN,
              quantity: requested.quantity,
              unitCost: original.unitCost,
              reason,
              referenceType: "SaleReturn",
              referenceId: saleReturn.id,
              idempotencyKey: `${input.idempotencyKey}:line:${index}`,
            },
          });
          if (original.serializedDeviceId) {
            await tx.serializedDevice.update({
              where: { id: original.serializedDeviceId },
              data: {
                status: SerializedDeviceStatus.RETURNED,
                stockLocationId: requested.stockLocationId,
              },
            });
          }
        }),
      );

      const returnedAfter = sale.lines.reduce((sum, line) => {
        const previous = line.returnLines.reduce((part, returnLine) => part + Number(returnLine.quantity), 0);
        const current = input.lines
          .filter((requested) => requested.originalSaleLineId === line.id)
          .reduce((part, requested) => part + requested.quantity, 0);
        return sum + previous + current;
      }, 0);
      const soldQuantity = sale.lines.reduce((sum, line) => sum + Number(line.quantity), 0);
      const status = returnedAfter >= soldQuantity ? SaleStatus.RETURNED : SaleStatus.PARTIALLY_RETURNED;
      await tx.sale.update({ where: { id: sale.id }, data: { status } });

      await tx.auditEvent.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          actorId: actor.id,
          action: "sale.return.posted",
          entityType: "SaleReturn",
          entityId: saleReturn.id,
          reason,
          after: { saleId: sale.id, refundBase, status },
        },
      });

      return saleReturn;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function linkExchange(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  returnId: string;
  newSaleId: string;
}) {
  return db.$transaction(async (tx) => {
    const [saleReturn, newSale, actor] = await Promise.all([
      tx.saleReturn.findUniqueOrThrow({ where: { id: input.returnId } }),
      tx.sale.findUniqueOrThrow({ where: { id: input.newSaleId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
    ]);
    if ([saleReturn.tenantId, newSale.tenantId, actor.tenantId].some((tenantId) => tenantId !== input.tenantId)) {
      throw new Error("Cross-tenant exchange is forbidden");
    }
    if (saleReturn.branchId !== input.branchId || newSale.branchId !== input.branchId) {
      throw new Error("Cross-branch exchange is forbidden");
    }

    const exchange = await tx.exchange.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        returnId: saleReturn.id,
        newSaleId: newSale.id,
        status: ExchangeStatus.COMPLETED,
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: actor.id,
        action: "sale.exchange.linked",
        entityType: "Exchange",
        entityId: exchange.id,
        after: { returnId: saleReturn.id, newSaleId: newSale.id },
      },
    });
    return exchange;
  });
}
