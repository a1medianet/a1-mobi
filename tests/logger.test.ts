import { describe, expect, it, vi } from "vitest";
import { structuredLog } from "@/server/logger";

describe("structured logging", () => {
  it("redacts secret-bearing keys while preserving useful context", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      const line = structuredLog("info", "test.event", {
        requestId: "req-1",
        password: "never-log-this",
        nested: { sessionToken: "secret", safe: "value" },
      });
      const payload = JSON.parse(line);
      expect(payload.event).toBe("test.event");
      expect(payload.requestId).toBe("req-1");
      expect(payload.password).toBe("[redacted]");
      expect(payload.nested.sessionToken).toBe("[redacted]");
      expect(payload.nested.safe).toBe("value");
      expect(line).not.toContain("never-log-this");
      expect(line).not.toContain('"secret"');
    } finally {
      spy.mockRestore();
    }
  });
});
