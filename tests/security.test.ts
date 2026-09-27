import { describe, expect, it } from "vitest";
import { createAuditEvent } from "@/core/audit/audit-event";
import { createSessionToken, hashSessionToken } from "@/core/auth/session";
import { hashPassword, verifyPassword } from "@/core/auth/password";

describe("foundation security invariants", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("strong-password-2026");
    expect(hash).not.toContain("strong-password-2026");
    expect(await verifyPassword(hash, "strong-password-2026")).toBe(true);
  });

  it("stores only a hash of session tokens", () => {
    const { token, tokenHash } = createSessionToken();
    expect(token).not.toBe(tokenHash);
    expect(hashSessionToken(token)).toBe(tokenHash);
  });

  it("requires actor and tenant on audit events", () => {
    expect(() =>
      createAuditEvent({
        tenantId: "",
        actorId: "",
        action: "price.override",
        entityType: "Sale",
        entityId: "sale-1",
      }),
    ).toThrow("INVALID_AUDIT_EVENT");
  });
});