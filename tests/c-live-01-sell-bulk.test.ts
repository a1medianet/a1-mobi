import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ context: vi.fn(), location: vi.fn(), products: vi.fn(), tenant: vi.fn(), checkout: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { stockLocation: { findFirst: mocks.location }, product: { findMany: mocks.products }, tenant: { findUniqueOrThrow: mocks.tenant } } }));
vi.mock("@/server/auth-http", () => ({ currentStoreContext: mocks.context, sameOriginMutation: (r: Request) => r.headers.get("origin") === "http://127.0.0.1", authJson: (body: unknown, status = 200) => Response.json(body, { status }) }));
vi.mock("@/modules/inventory/inventory-service", () => ({ registerProduct: vi.fn(), receiveSerializedDevice: vi.fn() }));
vi.mock("@/modules/device-trust/device-trust-service", () => ({ checkDeviceTrust: vi.fn() }));
vi.mock("@/modules/sell/sell-service", () => ({ checkoutSale: mocks.checkout }));
import { POST } from "@/app/api/ops/live-01/route";
const ctx = { tenantId: "tenant-a", branchId: "branch-a", actorId: "cashier-a" };
const lines = [{ productId: "product-a", quantity: 3 }];
let key: string;
const post = (override = {}, origin = "http://127.0.0.1") => POST(new Request("http://127.0.0.1/api/ops/live-01", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify({ action: "sellBulk", locationId: "location-a", lines, idempotencyKey: key, ...override }) }));
describe("nonserialized POS route", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED", "1"); key = randomUUID();
    mocks.context.mockResolvedValue(ctx); mocks.location.mockResolvedValue({ id: "location-a" });
    mocks.products.mockResolvedValue([{ id: "product-a", basePrice: 1.25 }]); mocks.tenant.mockResolvedValue({ baseCurrency: "USD" });
    mocks.checkout.mockResolvedValue({ id: "sale-a", number: "S-1", invoice: { number: "INV-1" }, status: "COMPLETED", lines });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("authorizes and sends server-priced quantity lines through checkoutSale", async () => {
    expect((await post()).status).toBe(201);
    expect(mocks.context).toHaveBeenCalledWith("sell.create");
    expect(mocks.location).toHaveBeenCalledWith({ where: { id: "location-a", tenantId: ctx.tenantId, branchId: ctx.branchId } });
    expect(mocks.products).toHaveBeenCalledWith({ where: { id: { in: ["product-a"] }, tenantId: ctx.tenantId, isActive: true, isSerialized: false } });
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ ...ctx, idempotencyKey: key,
      lines: [{ productId: "product-a", quantity: 3, stockLocationId: "location-a", finalPrice: 1.25 }],
      payments: [{ method: "CASH", currency: "USD", exchangeRate: 1, amount: 3.75 }] }));
  });
  it.each([[], [lines[0], lines[0]], [{ productId: "product-a", quantity: 0 }], [{ productId: "product-a", quantity: 1.2 }], [{ ...lines[0], finalPrice: 0 }]].map(invalid => ({ invalid })))("rejects invalid lines %#", async ({ invalid }) => {
    expect((await post({ lines: invalid })).status).toBe(400); expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("rejects tenant/branch payload injection and wrong origin", async () => {
    expect((await post({ tenantId: "other" })).status).toBe(400);
    expect((await post({}, "https://other.test")).status).toBe(403); expect(mocks.context).not.toHaveBeenCalled();
  });
  it.each(["AUTH_REQUIRED", "PERMISSION_DENIED"])("rejects %s before reading inventory", async code => {
    mocks.context.mockRejectedValue(new Error(code)); expect((await post()).status).toBe(code === "AUTH_REQUIRED" ? 401 : 403); expect(mocks.products).not.toHaveBeenCalled();
  });
  it.each(["location", "product", "currency"])("rejects unavailable %s", async field => {
    if (field === "location") mocks.location.mockResolvedValue(null);
    if (field === "product") mocks.products.mockResolvedValue([]);
    if (field === "currency") mocks.tenant.mockResolvedValue({ baseCurrency: "LBP" });
    expect((await post()).status).toBe(field === "currency" ? 400 : 409); expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it.each(["Insufficient stock", "SALE_IDEMPOTENCY_CONFLICT"])("reports conflict for %s", async reason => {
    mocks.checkout.mockRejectedValue(new Error(reason)); expect((await post()).status).toBe(409);
  });
  it.each(["P2034", "P2002"])("returns a safe retry conflict for %s", async code => {
    mocks.checkout.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("private SQL", { code, clientVersion: "test" }));
    const response = await post(); expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: code === "P2034" ? "RETRY_SAME_REQUEST" : "ALREADY_EXISTS" });
  });
  it("sanitizes domain failures", async () => {
    mocks.checkout.mockRejectedValue(new Error("private SQL"));
    const response = await post(); expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "OPERATION_REJECTED" });
  });
  it("honors the pilot switch", async () => { vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED", "0"); expect((await post()).status).toBe(404); expect(mocks.context).not.toHaveBeenCalled(); });
});
