import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ sendMail: vi.fn(), close: vi.fn(), createTransport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mocks.createTransport } }));
vi.mock("@/server/db", () => ({ db: {} }));
import { POST } from "@/app/api/internal/recovery-delivery/route";
import { recoveryConfigurationStatus } from "@/server/recovery-service";

const token = "a".repeat(43);
const payload = () => ({ email: "owner@example.test", tenant: "shop", locale: "en", token,
  resetUrl: `https://mobi.example.test/en/recover?token=${token}`,
  expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() });
function request(body: unknown = payload(), auth = "Bearer test-secret", type = "application/json") {
  return new Request("https://mobi.example.test/api/internal/recovery-delivery", {
    method: "POST", headers: { authorization: auth, "content-type": type }, body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("APP_ORIGIN", "https://mobi.example.test");
  vi.stubEnv("A1_MOBI_RECOVERY_WEBHOOK_SECRET", "test-secret");
  vi.stubEnv("A1_MOBI_RECOVERY_WEBHOOK_URL", "https://mobi.example.test/api/internal/recovery-delivery");
  vi.stubEnv("A1_MOBI_SMTP_HOST", "smtp.example.test");
  vi.stubEnv("A1_MOBI_SMTP_PORT", "587");
  vi.stubEnv("A1_MOBI_SMTP_USER", "smtp-user");
  vi.stubEnv("A1_MOBI_SMTP_PASSWORD", "test-only-password");
  vi.stubEnv("A1_MOBI_SMTP_FROM", "hi@a1medianet.com");
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail, close: mocks.close });
  mocks.sendMail.mockResolvedValue({});
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("internal recovery delivery", () => {
  it("disables unconfigured authentication and rejects wrong or missing bearer", async () => {
    for (const auth of ["", "Bearer wrong", "bearer test-secret"]) {
      expect((await POST(request(payload(), auth))).status).toBe(401);
    }
    vi.stubEnv("A1_MOBI_RECOVERY_WEBHOOK_SECRET", "");
    expect((await POST(request())).status).toBe(503);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it.each([
    "https://evil.example.test/en/recover", "http://mobi.example.test/en/recover",
    "https://mobi.example.test/en/login", "https://user:password@mobi.example.test/en/recover",
    `https://mobi.example.test/en/recover?token=${token}&redirect=https://evil.test`,
    `https://mobi.example.test/en/recover?token=${token}#fragment`,
    `https://mobi.example.test/ar/recover?token=${token}`,
    "https://mobi.example.test/en/recover?token=wrong",
  ])("rejects unsafe reset URL %s", async resetUrl => {
    expect((await POST(request({ ...payload(), resetUrl }))).status).toBe(400);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it("validates JSON, body size, recipient, token, expiry and strict schema", async () => {
    expect((await POST(request(payload(), undefined, "text/plain"))).status).toBe(415);
    expect((await POST(request({ padding: "a".repeat(8192) }))).status).toBe(413);
    for (const change of [{ email: "bad\r\nBcc: evil@test.com" }, { token: "short" },
      { expiresAt: new Date(0).toISOString() }, { locale: "fr" }, { password: "never-mail" }]) {
      expect((await POST(request({ ...payload(), ...change }))).status).toBe(400);
    }
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it.each(["", "25", "587junk"])("fails closed on SMTP port %s", async port => {
    vi.stubEnv("A1_MOBI_SMTP_PORT", port);
    expect((await POST(request())).status).toBe(503);
    expect(recoveryConfigurationStatus().ready).toBe(false);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
  it("requires all SMTP credentials for first-party readiness but preserves external delivery", async () => {
    expect(recoveryConfigurationStatus().ready).toBe(true);
    vi.stubEnv("A1_MOBI_SMTP_PASSWORD", "");
    expect((await POST(request())).status).toBe(503);
    expect(recoveryConfigurationStatus()).toEqual({ ready: false, delivery: "invalid" });
    vi.stubEnv("A1_MOBI_RECOVERY_WEBHOOK_URL", "https://external.example.test/webhook");
    expect(recoveryConfigurationStatus().ready).toBe(true);
    vi.stubEnv("A1_MOBI_RECOVERY_WEBHOOK_URL", "");
    expect(recoveryConfigurationStatus().ready).toBe(false);
  });
  it.each(["465", "587"])("sends authenticated bilingual mail with enforced TLS on %s", async port => {
    vi.stubEnv("A1_MOBI_SMTP_PORT", port);
    for (const locale of ["en", "ar"]) {
      expect((await POST(request({ ...payload(), locale,
        resetUrl: `https://mobi.example.test/${locale}/recover?token=${token}` }))).status).toBe(200);
    }
    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({
      secure: port === "465", requireTLS: true, port: Number(port),
      auth: { user: "smtp-user", pass: "test-only-password" },
      tls: { minVersion: "TLSv1.2", rejectUnauthorized: true }, logger: false, debug: false,
    }));
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "hi@a1medianet.com",
      to: "owner@example.test", text: expect.stringContaining(token), html: expect.stringContaining('dir="rtl"'),
    }));
    expect(mocks.close).toHaveBeenCalledTimes(2);
  });
  it("uses the approved A1 Mobi sender when SMTP_FROM is not configured", async () => {
    vi.stubEnv("A1_MOBI_SMTP_FROM", "");
    expect(recoveryConfigurationStatus().ready).toBe(true);
    expect((await POST(request())).status).toBe(200);
    expect(mocks.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: "hi@a1medianet.com", to: "owner@example.test",
    }));
  });
  it("rejects malformed custom SMTP sender instead of delivering mail", async () => {
    vi.stubEnv("A1_MOBI_SMTP_FROM", "wrong\r\nBcc: victim@example.test");
    expect(recoveryConfigurationStatus().ready).toBe(false);
    expect((await POST(request())).status).toBe(503);
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
  it("returns a generic failure and closes transport without exposing SMTP error data", async () => {
    mocks.sendMail.mockRejectedValue(new Error(`sensitive ${token}`));
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ accepted: false });
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
