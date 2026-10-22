import { randomUUID } from "node:crypto";
import { PaymentMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { checkoutSale, type CheckoutInput } from "@/modules/sell/sell-service";
import { postSaleReturn } from "@/modules/sell/return-service";
const runDb = process.env.DATABASE_URL ? describe : describe.skip;
async function fixture(stock = 5) {
  const token = randomUUID();
  const tenant = await db.tenant.create({ data: { slug: `pos-stock-${token}`, name: "POS quantity test" } });
  const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
  const actor = await db.user.create({ data: { tenantId: tenant.id, branchId: branch.id, email: `${token}@example.test`, displayName: "Cashier", passwordHash: "test-only" } });
  const category = await db.category.create({ data: { tenantId: tenant.id, code: "ACC", nameAr: "ملحقات", nameEn: "Accessories" } });
  const product = await db.product.create({ data: { tenantId: tenant.id, categoryId: category.id, sku: "CASE", nameAr: "غطاء", nameEn: "Case", type: "ACCESSORY", isSerialized: false, costAmount: 1, basePrice: 3, minimumPrice: 2 } });
  const location = await db.stockLocation.create({ data: { tenantId: tenant.id, branchId: branch.id, code: "SHOP", name: "Shop" } });
  await db.stockMovement.create({ data: { tenantId: tenant.id, branchId: branch.id, productId: product.id, toLocationId: location.id, type: "PURCHASE_RECEIPT", quantity: stock, unitCost: 1, idempotencyKey: `receipt-${token}` } });
  const input: CheckoutInput = { tenantId: tenant.id, branchId: branch.id, actorId: actor.id, number: `S-${token}`, invoiceNumber: `INV-${token}`, idempotencyKey: token,
    lines: [{ productId: product.id, stockLocationId: location.id, quantity: 3, finalPrice: 3 }], payments: [{ method: PaymentMethod.CASH, currency: "USD", exchangeRate: 1, amount: 9 }] };
  return { tenant, branch, actor, product, location, input };
}
runDb("POS nonserialized PostgreSQL", () => {
  it("deducts quantities atomically, audits balances, replays once and returns stock with reversal evidence", async () => {
    const { tenant, input, location } = await fixture();
    const sale = await checkoutSale(input);
    expect((await checkoutSale({ ...input, idempotencyKey: ` ${input.idempotencyKey} ` })).id).toBe(sale.id);
    expect(Number(sale.total)).toBe(9); expect(sale.invoice).not.toBeNull();
    expect(await db.stockMovement.count({ where: { referenceType: "Sale", referenceId: sale.id } })).toBe(1);
    const audit = await db.auditEvent.findFirstOrThrow({ where: { tenantId: tenant.id, entityId: sale.id, action: "sale.checkout" } });
    expect(audit.before).toMatchObject({ sale: null, stock: [{ quantity: 5 }] });
    expect(audit.after).toMatchObject({ stock: [{ quantity: 2 }], status: "COMPLETED" });
    expect(await db.auditEvent.count({ where: { entityId: sale.id, action: "sale.checkout" } })).toBe(1);
    await expect(checkoutSale({ ...input, lines: [{ ...input.lines[0], quantity: 2 }] })).rejects.toThrow("SALE_IDEMPOTENCY_CONFLICT");
    const returned = await postSaleReturn({ tenantId: input.tenantId, branchId: input.branchId, actorId: input.actorId, saleId: sale.id, number: `R-${input.number}`, reason: "Quantity return test", idempotencyKey: `return-${input.idempotencyKey}`, lines: [{ originalSaleLineId: sale.lines[0].id, stockLocationId: location.id, quantity: 1 }] });
    expect(Number(returned.refundBase)).toBe(3);
    expect(await db.stockMovement.count({ where: { tenantId: tenant.id, type: "RETURN", toLocationId: location.id } })).toBe(1);
  }, 30000);
  it("rolls back insufficient stock, including repeated product lines", async () => {
    const { tenant, input } = await fixture(5);
    await expect(checkoutSale({ ...input, lines: [input.lines[0], input.lines[0]], payments: [{ ...input.payments[0], amount: 18 }] })).rejects.toThrow("Insufficient stock");
    expect(await db.sale.count({ where: { tenantId: tenant.id } })).toBe(0);
    expect(await db.stockMovement.count({ where: { tenantId: tenant.id, type: "SALE" } })).toBe(0);
    expect(await db.auditEvent.count({ where: { tenantId: tenant.id } })).toBe(0);
  }, 30000);
  it("rejects cross-branch actor, location and replay, cross-tenant products, inactive actors and price floor bypass", async () => {
    const { tenant, input } = await fixture();
    const other = await fixture();
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "OTHER", name: "Other" } });
    await expect(checkoutSale({ ...input, branchId: branch.id })).rejects.toThrow("actor branch");
    await expect(checkoutSale({ ...input, lines: [{ ...input.lines[0], stockLocationId: other.location.id }] })).rejects.toThrow("stock location");
    await expect(checkoutSale({ ...input, lines: [{ ...input.lines[0], productId: other.product.id }] })).rejects.toThrow("product");
    await expect(checkoutSale({ ...input, lines: [{ ...input.lines[0], finalPrice: 1 }] })).rejects.toThrow();
    await checkoutSale(input);
    await expect(checkoutSale({ ...input, branchId: branch.id })).rejects.toThrow("SALE_IDEMPOTENCY_CONFLICT");
    await db.user.update({ where: { id: input.actorId }, data: { isActive: false } });
    await expect(checkoutSale(input)).rejects.toThrow("actor branch");
  }, 30000);
  it("blocks duplicate/invalid returns, scoped replay conflicts and cumulative over-return", async () => {
    const { tenant, input, location } = await fixture();
    const sale = await checkoutSale(input);
    const line = { originalSaleLineId: sale.lines[0].id, stockLocationId: location.id, quantity: 2 };
    const request = { tenantId: input.tenantId, branchId: input.branchId, actorId: input.actorId, saleId: sale.id, number: `R-${input.number}`, reason: "Return test", idempotencyKey: `r-${input.idempotencyKey}`, lines: [line] };
    await expect(postSaleReturn({ ...request, lines: [line, line] })).rejects.toThrow("Duplicate original return line");
    await expect(postSaleReturn({ ...request, lines: [{ ...line, quantity: NaN }] })).rejects.toThrow("positive");
    const returned = await postSaleReturn(request);
    const returnAudit = await db.auditEvent.findFirstOrThrow({ where: { entityId: returned.id, action: "sale.return.posted" } });
    expect(returnAudit.before).toMatchObject({ status: "COMPLETED", lines: [{ returnedQuantity: 0 }] });
    expect(returnAudit.after).toMatchObject({ status: "PARTIALLY_RETURNED", lines: [{ quantity: 2, returnedQuantity: 2 }] });
    expect((await postSaleReturn({ ...request, idempotencyKey: ` ${request.idempotencyKey} ` })).id).toBe(returned.id);
    await expect(postSaleReturn({ ...request, lines: [{ ...line, quantity: 1 }] })).rejects.toThrow("RETURN_IDEMPOTENCY_CONFLICT");
    const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "OTHER", name: "Other" } });
    await expect(postSaleReturn({ ...request, branchId: branch.id })).rejects.toThrow("RETURN_IDEMPOTENCY_CONFLICT");
    await expect(postSaleReturn({ ...request, idempotencyKey: `second-${request.idempotencyKey}`, number: `second-${request.number}` })).rejects.toThrow("exceeds");
    expect(await db.saleReturn.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(await db.stockMovement.count({ where: { tenantId: tenant.id, type: "RETURN" } })).toBe(1);
    await db.user.update({ where: { id: input.actorId }, data: { isActive: false } });
    await expect(postSaleReturn(request)).rejects.toThrow("actor branch");
  }, 30000);
  it("concurrent identical requests create once and can replay after a serialization conflict", async () => {
    const { tenant, input } = await fixture();
    const results = await Promise.allSettled([checkoutSale(input), checkoutSale(input)]);
    expect(results.some(result => result.status === "fulfilled")).toBe(true);
    const replay = await checkoutSale(input);
    for (const result of results) if (result.status === "fulfilled") expect(result.value.id).toBe(replay.id);
    expect(await db.sale.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(await db.stockMovement.count({ where: { tenantId: tenant.id, type: "SALE" } })).toBe(1);
  }, 30000);
  it("concurrent buyers cannot oversell the same balance", async () => {
    const { tenant, input } = await fixture(3);
    const results = await Promise.allSettled([checkoutSale(input), checkoutSale({ ...input, idempotencyKey: randomUUID(), number: `other-${input.number}`, invoiceNumber: `other-${input.invoiceNumber}` })]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await db.sale.count({ where: { tenantId: tenant.id } })).toBe(1);
    expect(await db.stockMovement.count({ where: { tenantId: tenant.id, type: "SALE" } })).toBe(1);
  }, 30000);
});
