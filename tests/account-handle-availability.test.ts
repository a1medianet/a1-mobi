import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ handle: vi.fn(), user: vi.fn() }));
vi.mock("@/server/db", () => ({
  db: {
    accountHandle: { findUnique: mocks.handle },
    user: { findFirst: mocks.user },
  },
}));
import { GET } from "@/app/api/onboarding/username/route";
const check = (username: string) => GET(new Request(`https://mobi.example.test/api/onboarding/username?username=${encodeURIComponent(username)}`));
afterEach(() => vi.resetAllMocks());

describe("global account username availability", () => {
  it("never queries the database for reserved names", async () => {
    const response = await check("admin");
    expect(await response.json()).toMatchObject({ available: false, reason: "INVALID_OR_RESERVED" });
    expect(mocks.handle).not.toHaveBeenCalled();
  });
  it("shows topmobile as available only when both sources are clear", async () => {
    mocks.handle.mockResolvedValue(null);
    mocks.user.mockResolvedValue(null);
    const response = await check("TopMobile");
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ available: true, username: "topmobile" });
  });
  it("rejects an existing globally reserved handle", async () => {
    mocks.handle.mockResolvedValue({handle:"topmobile"});
    mocks.user.mockResolvedValue(null);
    expect((await (await check("topmobile")).json()).available).toBe(false);
  });
  it("fails closed when the database is unreachable", async () => {
    mocks.handle.mockRejectedValue(new Error("db down"));
    mocks.user.mockResolvedValue(null);
    const response = await check("topmobile");
    expect(response.status).toBe(503);
    expect((await response.json()).available).toBe(false);
  });
});
