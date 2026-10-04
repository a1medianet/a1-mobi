import { describe, expect, it } from "vitest";
import { ControlFailure, controlError } from "@/server/control-http";

describe("foundation control HTTP errors", () => {
  it("maps control failures without leaking internal errors", async () => {
    expect(controlError(new Error("AUTH_REQUIRED")).status).toBe(401);
    expect(controlError(new Error("PERMISSION_DENIED")).status).toBe(403);
    expect(controlError(new ControlFailure("INVALID_ROLE")).status).toBe(400);
    expect(controlError(new ControlFailure("CONFLICT")).status).toBe(409);
    const response = controlError(new Error("database exploded"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
  });

  it("maps every control failure code to its documented status and exposes the code", async () => {
    const expectations: Array<[ControlFailure["code"], number]> = [
      ["NOT_FOUND", 404],
      ["INVALID_PERMISSION", 400],
      ["SYSTEM_ROLE_IMMUTABLE", 400],
      ["SELF_PROTECTION", 400],
      ["ALREADY_PROVISIONED", 409],
      ["BOOTSTRAP_NOT_CONFIGURED", 503],
      ["BOOTSTRAP_FORBIDDEN", 403],
    ];
    for (const [code, status] of expectations) {
      const response = controlError(new ControlFailure(code));
      expect(response.status).toBe(status);
      const exposesCode = status < 500;
      expect(await response.json()).toEqual({ error: exposesCode ? code : "SERVICE_UNAVAILABLE" });
    }
  });
});
