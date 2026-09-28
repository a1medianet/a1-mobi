import { db } from "@/server/db";
import { normalizePhone, validateCustomerName } from "./customer-rules";

export async function registerCustomer(input: {
  tenantId: string;
  branchId: string;
  actorId: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}) {
  const name = validateCustomerName(input.name);
  const phoneNormalized = normalizePhone(input.phone);
  return db.$transaction(async (tx) => {
    const [branch, actor] = await Promise.all([
      tx.branch.findUniqueOrThrow({ where: { id: input.branchId } }),
      tx.user.findUniqueOrThrow({ where: { id: input.actorId } }),
    ]);
    if (branch.tenantId !== input.tenantId || actor.tenantId !== input.tenantId) {
      throw new Error("Cross-tenant customer registration is forbidden");
    }
    const duplicate = await tx.customer.findUnique({
      where: { tenantId_phoneNormalized: { tenantId: input.tenantId, phoneNormalized } },
    });
    if (duplicate) throw new Error("A customer with this phone already exists");

    const customer = await tx.customer.create({
      data: {
        tenantId: input.tenantId,
        createdBranchId: input.branchId,
        name,
        phone: input.phone.trim(),
        phoneNormalized,
        email: input.email?.trim().toLowerCase(),
        notes: input.notes?.trim(),
        debtAccount: { create: { tenantId: input.tenantId, currency: "USD" } },
      },
      include: { debtAccount: true },
    });
    await tx.auditEvent.create({
      data: {
        tenantId: input.tenantId,
        branchId: input.branchId,
        actorId: actor.id,
        action: "customer.created",
        entityType: "Customer",
        entityId: customer.id,
        after: { name: customer.name, phoneNormalized },
      },
    });
    return customer;
  });
}

export async function attachCustomerDevice(input: {
  tenantId: string;
  customerId: string;
  description: string;
  serializedDeviceId?: string;
  variantId?: string;
  imei?: string;
  serialNumber?: string;
}) {
  return db.$transaction(async (tx) => {
    const customer = await tx.customer.findUniqueOrThrow({ where: { id: input.customerId } });
    if (customer.tenantId !== input.tenantId) throw new Error("Cross-tenant customer device is forbidden");
    if (input.serializedDeviceId) {
      const device = await tx.serializedDevice.findUniqueOrThrow({ where: { id: input.serializedDeviceId } });
      if (device.tenantId !== input.tenantId) throw new Error("Cross-tenant serialized device is forbidden");
    }
    if (input.variantId) {
      const variant = await tx.deviceVariant.findUniqueOrThrow({ where: { id: input.variantId } });
      if (variant.tenantId !== input.tenantId) throw new Error("Cross-tenant device variant is forbidden");
    }
    return tx.customerDevice.create({
      data: {
        tenantId: input.tenantId,
        customerId: customer.id,
        description: input.description.trim(),
        serializedDeviceId: input.serializedDeviceId,
        variantId: input.variantId,
        imei: input.imei?.trim(),
        serialNumber: input.serialNumber?.trim(),
      },
    });
  });
}

export async function getCustomerTimeline(tenantId: string, customerId: string) {
  return db.customer.findFirstOrThrow({
    where: { id: customerId, tenantId },
    include: {
      devices: true,
      sales: { orderBy: { occurredAt: "desc" }, include: { invoice: true } },
      repairs: { orderBy: { intakeAt: "desc" }, include: { warranties: true } },
      debtAccount: { include: { entries: { orderBy: { occurredAt: "desc" } } } },
    },
  });
}
