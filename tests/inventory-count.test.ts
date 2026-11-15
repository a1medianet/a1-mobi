import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { $transaction: mocks.transaction } }));
import { postStockCount, previewStockCount } from "@/modules/inventory/count-service";

const scope = { tenantId: "tenant", branchId: "branch", actorId: "actor", productId: "product", locationId: "location" };
const request = () => ({ ...scope, idempotencyKey: randomUUID(), version: "a".repeat(64), countedQty: 0, reason: "Shelf count" });
describe("count service boundary", () => {
 beforeEach(() => vi.resetAllMocks());
 it.each([{ countedQty: -1 }, { countedQty: Infinity }, { countedQty: 0.5 }, { reason: " " }, { reason: "x".repeat(501) }, { version: "bad" }, { idempotencyKey: "bad" }])("rejects invalid direct input before a transaction: %j", async extra => {
  await expect(postStockCount({ ...request(), ...extra })).rejects.toThrow("INVALID_COUNT");
  expect(mocks.transaction).not.toHaveBeenCalled();
 });
 it.each([[], [{ role: { tenantId: "foreign", permissions: [{ permission: { code: "foundation.manage" } }] } }], [{ role: { tenantId: "tenant", permissions: [{ permission: { code: "inventory.read" } }] } }]])("requires a same-tenant management grant", async (...roles) => {
  const findMany = vi.fn();
  mocks.transaction.mockImplementation(async callback => callback({
   user: { findFirst: vi.fn().mockResolvedValue({ userRoles: roles.flat() }) },
   product: { findFirst: vi.fn().mockResolvedValue({ costAmount: 1 }) },
   stockLocation: { findFirst: vi.fn().mockResolvedValue({ id: "location" }) },
   stockMovement: { findMany },
  }));
  await expect(previewStockCount(scope)).rejects.toThrow("PERMISSION_DENIED");
  expect(findMany).not.toHaveBeenCalled();
 });
});
