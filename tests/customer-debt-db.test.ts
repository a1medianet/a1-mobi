import { DeviceServiceContext, PaymentMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { checkDeviceTrust } from "@/modules/device-trust/device-trust-service";
import { registerCustomer, getCustomerTimeline } from "@/modules/customers/customer-service";
import { createRepairIntake } from "@/modules/repairs/repair-service";
import { getCustomerStatement, postDebtCharge, recordDebtRepayment } from "@/modules/debt/debt-service";

const runDb = process.env.DATABASE_URL ? describe : describe.skip;

runDb("customer and debt database integration", () => {
  it("prevents duplicate phone and supports multiple partial repayments", async () => {
    const suffix = Date.now().toString();
    const tenant = await db.tenant.create({ data: { slug: `debt-${suffix}`, name: "Stage 5 Test" } });
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
    const user = await db.user.create({
      data: {
        tenantId: tenant.id, branchId: branch.id,
        email: `owner-${suffix}@example.test`, displayName: "Owner", passwordHash: "test-only",
      },
    });
    const customer = await registerCustomer({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      name: "Ali Customer", phone: "+961 70 123 456",
    });
    await expect(registerCustomer({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      name: "Duplicate", phone: "00961-70-123-456",
    })).rejects.toThrow(/already exists/);

    const trustCheck = await checkDeviceTrust({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      context: DeviceServiceContext.REPAIR, devicePresent: true, imei: "356938035643809",
    });
    const repair = await createRepairIntake({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      trustCheckId: trustCheck.id,
      customerId: customer.id, number: `REP-DEBT-${suffix}`,
      customerName: customer.name, customerPhone: customer.phone,
      deviceDescription: "Customer phone", imei: "356938035643809", condition: "Used",
      accessories: [], reportedIssue: "No power",
    });
    await postDebtCharge({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      customerId: customer.id, repairOrderId: repair.id,
      amount: 100, reason: "Repair balance", idempotencyKey: `charge-${suffix}`,
    });
    await recordDebtRepayment({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      customerId: customer.id, method: PaymentMethod.CASH,
      currency: "USD", amount: 30, exchangeRate: 1,
      idempotencyKey: `payment-1-${suffix}`,
    });
    await recordDebtRepayment({
      tenantId: tenant.id, branchId: branch.id, actorId: user.id,
      customerId: customer.id, method: PaymentMethod.CASH,
      currency: "LBP", amount: 1_790_000, exchangeRate: 89_500,
      idempotencyKey: `payment-2-${suffix}`,
    });

    const statement = await getCustomerStatement(tenant.id, customer.id);
    const timeline = await getCustomerTimeline(tenant.id, customer.id);
    expect(statement.balance.toNumber()).toBe(50);
    expect(statement.entries.map((entry) => entry.kind)).toEqual(["CHARGE", "PAYMENT", "PAYMENT"]);
    expect(statement.entries[2].payment?.currency).toBe("LBP");
    expect(statement.entries[2].payment?.exchangeRate.toNumber()).toBe(89_500);
    expect(timeline.repairs).toHaveLength(1);
    expect(timeline.debtAccount?.entries).toHaveLength(3);
  }, 30_000);
});
