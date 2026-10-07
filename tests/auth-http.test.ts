import { afterEach, describe, expect, it } from "vitest";
import { sameOriginMutation, cookieOptions } from "@/server/auth-http";
const original = process.env.APP_ORIGIN;
afterEach(() => { if (original === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = original; });
describe("authentication HTTP boundary", () => {
  it("requires same-origin and rejects cross-site or missing Origin", () => {
    process.env.APP_ORIGIN = "https://mobi.example.test";
    const req = (origin?: string, site?: string) => new Request("https://mobi.example.test/api/auth/login",
      { method: "POST", headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) } });
    expect(sameOriginMutation(req())).toBe(false);
    expect(sameOriginMutation(req("https://evil.example.test"))).toBe(false);
    expect(sameOriginMutation(req("https://mobi.example.test", "cross-site"))).toBe(false);
    expect(sameOriginMutation(req("https://mobi.example.test", "same-origin"))).toBe(true);
    expect(cookieOptions()).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
  });
});
