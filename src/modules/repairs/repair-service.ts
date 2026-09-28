import {
  PaymentMethod,
  Prisma,
  RepairApprovalDecision,
  RepairPartSource,
  RepairStatus,
  StockMovementType,
} from "@prisma/client";
import { db } from "@/server/db";
import { calculateLocationBalance } from "@/modules/inventory/balance";
import { paymentToBase } from "@/modules/sell/payments";
import {
  assertRepairTransition,
  calculateRepairTruth,
  validateIntake,
  validateRepairPart,
} from "./repair-rules";

function assertTenant(ids: string[], tenantId: string, message: string) {
  if (ids.some((id) => id !== tenantId)) throw new Error(message);
}

export async function createRepairIntake(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  number: string;
  customerName: string;
  customerPhone: string;
  customerId?: string;
  serializedDeviceId?: string;
  deviceDescription: string;
  imei?: string;
  condition: string;
  accessories: string[];
  reportedIssue: string;
}) {
  const clean = validateIntake(input);
  return db.$transaction(async (tx) => {
    const [tenant, branch, actor, device] = await Promise.all([
      tx.tenant.findUniqueOrThrow({ where: { id: input.tenantId } }),
      tx.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
      input.serializedDeviceId
        ? tx.serializedDevice.findUniqueOrThrow({ where: { id: input.serializedDeviceId } })
        : Promise.resolve(undefined),
    ]);
    assertTenant(
      [branch.tenantId, actor.tenantId, ...(device ? [device.tenantId] : [])],
      tenant.id,
      "Cross-tenant repair intake is forbidden",
    );
    const repair = await tx.repairOrder.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        createdById: actor.id,
        customerId: input.customerId,
        serializedDeviceId: device?.id,
        number: input.number.trim(),
        customerName: clean.customerName.trim(),
        customerPhone: clean.customerPhone,
        deviceDescription: clean.deviceDescription.trim(),
        imei: input.imei?.trim() || device?.imei,
        condition: clean.condition.trim(),
        accessories: input.accessories,
        reportedIssue: clean.reportedIssue.trim(),
        baseCurrency: tenant.baseCurrency,
        statusEvents: {
          create: {
            branchId: branch.id,
            actorId: actor.id,
            toStatus: RepairStatus.INTAKE,
            note: "Repair intake created",
          },
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: tenant.id,
        branchId: branch.id,
        actorId: actor.id,
        action: "repair.intake.created",
        entityType: "RepairOrder",
        entityId: repair.id,
        after: { number: repair.number, status: repair.status, imei: repair.imei },
      },
    });
    return repair;
  });
}

export async function advanceRepair(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  repairOrderId: string;
  toStatus: RepairStatus;
  note?: string;
  diagnosis?: string;
  estimateAmount?: number;
  technicianId?: string;
}) {
  return db.$transaction(async (tx) => {
    const [repair, actor, technician] = await Promise.all([
      tx.repairOrder.findUniqueOrThrow({ where: { id: input.repairOrderId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
      input.technicianId
        ? tx.user.findUniqueOrThrow({ where: { id: input.technicianId } })
        : Promise.resolve(undefined),
    ]);
    assertTenant(
      [repair.tenantId, actor.tenantId, ...(technician ? [technician.tenantId] : [])],
      input.tenantId,
      "Cross-tenant repair transition is forbidden",
    );
    if (repair.branchId !== input.branchId) throw new Error("Cross-branch repair transition is forbidden");
    assertRepairTransition(repair.status, input.toStatus);
    if (input.toStatus === RepairStatus.ESTIMATE_PENDING) {
      if (!input.diagnosis?.trim()) throw new Error("Diagnosis is required before estimate");
      if (!input.estimateAmount || input.estimateAmount <= 0) throw new Error("Estimate amount must be positive");
    }
    if (input.toStatus === RepairStatus.IN_PROGRESS && !(input.technicianId || repair.technicianId)) {
      throw new Error("Technician is required before repair starts");
    }

    const updated = await tx.repairOrder.update({
      where: { id: repair.id },
      data: {
        status: input.toStatus,
        diagnosis: input.diagnosis?.trim() ?? repair.diagnosis,
        estimateAmount: input.estimateAmount ?? repair.estimateAmount,
        finalPrice: input.estimateAmount ?? repair.finalPrice,
        balanceDue: input.estimateAmount ?? repair.balanceDue,
        technicianId: input.technicianId ?? repair.technicianId,
        readyAt: input.toStatus === RepairStatus.READY ? new Date() : repair.readyAt,
        deliveredAt: input.toStatus === RepairStatus.DELIVERED ? new Date() : repair.deliveredAt,
        statusEvents: {
          create: {
            branchId: input.branchId,
            actorId: actor.id,
            fromStatus: repair.status,
            toStatus: input.toStatus,
            note: input.note?.trim(),
          },
        },
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: actor.id,
        action: "repair.status.changed",
        entityType: "RepairOrder",
        entityId: repair.id,
        before: { status: repair.status },
        after: { status: updated.status },
        reason: input.note?.trim(),
      },
    });
    return updated;
  });
}

export async function approveRepairEstimate(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  repairOrderId: string;
  approved: boolean;
  note?: string;
}) {
  return db.$transaction(async (tx) => {
    const repair = await tx.repairOrder.findUniqueOrThrow({ where: { id: input.repairOrderId } });
    const actor = await tx.user.findUniqueOrThrow({ where: { id: input.actorId } });
    assertTenant([repair.tenantId, actor.tenantId], input.tenantId, "Cross-tenant approval is forbidden");
    if (repair.status !== RepairStatus.ESTIMATE_PENDING || !repair.estimateAmount) {
      throw new Error("Repair is not waiting for an estimate approval");
    }
    const target = input.approved ? RepairStatus.APPROVED : RepairStatus.CANCELLED;
    assertRepairTransition(repair.status, target);
    await tx.repairApproval.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        repairOrderId: repair.id,
        actorId: actor.id,
        decision: input.approved ? RepairApprovalDecision.APPROVED : RepairApprovalDecision.REJECTED,
        amount: repair.estimateAmount,
        note: input.note,
      },
    });
    return tx.repairOrder.update({
      where: { id: repair.id },
      data: {
        status: target,
        approvedAt: input.approved ? new Date() : undefined,
        statusEvents: {
          create: {
            branchId: input.branchId,
            actorId: actor.id,
            fromStatus: repair.status,
            toStatus: target,
            note: input.note,
          },
        },
      },
    });
  });
}

export async function addRepairPart(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  repairOrderId: string;
  source: RepairPartSource;
  description: string;
  productId?: string;
  stockLocationId?: string;
  quantity: number;
  unitCost: number;
  idempotencyKey: string;
}) {
  const calculated = validateRepairPart(input);
  return db.$transaction(async (tx) => {
    const repair = await tx.repairOrder.findUniqueOrThrow({ where: { id: input.repairOrderId } });
    const actor = await tx.user.findUniqueOrThrow({ where: { id: input.actorId } });
    assertTenant([repair.tenantId, actor.tenantId], input.tenantId, "Cross-tenant repair part is forbidden");
    if (repair.status !== RepairStatus.APPROVED && repair.status !== RepairStatus.IN_PROGRESS) {
      throw new Error("Parts can only be added to an approved or active repair");
    }

    let product;
    if (input.source === RepairPartSource.STOCK) {
      product = await tx.product.findUniqueOrThrow({ where: { id: input.productId! } });
      const location = await tx.stockLocation.findUniqueOrThrow({ where: { id: input.stockLocationId! } });
      assertTenant([product.tenantId, location.tenantId], input.tenantId, "Cross-tenant stock part is forbidden");
      if (location.branchId !== input.branchId) throw new Error("Cross-branch stock part is forbidden");
      const movements = await tx.stockMovement.findMany({
        where: {
          tenantId: input.tenantId,
          productId: product.id,
          OR: [{ fromLocationId: location.id }, { toLocationId: location.id }],
        },
        select: { quantity: true, fromLocationId: true, toLocationId: true },
      });
      const balance = calculateLocationBalance(
        location.id,
        movements.map((movement) => ({
          quantity: Number(movement.quantity),
          fromLocationId: movement.fromLocationId ?? undefined,
          toLocationId: movement.toLocationId ?? undefined,
        })),
      );
      if (balance < input.quantity) throw new Error("Insufficient stock for repair part");
    }

    const part = await tx.repairPart.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        repairOrderId: repair.id,
        source: input.source,
        description: input.description.trim(),
        productId: input.productId,
        stockLocationId: input.stockLocationId,
        quantity: input.quantity,
        unitCost: input.unitCost,
        totalCost: calculated.totalCost,
      },
    });
    if (input.source === RepairPartSource.STOCK) {
      await tx.stockMovement.create({
        data: {
          tenantId: input.tenantId,
          branchId: input.branchId,
          productId: input.productId!,
          fromLocationId: input.stockLocationId!,
          type: StockMovementType.REPAIR_USE,
          quantity: input.quantity,
          unitCost: input.unitCost,
          referenceType: "RepairPart",
          referenceId: part.id,
          idempotencyKey: input.idempotencyKey,
        },
      });
    }
    const aggregate = await tx.repairPart.aggregate({
      where: { repairOrderId: repair.id },
      _sum: { totalCost: true },
    });
    await tx.repairOrder.update({
      where: { id: repair.id },
      data: { partsCost: aggregate._sum.totalCost ?? 0 },
    });
    return part;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function recordRepairPayment(input: {
  tenantId: string;
  branchId: string;
  repairOrderId: string;
  method: PaymentMethod;
  currency: string;
  amount: number;
  exchangeRate: number;
  reference?: string;
}) {
  const baseAmount = paymentToBase(input);
  return db.$transaction(async (tx) => {
    const repair = await tx.repairOrder.findUniqueOrThrow({ where: { id: input.repairOrderId } });
    if (repair.tenantId !== input.tenantId || repair.branchId !== input.branchId) {
      throw new Error("Cross-tenant or branch repair payment is forbidden");
    }
    const payment = await tx.payment.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        repairOrderId: repair.id,
        method: input.method,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        exchangeRate: input.exchangeRate,
        baseAmount,
        reference: input.reference,
      },
    });
    const aggregate = await tx.payment.aggregate({
      where: { repairOrderId: repair.id, status: "POSTED" },
      _sum: { baseAmount: true },
    });
    const paidTotal = Number(aggregate._sum.baseAmount ?? 0);
    await tx.repairOrder.update({
      where: { id: repair.id },
      data: {
        paidTotal,
        balanceDue: Math.max(Number(repair.finalPrice) - paidTotal, 0),
      },
    });
    return payment;
  });
}

export async function finalizeRepairFinancials(input: {
  tenantId: string;
  actorId: string;
  repairOrderId: string;
  finalPrice: number;
  laborCost: number;
  directCost: number;
}) {
  return db.$transaction(async (tx) => {
    const repair = await tx.repairOrder.findUniqueOrThrow({
      where: { id: input.repairOrderId },
      include: { parts: true },
    });
    const actor = await tx.user.findUniqueOrThrow({ where: { id: input.actorId } });
    assertTenant([repair.tenantId, actor.tenantId], input.tenantId, "Cross-tenant financial finalization is forbidden");
    const truth = calculateRepairTruth({
      finalPrice: input.finalPrice,
      partCosts: repair.parts.map((part) => Number(part.totalCost)),
      laborCost: input.laborCost,
      directCost: input.directCost,
      paidTotal: Number(repair.paidTotal),
    });
    const updated = await tx.repairOrder.update({
      where: { id: repair.id },
      data: {
        finalPrice: input.finalPrice,
        serviceAmount: input.finalPrice - truth.partsCost,
        laborCost: input.laborCost,
        directCost: input.directCost,
        partsCost: truth.partsCost,
        balanceDue: truth.balanceDue,
      },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        branchId: repair.branchId,
        actorId: actor.id,
        action: "repair.financials.finalized",
        entityType: "RepairOrder",
        entityId: repair.id,
        after: { ...truth, finalPrice: input.finalPrice },
      },
    });
    return { repair: updated, ...truth };
  });
}

export async function issueRepairWarranty(input: {
  tenantId: string;
  branchId: string;
  repairOrderId: string;
  number: string;
  days: number;
  terms: string;
}) {
  if (!Number.isInteger(input.days) || input.days <= 0) throw new Error("Warranty days must be positive");
  const repair = await db.repairOrder.findUniqueOrThrow({ where: { id: input.repairOrderId } });
  if (repair.tenantId !== input.tenantId || repair.branchId !== input.branchId) {
    throw new Error("Cross-tenant warranty is forbidden");
  }
  if (repair.status !== RepairStatus.DELIVERED) throw new Error("Warranty requires delivered repair");
  const startsAt = repair.deliveredAt ?? new Date();
  const expiresAt = new Date(startsAt.getTime() + input.days * 86_400_000);
  return db.warranty.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      repairOrderId: repair.id,
      number: input.number,
      startsAt,
      expiresAt,
      terms: input.terms,
    },
  });
}
