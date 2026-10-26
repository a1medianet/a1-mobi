import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";

const databaseTarget = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null;
const runDb = databaseTarget && ["127.0.0.1", "localhost"].includes(databaseTarget.hostname)
  && databaseTarget.port === "5437" && databaseTarget.pathname === "/a1mobi"
  ? describe : describe.skip;

const auth = vi.hoisted(() => ({ context: vi.fn() }));
vi.mock("@/server/auth-http", () => ({
  currentStoreContext: auth.context,
  sameOriginMutation: (request: Request) => request.headers.get("origin") === "http://localhost",
  authJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
import { GET, POST } from "@/app/api/ops/catalog/compatibility/route";

const uri = "http://localhost/api/ops/catalog/compatibility";
const post = (action: "link" | "unlink", productId: string, deviceVariantId: string, notes?: string) =>
  POST(new Request(uri, { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" },
    body: JSON.stringify({ action, productId, deviceVariantId, ...(notes ? { notes } : {}) }) }));

async function tenantFixture(token: string) {
  const tenant = await db.tenant.create({ data: { slug: "compat-" + token, name: "Compatibility QA" } });
  const branch = await db.branch.create({ data: { tenantId: tenant.id, code: "MAIN", name: "Demo branch" } });
  const user = await db.user.create({ data: { tenantId: tenant.id, branchId: branch.id,
    email: token + "@example.test", displayName: "QA manager", passwordHash: "test-only" } });
  const category = await db.category.create({ data: { tenantId: tenant.id, code: "PART", nameAr: "قطع", nameEn: "Repair parts" } });
  const part = await db.product.create({ data: { tenantId: tenant.id, categoryId: category.id,
    sku: "SCREEN-A", nameAr: "شاشة", nameEn: "Display", type: "PART", basePrice: 70 } });
  const manufacturer = await db.manufacturer.create({ data: { tenantId: tenant.id, code: "QA", name: "QA Brand" } });
  const family = await db.deviceFamily.create({ data: { tenantId: tenant.id, manufacturerId: manufacturer.id, name: "Phones" } });
  const model = await db.deviceModel.create({ data: { tenantId: tenant.id, familyId: family.id, name: "QPhone" } });
  const variant = await db.deviceVariant.create({ data: { tenantId: tenant.id, modelId: model.id, name: "128GB" } });
  return { tenant, branch, user, part, variant };
}

runDb("real PostgreSQL catalog compatibility tenant gate", () => {
  it("persists links and audit, rejects foreign tenant variants, and unlinks with evidence", async () => {
    const a = await tenantFixture(randomUUID());
    const b = await tenantFixture(randomUUID());
    auth.context.mockResolvedValue({ tenantId: a.tenant.id, branchId: a.branch.id,
      actorId: a.user.id, permissions: new Set(["inventory.read", "foundation.manage"]) });
    const foreign = await post("link", a.part.id, b.variant.id);
    expect(foreign.status).toBe(404);
    expect(await db.productCompatibility.count({ where: { productId: a.part.id } })).toBe(0);
    expect((await post("link", a.part.id, a.variant.id, "QA verified")).status).toBe(200);
    expect((await post("link", a.part.id, a.variant.id)).status).toBe(409);
    const persisted = await db.productCompatibility.findUniqueOrThrow({ where: {
      productId_deviceVariantId: { productId: a.part.id, deviceVariantId: a.variant.id },
    } });
    expect(persisted.notes).toBe("QA verified");
    expect((await (await GET(new Request(uri + "?productId=" + a.part.id))).json()).compatibilities).toHaveLength(1);
    const visibleVariants = await (await GET(new Request(uri))).json();
    expect(visibleVariants.variants.map((item: { id: string }) => item.id)).toContain(a.variant.id);
    expect(visibleVariants.variants.map((item: { id: string }) => item.id)).not.toContain(b.variant.id);
    expect((await post("unlink", a.part.id, a.variant.id)).status).toBe(200);
    expect(await db.productCompatibility.count({ where: { productId: a.part.id } })).toBe(0);
    const audit = await db.auditEvent.findMany({ where: { tenantId: a.tenant.id,
      action: { in: ["catalog.compatibility.link", "catalog.compatibility.unlink"] } }, orderBy: { occurredAt: "asc" } });
    expect(audit.map(record => record.action)).toEqual(["catalog.compatibility.link", "catalog.compatibility.unlink"]);
    expect(audit[1].before).toMatchObject({ deviceVariantId: a.variant.id });
    expect(audit[1].after).toBeNull();
    expect(await db.auditEvent.count({ where: { tenantId: b.tenant.id, action: { startsWith: "catalog.compatibility." } } })).toBe(0);
  }, 45000);
});
