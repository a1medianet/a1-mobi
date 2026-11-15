import { beforeEach, describe, expect, it, vi } from "vitest";

const getCookie = vi.hoisted(() => vi.fn());
const findPlatformSession = vi.hoisted(() => vi.fn());
const resolveStoreSession = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock("@/server/db", () => ({
  db: { platformSession: { findUnique: findPlatformSession } },
}));
vi.mock("@/server/session-context", () => ({
  resolveSessionContext: resolveStoreSession,
}));
import { currentPlatformAdmin } from "@/server/platform-auth";
import { currentStoreContext } from "@/server/auth-http";

beforeEach(() => {
  getCookie.mockReset(); findPlatformSession.mockReset(); resolveStoreSession.mockReset();
});

describe("Gate B: platform and store cookies cannot impersonate each other", () => {
  it("a store session alone does not authenticate the platform admin", async () => {
    getCookie.mockImplementation((name: string) =>
      name === "a1-mobi-session" ? { value: "store-session-token" } : undefined);
    expect(await currentPlatformAdmin()).toBeNull();
    expect(findPlatformSession).not.toHaveBeenCalled();
    expect(getCookie).toHaveBeenCalledWith("a1-mobi-platform");
  });
  it("a platform session alone does not authenticate a store user", async () => {
    getCookie.mockImplementation((name: string) =>
      name === "a1-mobi-platform" ? { value: "platform-session-token" } : undefined);
    resolveStoreSession.mockResolvedValue(null);
    expect(await currentStoreContext()).toBeNull();
    expect(getCookie).toHaveBeenCalledWith("a1-mobi-session");
    expect(resolveStoreSession).toHaveBeenCalledWith(undefined);
  });
});
