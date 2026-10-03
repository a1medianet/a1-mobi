import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashSessionToken } from "@/core/auth/session";
const mocks = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/server/db", () => ({ db: { session: { findUnique: mocks.findUnique } } }));
import { resolveSessionContext } from "@/server/session-context";

describe("opaque session lookup", () => {
  beforeEach(() => { mocks.findUnique.mockReset(); });
  it("rejects malformed tokens without a database lookup", async () => {
    for (const token of [undefined, "", "client-user-id", "x".repeat(257)]) {
      expect(await resolveSessionContext(token)).toBeNull();
    }
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("looks up only the hash and rejects an unknown valid token", async () => {
    const token = "a".repeat(43);
    mocks.findUnique.mockResolvedValue(null);
    expect(await resolveSessionContext(token)).toBeNull();
    const query = mocks.findUnique.mock.calls[0][0];
    expect(query.where.tokenHash).toBe(hashSessionToken(token));
    expect(query.where.tokenHash).not.toBe(token);
    expect(query.include.user.include.userRoles).toBeDefined();
  });
});
