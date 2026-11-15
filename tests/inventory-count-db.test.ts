import { randomUUID } from "node:crypto";
import { PaymentMethod } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { checkoutSale, type CheckoutInput } from "@/modules/sell/sell-service";
import { previewStockCount, postStockCount } from "@/modules/inventory/count-service";
const target = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const runDb = target && ["127.0.0.1", "localhost"].includes(target.hostname) && target.port === "5437" ? describe : describe.skip;
async function fixture(stock = 5) {
  const token = randomUUID();
  const tenant = await db.tenant.create({ data: { slug: `pos-stock-${token}`, name: "POS quantity test" } });
  const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Main" } });
  const actor = await db.user.create({ data: { tenantId: tenant.id, branchId: branch.id, email: `${token}@example.test`, displayName: "Cashier", passwordHash: "test-only" } });
  const permission = await db.permission.upsert({ where: { code: "foundation.manage" }, update: {}, create: { code: "foundation.manage", description: "Manage foundation" } });
  await db.role.create({ data: { tenantId: tenant.id, code: "COUNT_OWNER", name: "Count owner", permissions: { create: { permissionId: permission.id } }, userRoles: { create: { userId: actor.id } } } });
  const category = await db.category.create({ data: { tenantId: tenant.id, code: "ACC", nameAr: "ملحقات", nameEn: "Accessories" } });
  const product = await db.product.create({ data: { tenantId: tenant.id, categoryId: category.id, sku: "CASE", nameAr: "غطاء", nameEn: "Case", type: "ACCESSORY", isSerialized: false, costAmount: 1, basePrice: 3, minimumPrice: 2 } });
  const location = await db.stockLocation.create({ data: { tenantId: tenant.id, branchId: branch.id, code: "SHOP", name: "Shop" } });
  await db.stockMovement.create({ data: { tenantId: tenant.id, branchId: branch.id, productId: product.id, toLocationId: location.id, type: "PURCHASE_RECEIPT", quantity: stock, unitCost: 1, idempotencyKey: `receipt-${token}` } });
  const input: CheckoutInput = { tenantId: tenant.id, branchId: branch.id, actorId: actor.id, number: `S-${token}`, invoiceNumber: `INV-${token}`, idempotencyKey: token,
    lines: [{ productId: product.id, stockLocationId: location.id, quantity: 3, finalPrice: 3 }], payments: [{ method: PaymentMethod.CASH, currency: "USD", exchangeRate: 1, amount: 9 }] };
  return { tenant, branch, actor, product, location, input };
}

runDb("count security and concurrency on local PostgreSQL", () => {
 async function setup() {
  const f = await fixture();
  const scope = {tenantId:f.tenant.id,branchId:f.branch.id,actorId:f.actor.id,productId:f.product.id,locationId:f.location.id};
  const preview = await previewStockCount(scope);
  return {...f,scope,request:{...scope,version:preview.version,countedQty:0,reason:"Shelf count",idempotencyKey:randomUUID()}};
 }
 it("revalidates role, branch, tenant and serialized restrictions including replay", async () => {
  const f=await setup(); const foreign=await setup();
  await expect(previewStockCount({...f.scope,productId:foreign.product.id})).rejects.toThrow("INVALID_COUNT_SCOPE");
  const branch=await db.branch.create({data:{tenantId:f.tenant.id,code:"OTHER",name:"Other"}});
  await expect(previewStockCount({...f.scope,branchId:branch.id})).rejects.toThrow("INVALID_COUNT_SCOPE");
  await db.product.update({where:{id:f.product.id},data:{isSerialized:true}});
  await expect(postStockCount(f.request)).rejects.toThrow("INVALID_COUNT_SCOPE");
  await db.product.update({where:{id:f.product.id},data:{isSerialized:false}});
  await postStockCount(f.request);
  await db.userRole.deleteMany({where:{userId:f.actor.id}});
  await expect(previewStockCount(f.scope)).rejects.toThrow("PERMISSION_DENIED");
  await expect(postStockCount(f.request)).rejects.toThrow("PERMISSION_DENIED");
  expect(await db.stockCount.count({where:{tenantId:f.tenant.id}})).toBe(1);
 },30000);
 it("concurrent identical adjustments persist one movement and one audit, then replay",async()=>{
  const f=await setup(); const results=await Promise.allSettled([postStockCount(f.request),postStockCount(f.request)]);
  expect(results.some(r=>r.status==="fulfilled")).toBe(true);
  const replay=await postStockCount(f.request);
  expect(replay.id).toBe(f.request.idempotencyKey);
  expect(await db.stockMovement.count({where:{tenantId:f.tenant.id,type:"COUNT_VARIANCE"}})).toBe(1);
  expect(await db.auditEvent.count({where:{tenantId:f.tenant.id,action:"inventory.count.posted"}})).toBe(1);
  expect((await previewStockCount(f.scope)).quantity).toBe(0);
  const audit=await db.auditEvent.findFirstOrThrow({where:{entityId:replay.id}});
  expect(audit.before).toMatchObject({quantity:5});expect(audit.after).toMatchObject({quantity:0,variance:-5});
 },30000);
 it("sale versus zero-count race cannot oversell or apply a stale adjustment",async()=>{
  const f=await setup();
  const results=await Promise.allSettled([postStockCount(f.request),checkoutSale(f.input)]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const balance=(await previewStockCount(f.scope)).quantity;
  expect([0,2]).toContain(balance);
  if(results[0].status==="fulfilled")await expect(checkoutSale(f.input)).rejects.toThrow("Insufficient stock");
  else await expect(postStockCount(f.request)).rejects.toThrow("STALE_COUNT");
 },30000);
 it("rejects malformed direct-service input without any writes",async()=>{
  const f=await setup();
  for(const extra of [{countedQty:-1},{countedQty:NaN},{countedQty:1.5},{reason:" "},{reason:"x".repeat(501)},{idempotencyKey:"bad"},{version:"bad"}]) {
   await expect(postStockCount({...f.request,...extra})).rejects.toThrow("INVALID_COUNT");
  }
  expect(await db.stockCount.count({where:{tenantId:f.tenant.id}})).toBe(0);
 },30000);
 it("replays after a later sale without restoring stock; corrections preserve original evidence",async()=>{
  const f=await setup();const request={...f.request,countedQty:7};
  const original=await postStockCount(request);
  const movement=await db.stockMovement.findFirstOrThrow({where:{referenceType:"StockCount",referenceId:original.id}});
  const audit=await db.auditEvent.findFirstOrThrow({where:{entityId:original.id}});
  await checkoutSale(f.input);
  expect((await postStockCount(request)).id).toBe(original.id);
  expect((await previewStockCount(f.scope)).quantity).toBe(4);
  const fresh=await previewStockCount(f.scope);
  await postStockCount({...request,idempotencyKey:randomUUID(),version:fresh.version,countedQty:2,reason:"Recount correction"});
  expect((await previewStockCount(f.scope)).quantity).toBe(2);
  expect(await db.stockMovement.findUniqueOrThrow({where:{id:movement.id}})).toEqual(movement);
  expect(await db.auditEvent.findUniqueOrThrow({where:{id:audit.id}})).toEqual(audit);
  expect(Number((await db.stockCountLine.findFirstOrThrow({where:{stockCountId:original.id}})).countedQty)).toBe(7);
 },30000);
});
