import { beforeEach, describe, expect, it, vi } from "vitest";
import { billingStatusLabel, entitlementLabel, planLabel, roleLabel } from "@/core/config/display-labels";
const mocks = vi.hoisted(() => ({ context: vi.fn(), open: vi.fn() }));
vi.mock("@/server/auth-http", () => ({
 currentStoreContext: mocks.context,
 sameOriginMutation: (r: Request) => r.headers.get("origin") === "http://localhost:3000",
 authJson: (body: unknown, status = 200) => Response.json(body, { status }),
}));
vi.mock("@/modules/cash/cash-service", () => ({ openCashSession: mocks.open }));
import { POST } from "@/app/api/ops/cash/open/route";
const valid = { openingUsd: 20, openingLbp: 100000, openingExchangeRate: 89500, confirmed: true };
function request(body: unknown, origin = "http://localhost:3000") {
 return new Request("http://localhost:3000/api/ops/cash/open", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
}
describe("Closure acceptance: cash opening boundary", () => {
 beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED", "1"); mocks.context.mockResolvedValue({ tenantId: "tenant", branchId: "branch", actorId: "owner" }); mocks.open.mockResolvedValue({ id: "session", status: "OPEN" }); });
 it("uses authenticated tenant and cash permission, returning the saved session", async () => {
  const response = await POST(request(valid)); expect(response.status).toBe(200);
  expect(mocks.context).toHaveBeenCalledWith("cash.manage");
  expect(mocks.open).toHaveBeenCalledWith({ tenantId: "tenant", branchId: "branch", actorId: "owner", openingUsd: 20, openingLbp: 100000, openingExchangeRate: 89500 });
  expect(await response.json()).toEqual({ cashSessionId: "session", status: "OPEN" });
 });
 it("rejects cross-origin mutations before calling the service", async () => { expect((await POST(request(valid,"https://foreign.test"))).status).toBe(403); expect(mocks.open).not.toHaveBeenCalled(); });
 it.each([{...valid,openingUsd:-1},{...valid,openingExchangeRate:0},{...valid,confirmed:false},{...valid,tenantId:"foreign"}])("rejects invalid or caller-selected scope", async body => { expect((await POST(request(body))).status).toBe(400); expect(mocks.open).not.toHaveBeenCalled(); });
 it.each([["AUTH_REQUIRED",401],["PERMISSION_DENIED",403],["Branch already has an open cash session",409]] as const)("handles %s", async (code,status) => { mocks.context.mockRejectedValueOnce(new Error(code)); expect((await POST(request(valid))).status).toBe(status); expect(mocks.open).not.toHaveBeenCalled(); });
 it("retains the feature gate", async () => { vi.stubEnv("A1_MOBI_C_LIVE_01_ENABLED","0"); expect((await POST(request(valid))).status).toBe(404); expect(mocks.open).not.toHaveBeenCalled(); });
});
describe("Closure acceptance: owner-facing labels", () => {
 it("localizes known roles while retaining custom owner names", () => { expect(roleLabel({code:"owner",name:"Owner"},"ar")).toBe("صاحب المتجر"); expect(roleLabel({code:"custom",name:"Shift lead"},"en")).toBe("Shift lead"); });
 it("hides unknown billing codes", () => { expect(billingStatusLabel("BILLING_INTERNAL_FAILURE","en")).toBe("Contact support"); expect(entitlementLabel("secret.internal","en")).toBe("Subscription feature"); expect(planLabel("internal-plan-id","en")).toBe("Store plan"); expect(billingStatusLabel("active","ar")).toBe("نشط"); });
});
