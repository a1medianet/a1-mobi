import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginForm } from "@/components/login-form";
import { authRequest, SESSION_TIMEOUT_MS, LOGIN_TIMEOUT_MS } from "@/core/auth/client-request";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe("login availability and bounded auth transport", () => {
  it.each(["ar", "en"] as const)("renders the %s form before hydration or session fetch", locale => {
    const html = renderToStaticMarkup(createElement(LoginForm, { locale, returnTo: `/${locale}/dashboard` }));
    expect(html).toContain('<form');
    expect(html).toContain('name="password"');
    expect(html).toContain('name="tenant"');
    expect(html).not.toContain('role="status"');
  });
  it("bounds a session that never resolves and aborts its transport", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetcher);
    const result = authRequest("/api/auth/session", {}, SESSION_TIMEOUT_MS, new AbortController().signal);
    const assertion = expect(result).rejects.toThrow("TIMEOUT");
    await vi.advanceTimersByTimeAsync(SESSION_TIMEOUT_MS);
    await assertion;
    expect(fetcher.mock.calls[0][1].signal?.aborted).toBe(true);
  });
  it.each([401, 503])("never treats session status %s as authorized", async status => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
    expect((await authRequest("/api/auth/session", {}, SESSION_TIMEOUT_MS, new AbortController().signal)).ok).toBe(false);
  });
  it.each(["MFA_REQUIRED", "INVALID_MFA", "INVALID_CREDENTIALS"])("preserves login failure %s", async error => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error }, { status: 401 })));
    const result = await authRequest("/api/auth/login", { method: "POST" }, LOGIN_TIMEOUT_MS, new AbortController().signal);
    expect(result.ok).toBe(false);
    expect(result.body.error).toBe(error);
  });
  it("bounds a pending login response body", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: () => new Promise(() => {}) }));
    const result = authRequest("/api/auth/login", { method: "POST" }, LOGIN_TIMEOUT_MS, new AbortController().signal);
    const assertion = expect(result).rejects.toThrow("TIMEOUT");
    await vi.advanceTimersByTimeAsync(LOGIN_TIMEOUT_MS);
    await assertion;
  });
  it("cancels pending requests on unmount without waiting for the deadline", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const lifetime = new AbortController();
    const result = authRequest("/api/auth/login", {}, LOGIN_TIMEOUT_MS, lifetime.signal);
    lifetime.abort();
    await expect(result).rejects.toThrow("CANCELLED");
  });
  it("propagates connection failures for an actionable form error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    await expect(authRequest("/api/auth/login", {}, LOGIN_TIMEOUT_MS, new AbortController().signal)).rejects.toThrow("offline");
  });
});
