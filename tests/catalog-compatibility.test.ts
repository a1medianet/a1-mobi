import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  context: vi.fn(), product: vi.fn(), variant: vi.fn(), existing: vi.fn(), create: vi.fn(), remove: vi.fn(), audit: vi.fn(), list: vi.fn(),
}));
vi.mock("@/server/db", () => ({ db: {
  product: { findFirst: m.product },
  productCompatibility: { findMany: m.list },
  $transaction: async (fn: (tx: unknown) => unknown) => fn({
    product: { findFirst: m.product }, deviceVariant: { findFirst: m.variant },
    productCompatibility: { findUnique: m.existing, create: m.create, delete: m.remove },
    auditEvent: { create: m.audit },
  }),
} }));
vi.mock("@/server/auth-http", () => ({
  currentStoreContext: m.context,
  sameOriginMutation: (request: Request) => request.headers.get("origin") === "http://localhost",
  authJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
import { GET, POST } from "@/app/api/ops/catalog/compatibility/route";
const ctx = { tenantId: "tenant-a", branchId: "branch-a", actorId: "owner-a" };
const post = (action: string, extra: Record<string, unknown> = {}, origin = "http://localhost") =>
  POST(new Request("http://localhost/api/ops/catalog/compatibility", {
    method: "POST", headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ action, productId: "part-a", deviceVariantId: "variant-a", ...extra }),
  }));

describe("parts compatibility scope and audit", () => {
  beforeEach(() => {
    vi.resetAllMocks(); m.context.mockResolvedValue(ctx);
    m.product.mockResolvedValue({ id: "part-a" }); m.variant.mockResolvedValue({ id: "variant-a" });
    m.existing.mockResolvedValue(null); m.list.mockResolvedValue([]);
  });
  it("filters list by tenant and PART product", async () => {
    const response = await GET(new Request("http://localhost/api/ops/catalog/compatibility?productId=part-a"));
    expect(response.status).toBe(200);
    expect(m.product.mock.calls[0][0].where).toEqual({ id: "part-a", tenantId: "tenant-a", type: "PART" });
    expect(m.list.mock.calls[0][0].where).toEqual({ productId: "part-a", deviceVariant: { tenantId: "tenant-a" } });
  });
  it("rejects invalid input and other origins", async () => {
    expect((await post("link", {}, "https://other.test")).status).toBe(403);
    expect((await post("link", { tenantId: "tenant-b" })).status).toBe(400);
    expect(m.create).not.toHaveBeenCalled();
  });
  it("does not link a device variant from another tenant", async () => {
    m.variant.mockResolvedValue(null);
    expect((await post("link")).status).toBe(404);
    expect(m.create).not.toHaveBeenCalled();
    expect(m.audit).not.toHaveBeenCalled();
  });
  it("creates manually verified link and audits the change", async () => {
    expect((await post("link", { notes: "Confirmed by repair team" })).status).toBe(200);
    expect(m.variant.mock.calls[0][0].where).toEqual({ id: "variant-a", tenantId: "tenant-a" });
    expect(m.create.mock.calls[0][0].data).toMatchObject({ productId: "part-a", deviceVariantId: "variant-a", source: "manual" });
    expect(m.audit.mock.calls[0][0].data).toMatchObject({ ...ctx, action: "catalog.compatibility.link" });
  });
  it("rejects duplicate link without altering the existing entry", async () => {
    m.existing.mockResolvedValue({ source: "manual" });
    expect((await post("link")).status).toBe(409);
    expect(m.create).not.toHaveBeenCalled();
    expect(m.audit).not.toHaveBeenCalled();
  });
  it("unlinks with before/after audit", async () => {
    m.existing.mockResolvedValue({ source: "manual", notes: null });
    expect((await post("unlink")).status).toBe(200);
    expect(m.remove).toHaveBeenCalledTimes(1);
    expect(m.audit.mock.calls[0][0].data).toMatchObject({ action: "catalog.compatibility.unlink", before: { deviceVariantId: "variant-a" } });
  });
  it("requires manager permission", async () => {
    m.context.mockRejectedValue(new Error("PERMISSION_DENIED"));
    expect((await post("link")).status).toBe(403);
    expect(m.create).not.toHaveBeenCalled();
  });
});
