import { afterEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({ onboard: vi.fn(), budget: vi.fn() }));
vi.mock("@/server/attempt-budget", () => ({
  consumeSensitiveActionBudget: mocked.budget,
  AttemptBudgetExceeded: class AttemptBudgetExceeded extends Error {},
}));
vi.mock("@/server/trial-onboarding-service", () => ({ onboardMobiTrial: mocked.onboard }));
vi.mock("@/server/turnstile", () => ({verifyTurnstile: async () => "DISABLED"}));
import { POST } from "@/app/api/onboarding/trial/route";

const previousFlag = process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED;
const previousOrigin = process.env.APP_ORIGIN;
afterEach(() => {
  if (previousFlag === undefined) delete process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED;
  else process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED = previousFlag;
  if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = previousOrigin;
  vi.clearAllMocks();
});
const payload = {
  tenantSlug: "merchant-gate-example", tenantName: "Demo Merchant", branchCode: "MAIN",
  branchName: "Main Branch", ownerEmail: "admin@a1mobi.app", ownerDisplayName: "Owner",
  ownerPassword: "TemporaryPasswordOnly12345!", locale: "ar",
};
const request = (body: unknown) => new Request("https://mobi.example.test/api/onboarding/trial", {
  method: "POST", headers: { "content-type": "application/json", "origin": "https://mobi.example.test" },
  body: JSON.stringify(body),
});

describe("tenant registration cannot claim platform owner account", () => {
  it("rejects a platform-admin email without provisioning or starting Billing", async () => {
    process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED = "1";
    process.env.APP_ORIGIN = "https://mobi.example.test";
    const response = await POST(request(payload));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "PLATFORM_EMAIL_RESERVED" });
    expect(mocked.onboard).not.toHaveBeenCalled();
    expect(mocked.budget).not.toHaveBeenCalled();
  });
  it("keeps public trial disabled unless explicitly enabled", async () => {
    delete process.env.A1_MOBI_PUBLIC_TRIAL_ENABLED;
    process.env.APP_ORIGIN = "https://mobi.example.test";
    const response = await POST(request({ ...payload, ownerEmail: "merchant@invalid.example" }));
    expect(response.status).toBe(503);
    expect(mocked.onboard).not.toHaveBeenCalled();
  });
});
