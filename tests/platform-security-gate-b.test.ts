import { describe, expect, it } from "vitest";
import { sessionContext, requireSessionPermission, type SessionSnapshot } from "@/core/auth/session-context";
import { platformCookieName, platformCookieOptions } from "@/server/platform-auth";
import { cookieOptions, sameOriginMutation, sessionCookieName } from "@/server/auth-http";

const now = new Date("2026-11-15T18:00:00.000Z");
function fixture(): SessionSnapshot {
  return {
    id: "session-a", expiresAt: new Date(now.getTime() + 3_600_000), revokedAt: null,
    user: {
      id: "user-a", tenantId: "tenant-a", isActive: true,
      branch: { id: "branch-a", tenantId: "tenant-a" },
      userRoles: [
        { role: { tenantId: "tenant-a", permissions: [{ permission: { code: "sales.read" } }] } },
        { role: { tenantId: "tenant-b", permissions: [{ permission: { code: "foundation.manage" } }] } },
      ],
    },
  };
}

describe("Gate B: platform and tenant authentication boundaries", () => {
  it("uses different platform/store session cookies with secure options", () => {
    expect(platformCookieName()).not.toBe(sessionCookieName());
    expect(platformCookieOptions()).toMatchObject({
      httpOnly: true, sameSite: "strict", path: "/", maxAge: 3600,
    });
    expect(cookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
  it("rejects cross-origin, cross-site, and originless mutations", () => {
    const previous = process.env.APP_ORIGIN;
    try {
      process.env.APP_ORIGIN = "https://mobi.example.test";
      const request = (origin?: string, site?: string) => new Request("https://mobi.example.test/api/platform/login",
        { method: "POST", headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) } });
      expect(sameOriginMutation(request())).toBe(false);
      expect(sameOriginMutation(request("https://attacker.invalid"))).toBe(false);
      expect(sameOriginMutation(request("https://mobi.example.test", "cross-site"))).toBe(false);
      expect(sameOriginMutation(request("https://mobi.example.test", "same-origin"))).toBe(true);
    } finally {
      if (previous === undefined) delete process.env.APP_ORIGIN;
      else process.env.APP_ORIGIN = previous;
    }
  });
  it("filters out permissions granted by another tenant", () => {
    const context = sessionContext(fixture(), now);
    expect(context?.tenantId).toBe("tenant-a");
    expect(context?.branchId).toBe("branch-a");
    expect(context?.permissions.has("sales.read")).toBe(true);
    expect(context?.permissions.has("foundation.manage")).toBe(false);
    expect(() => requireSessionPermission(context!, "foundation.manage")).toThrow("PERMISSION_DENIED");
  });
  it("rejects sessions whose user branch belongs to another tenant", () => {
    const session = fixture(); session.user.branch = { id: "branch-b", tenantId: "tenant-b" };
    expect(sessionContext(session, now)).toBeNull();
  });
  it("rejects revoked, expired, or inactive store sessions", () => {
    const revoked = fixture(); revoked.revokedAt = now;
    expect(sessionContext(revoked, now)).toBeNull();
    const expired = fixture(); expired.expiresAt = now;
    expect(sessionContext(expired, now)).toBeNull();
    const disabled = fixture(); disabled.user.isActive = false;
    expect(sessionContext(disabled, now)).toBeNull();
  });
});
