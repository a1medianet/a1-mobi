import { describe, expect, it } from "vitest";
import { sessionContext, requireSessionPermission, type SessionSnapshot } from "@/core/auth/session-context";

const now = new Date("2026-10-03T06:00:00Z");
function fixture(): SessionSnapshot {
  return {
    expiresAt: new Date(now.getTime() + 60_000), revokedAt: null,
    user: {
      id: "user-a", tenantId: "tenant-a", isActive: true,
      branch: { id: "branch-a", tenantId: "tenant-a" },
      userRoles: [{ role: { tenantId: "tenant-a",
        permissions: [{ permission: { code: "sell.create" } }] } }],
    },
  };
}

describe("server session authorization", () => {
  it("derives identity and permissions from current trusted records", () => {
    const context = sessionContext(fixture(), now);
    expect(context?.tenantId).toBe("tenant-a");
    expect(context?.branchId).toBe("branch-a");
    expect(requireSessionPermission(context, "sell.create").actorId).toBe("user-a");
    expect(() => requireSessionPermission(context, "cash.close")).toThrow("PERMISSION_DENIED");
  });
  it("rejects missing, expired and revoked sessions", () => {
    expect(sessionContext(null, now)).toBeNull();
    const expired = fixture(); expired.expiresAt = now;
    expect(sessionContext(expired, now)).toBeNull();
    const revoked = fixture(); revoked.revokedAt = now;
    expect(sessionContext(revoked, now)).toBeNull();
    expect(() => requireSessionPermission(null, "sell.create")).toThrow("AUTH_REQUIRED");
  });
  it("rejects inactive users and missing or foreign branches", () => {
    const inactive = fixture(); inactive.user.isActive = false;
    expect(sessionContext(inactive, now)).toBeNull();
    const missing = fixture(); missing.user.branch = null;
    expect(sessionContext(missing, now)).toBeNull();
    const foreign = fixture(); foreign.user.branch!.tenantId = "tenant-b";
    expect(sessionContext(foreign, now)).toBeNull();
  });
  it("ignores foreign tenant roles and reflects permission removal", () => {
    const foreign = fixture(); foreign.user.userRoles[0].role.tenantId = "tenant-b";
    expect(sessionContext(foreign, now)?.permissions.size).toBe(0);
    const removed = fixture(); removed.user.userRoles = [];
    expect(() => requireSessionPermission(sessionContext(removed, now), "sell.create"))
      .toThrow("PERMISSION_DENIED");
  });
});
