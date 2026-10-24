import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  context: vi.fn(), transaction: vi.fn(),
  location: vi.fn(), products: vi.fn(), existing: vi.fn(), previous: vi.fn(),
  movement: vi.fn(), audit: vi.fn(),
}));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));
vi.mock("@/server/auth-http", () => ({
  currentStoreContext: mocks.context,
  sameOriginMutation: (request: Request) => request.headers.get("origin") === "http://127.0.0.1",
  authJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/modules/inventory/inventory-service", () => ({ registerProduct: vi.fn(), receiveSerializedDevice: vi.fn() }));
vi.mock("@/modules/device-trust/device-trust-service", () => ({ checkDeviceTrust: vi.fn() }));
vi.mock("@/modules/sell/sell-service", () => ({ checkoutSale: vi.fn() }));
import { POST } from "@/app/api/ops/live-01/route";

const ctx = { tenantId: "tenant-a", branchId: "branch-a", actorId: "owner-a" };
const lines = [{ productId: "product-a", quantity: 2, unitCost: 1.25 }, { productId: "product-b", quantity: 3, unitCost: 0 }];
let key: string;
const post = (override = {}) => POST(new Request("http://127.0.0.1/api/ops/live-01", {
  method: "POST", headers: { origin: "http://127.0.0.1", "content-type": "application/json" },
  body: JSON.stringify({ action: "receiveBulk", locationId: "location-a", lines, idempotencyKey: key, ...override }),
}));

describe("receiveBulk route without PostgreSQL", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED", "1");
    key = randomUUID();
    mocks.context.mockResolvedValue(ctx);
    mocks.location.mockResolvedValue({ id: "location-a" });
    mocks.products.mockResolvedValue(lines.map(line => ({ id: line.productId })));
    mocks.existing.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async callback => callback({
      stockLocation: { findFirst: mocks.location }, product: { findMany: mocks.products },
      stockMovement: { findFirst: mocks.existing, findMany: mocks.previous, create: mocks.movement },
      auditEvent: { create: mocks.audit },
    }));
  });
  afterEach(() => vi.unstubAllEnvs());

  it("writes scoped movements and audit inside one transaction", async () => {
    const response = await post();
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ received: 2, alreadyProcessed: false });
    expect(mocks.context).toHaveBeenCalledWith("foundation.manage");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.location).toHaveBeenCalledWith({ where: { id: "location-a", tenantId: ctx.tenantId, branchId: ctx.branchId } });
    expect(mocks.products).toHaveBeenCalledWith({ where: { tenantId: ctx.tenantId, id: { in: lines.map(line => line.productId) }, isActive: true, isSerialized: false } });
    for (const [index, line] of lines.entries()) expect(mocks.movement).toHaveBeenNthCalledWith(index + 1, { data: {
      tenantId: ctx.tenantId, branchId: ctx.branchId, ...line, toLocationId: "location-a", type: "PURCHASE_RECEIPT",
      idempotencyKey: index === 0 ? key : key + ":" + index, referenceType: "BULK_RECEIPT", referenceId: key,
    } });
    expect(mocks.audit).toHaveBeenCalledWith({ data: { ...ctx, action: "inventory.bulk-purchase.received", entityType: "StockMovement", entityId: key, after: { locationId: "location-a", lines } } });
  });

  it("replays identical lines in any order without writes", async () => {
    mocks.existing.mockResolvedValue({ id: "existing" });
    mocks.previous.mockResolvedValue([...lines].reverse().map(line => ({ ...line, branchId: ctx.branchId, toLocationId: "location-a", type: "PURCHASE_RECEIPT" })));
    const response = await post();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ alreadyProcessed: true });
    expect(mocks.previous).toHaveBeenCalledWith({ where: { tenantId: ctx.tenantId, referenceType: "BULK_RECEIPT", referenceId: key } });
    expect(mocks.movement).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(["branchId", "toLocationId", "quantity", "unitCost", "productId", "type", "missing"])("rejects replay mismatch: %s", async field => {
    mocks.existing.mockResolvedValue({ id: "existing" });
    const rows = lines.map(line => ({ ...line, branchId: ctx.branchId, toLocationId: "location-a", type: "PURCHASE_RECEIPT" }));
    if (field === "missing") rows.pop();
    else Object.assign(rows[0], { [field]: field === "quantity" || field === "unitCost" ? 99 : "different" });
    mocks.previous.mockResolvedValue(rows);
    expect((await post()).status).toBe(409);
    expect(mocks.movement).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each([[], [lines[0], lines[0]], [{ ...lines[0], quantity: 0 }], [{ ...lines[0], quantity: 1.5 }], [{ ...lines[0], unitCost: -1 }]].map(invalid => ({ invalid })))("rejects invalid receipt lines %# before transaction", async (...args) => {
    const invalid = args[0]?.invalid;
    expect((await post({ lines: invalid })).status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each(["location", "products"])("rejects unavailable scoped %s without writes", async target => {
    if (target === "location") mocks.location.mockResolvedValue(null);
    else mocks.products.mockResolvedValue([]);
    expect((await post()).status).toBe(target === "location" ? 409 : 400);
    expect(mocks.movement).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it.each(["AUTH_REQUIRED", "PERMISSION_DENIED"])("blocks %s before DB access", async code => {
    mocks.context.mockRejectedValue(new Error(code));
    expect((await post()).status).toBe(code === "AUTH_REQUIRED" ? 401 : 403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("sanitizes transaction failures", async () => {
    mocks.movement.mockRejectedValue(new Error("private SQL details"));
    const response = await post();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "OPERATION_REJECTED" });
    expect(mocks.audit).not.toHaveBeenCalled();
  });
});
