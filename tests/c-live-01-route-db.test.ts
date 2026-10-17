import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { bootstrapStore } from "@/server/bootstrap-service";

type Context = { actorId:string; tenantId:string; branchId:string; permissions:Set<string> };
let active: Context | null = null;
vi.mock("@/server/auth-http", async (getOriginal) => {
  const original = await getOriginal<typeof import("@/server/auth-http")>();
  return { ...original, currentStoreContext: async (permission?:string) => {
    if (!active) throw new Error("AUTH_REQUIRED");
    if (permission && !active.permissions.has(permission)) throw new Error("PERMISSION_DENIED");
    return active;
  }};
});
const runDb = process.env.DATABASE_URL ? describe : describe.skip;
runDb("C-LIVE-01 HTTP route DB integration", () => {
  let route: typeof import("@/app/api/ops/live-01/route");
  const prev = process.env.A1_MOBI_C_LIVE_01_ENABLED;
  let ctx1: Context;
  let ctx2: Context;
  const base = process.env.APP_ORIGIN || "http://127.0.0.1:3185";
  async function post(body: unknown) {
    return route.POST(new Request(base + "/api/ops/live-01", {
      method:"POST",headers:{"content-type":"application/json",origin:base},body:JSON.stringify(body),
    }));
  }
  beforeAll(async () => {
    process.env.A1_MOBI_C_LIVE_01_ENABLED = "1";
    const id = randomUUID().slice(0,8);
    const owner1 = await bootstrapStore({tenantSlug:"clive-a-"+id,tenantName:"C Live A",branchCode:"MAIN",
      branchName:"Main",ownerEmail:"owner-a-"+id+"@example.test",ownerDisplayName:"A",
      ownerPassword:"Test-only-pilot-owner-"+id,locale:"ar"});
    const owner2 = await bootstrapStore({tenantSlug:"clive-b-"+id,tenantName:"C Live B",branchCode:"MAIN",
      branchName:"Main",ownerEmail:"owner-b-"+id+"@example.test",ownerDisplayName:"B",
      ownerPassword:"Test-only-pilot-owner-"+id,locale:"ar"});
    const grants = new Set(["foundation.manage","inventory.read","sell.create","reports.read"]);
    ctx1={actorId:owner1.ownerId,tenantId:owner1.tenantId,branchId:owner1.branchId,permissions:grants};
    ctx2={actorId:owner2.ownerId,tenantId:owner2.tenantId,branchId:owner2.branchId,permissions:grants};
    route = await import("@/app/api/ops/live-01/route");
  });
  afterAll(() => {
    active = null;
    if (prev === undefined) delete process.env.A1_MOBI_C_LIVE_01_ENABLED;
    else process.env.A1_MOBI_C_LIVE_01_ENABLED=prev;
  });

  it("persists catalog, IMEI stock intake, cash invoice, and isolates stores", async () => {
    active=ctx1;
    const sku="C-LIVE-"+randomUUID().slice(0,8);
    const created=await post({action:"createProduct",sku,brand:"TESTBRAND",model:"Device",
      variant:"256GB",nameAr:"هاتف اختبار",nameEn:"Pilot Device",unitCost:300,price:500});
    expect(created.status).toBe(201);
    const product=await created.json();
    expect(product.id).toBeTruthy();
    const state1=await (await route.GET()).json();
    expect(state1.products.some((p:{sku:string})=>p.sku===sku)).toBe(true);

    active=ctx2;
    const state2=await (await route.GET()).json();
    expect(state2.products.some((p:{sku:string})=>p.sku===sku)).toBe(false);
    active=ctx1;
    const received=await post({action:"receive",productId:product.id,variantId:product.variantId,
      locationId:product.locationId,imei:"352099001761481",unitCost:300,idempotencyKey:randomUUID()});
    expect(received.status).toBe(201);
    const device=await received.json();
    const afterIntake=await (await route.GET()).json();
    expect(afterIntake.devices.find((d:{id:string})=>d.id===device.id)?.status).toBe("IN_STOCK");
    expect(afterIntake.counts.availableDevices).toBe(state1.counts.availableDevices+1);

    active=ctx2;
    const blocked=await post({action:"sell",deviceId:device.id,idempotencyKey:randomUUID()});
    expect(blocked.status).toBe(409);
    active=ctx1;
    const sold=await post({action:"sell",deviceId:device.id,idempotencyKey:randomUUID()});
    expect(sold.status).toBe(201);
    const sale=await sold.json();
    expect(sale.invoiceNumber).toMatch(/^INV-/);
    const afterSale=await (await route.GET()).json();
    expect(afterSale.devices.find((d:{id:string})=>d.id===device.id)?.status).toBe("SOLD");
    expect(afterSale.sales.find((s:{id:string})=>s.id===sale.id)?.total).toBe(500);
    const persisted=await db.invoice.findFirst({where:{tenantId:ctx1.tenantId,number:sale.invoiceNumber}});
    expect(persisted).not.toBeNull();
    const second=await post({action:"sell",deviceId:device.id,idempotencyKey:randomUUID()});
    expect(second.status).toBe(409);
    active=ctx2;
    const foreign=await (await route.GET()).json();
    expect(foreign.sales.some((s:{id:string})=>s.id===sale.id)).toBe(false);
  });

  it("enforces authenticated permission and pilot feature gate", async () => {
    active=null;
    expect((await route.GET()).status).toBe(401);
    active={...ctx1,permissions:new Set(["inventory.read"])};
    expect((await post({action:"createProduct",sku:"DENIED",brand:"BRAND",model:"AA",variant:"BB",
      nameAr:"DENIED",nameEn:"DENIED",unitCost:1,price:2})).status).toBe(403);
    active=ctx1;
    process.env.A1_MOBI_C_LIVE_01_ENABLED="0";
    expect((await route.GET()).status).toBe(404);
    process.env.A1_MOBI_C_LIVE_01_ENABLED="1";
  });
});
