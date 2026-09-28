import {
  CashDirection,
  CashMovementType,
  CashSessionStatus,
  Prisma,
} from "@prisma/client";
import { db } from "@/server/db";
import { calculateClose, calculateExpectedCash, toBase } from "./cash-rules";

export async function setExchangeRate(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  rate: number;
  effectiveAt?: Date;
}) {
  if (!Number.isFinite(input.rate) || input.rate <= 0) throw new Error("Exchange rate must be positive");
  const [branch, actor] = await Promise.all([
    db.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
    db.user.findUniqueOrThrow({ where: { id: input.actorId } }),
  ]);
  if (branch.tenantId !== input.tenantId || actor.tenantId !== input.tenantId) {
    throw new Error("Cross-tenant exchange rate is forbidden");
  }
  return db.exchangeRate.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      setById: input.actorId,
      rate: input.rate,
      effectiveAt: input.effectiveAt,
    },
  });
}

export async function openCashSession(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  openingUsd: number;
  openingLbp: number;
  openingExchangeRate: number;
}) {
  calculateExpectedCash({ ...input, movements: [] });
  return db.$transaction(async (tx) => {
    const open = await tx.cashSession.findFirst({
      where: { tenantId: input.tenantId, branchId: input.branchId, status: CashSessionStatus.OPEN },
    });
    if (open) throw new Error("Branch already has an open cash session");
    const [branch, actor] = await Promise.all([
      tx.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
    ]);
    if (branch.tenantId !== input.tenantId || actor.tenantId !== input.tenantId) {
      throw new Error("Cross-tenant cash session is forbidden");
    }
    const session = await tx.cashSession.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        openedById: input.actorId,
        openingUsd: input.openingUsd,
        openingLbp: input.openingLbp,
        openingExchangeRate: input.openingExchangeRate,
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId, branchId: input.branchId, actorId: input.actorId,
        action: "cash.session.opened", entityType: "CashSession", entityId: session.id,
        after: {
          openingUsd: input.openingUsd,
          openingLbp: input.openingLbp,
          openingExchangeRate: input.openingExchangeRate,
        },
      },
    });
    return session;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordCashMovement(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  cashSessionId: string;
  direction: CashDirection;
  type: CashMovementType;
  currency: string;
  amount: number;
  exchangeRate: number;
  sourceType?: string;
  sourceId?: string;
  reason?: string;
  idempotencyKey: string;
}) {
  const baseAmount = toBase(input.amount, input.exchangeRate);
  const requiresReason = input.type === CashMovementType.EXPENSE
    || input.type === CashMovementType.WITHDRAWAL
    || input.type === CashMovementType.ADJUSTMENT;
  if (requiresReason && !input.reason?.trim()) {
    throw new Error("Manual cash-out or adjustment requires a reason");
  }
  return db.$transaction(async (tx) => {
    const existing = await tx.cashMovement.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } },
    });
    if (existing) return existing;
    const session = await tx.cashSession.findUniqueOrThrow({ where: { id: input.cashSessionId } });
    const actor = await tx.user.findUniqueOrThrow({ where: { id: input.actorId } });
    if (session.tenantId !== input.tenantId || actor.tenantId !== input.tenantId
      || session.branchId !== input.branchId || session.status !== CashSessionStatus.OPEN) {
      throw new Error("Cash movement requires the matching open session");
    }
    return tx.cashMovement.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: input.actorId,
        cashSessionId: session.id,
        direction: input.direction,
        type: input.type,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        exchangeRate: input.exchangeRate,
        baseAmount,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        reason: input.reason?.trim(),
        idempotencyKey: input.idempotencyKey,
      },
    });
  });
}

export async function closeCashSession(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  approverId?: string;
  cashSessionId: string;
  physicalUsd: number;
  physicalLbp: number;
  closingExchangeRate: number;
  varianceReason?: string;
}) {
  return db.$transaction(async (tx) => {
    const session = await tx.cashSession.findUniqueOrThrow({
      where: { id: input.cashSessionId },
      include: { movements: true },
    });
    if (session.tenantId !== input.tenantId || session.branchId !== input.branchId
      || session.status !== CashSessionStatus.OPEN) {
      throw new Error("Matching open cash session is required");
    }
    const expectedBase = calculateExpectedCash({
      openingUsd: Number(session.openingUsd),
      openingLbp: Number(session.openingLbp),
      openingExchangeRate: Number(session.openingExchangeRate),
      movements: session.movements.map((movement) => ({
        direction: movement.direction,
        baseAmount: Number(movement.baseAmount),
      })),
    });
    const closed = calculateClose({
      expectedBase,
      physicalUsd: input.physicalUsd,
      physicalLbp: input.physicalLbp,
      closingExchangeRate: input.closingExchangeRate,
      varianceReason: input.varianceReason,
      approverId: input.approverId,
    });
    const [actor, approver] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
      input.approverId ? tx.user.findUniqueOrThrow({ where: { id: input.approverId } }) : Promise.resolve(undefined),
    ]);
    if (actor.tenantId !== input.tenantId || (approver && approver.tenantId !== input.tenantId)) {
      throw new Error("Cross-tenant cash close is forbidden");
    }
    const updated = await tx.cashSession.update({
      where: { id: session.id },
      data: {
        status: CashSessionStatus.CLOSED,
        closedById: actor.id,
        varianceApproverId: approver?.id,
        expectedBase,
        physicalUsd: input.physicalUsd,
        physicalLbp: input.physicalLbp,
        closingExchangeRate: input.closingExchangeRate,
        physicalBase: closed.physicalBase,
        varianceBase: closed.varianceBase,
        varianceReason: input.varianceReason?.trim(),
        closedAt: new Date(),
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId, branchId: input.branchId, actorId: actor.id,
        action: "cash.session.closed", entityType: "CashSession", entityId: session.id,
        after: { expectedBase, ...closed, varianceReason: input.varianceReason },
      },
    });
    return updated;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
