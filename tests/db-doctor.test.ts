import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { classify, inspectTarget } from "../scripts/db-doctor.mjs";

describe("nonsecret local DB doctor", () => {
  it("CLI refuses an external target without printing credentials or attempting SQL", () => {
    const result = spawnSync(process.execPath, ["scripts/db-doctor.mjs"], {
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "test", DATABASE_URL: "postgresql://private-user:private-password@remote.invalid/private-db" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout)).toMatchObject({ classification: "TARGET_REFUSED", queryAttempted: false });
    expect(result.stdout).not.toMatch(/private-|remote\.invalid|postgresql:/);
  });

  it("refuses missing, production, external, malformed and alternate targets", () => {
    expect(inspectTarget(undefined, "test")?.[0]).toBe("CONFIG_MISSING");
    expect(inspectTarget("postgresql://127.0.0.1/db", "production")?.[0]).toBe("PRODUCTION_REFUSED");
    for (const url of ["postgresql://remote.invalid/db", "postgresql://localhost/db", "postgresql://127.0.0.1/db?host=remote.invalid"]) {
      expect(inspectTarget(url, "test")?.[0]).toBe("TARGET_REFUSED");
    }
    expect(inspectTarget("invalid-secret", "test")?.[0]).toBe("INVALID_CONFIGURATION");
    for (const host of ["127.0.0.1", "[::1]"]) expect(inspectTarget(`postgresql://${host}/db`, "test")).toBeNull();
  });

  it.each([
    ["P1000", "AUTHENTICATION_FAILED"], ["P1001", "SERVER_UNREACHABLE"],
    ["P1002", "CONNECTION_TIMEOUT"], ["P1003", "DATABASE_MISSING"],
    ["P1010", "ACCESS_DENIED"], ["P1011", "TLS_FAILED"],
    ["P1013", "INVALID_CONFIGURATION"], ["P2024", "POOL_TIMEOUT"],
  ])("classifies %s without exposing raw details", (errorCode, expected) => {
    const result = classify({ errorCode, message: "secret-url", stack: "secret-stack" });
    expect(result[0]).toBe(expected);
    expect(JSON.stringify(result)).not.toContain("secret");
    expect(classify({ code: errorCode })).toEqual(result);
  });

  it("does not infer unreachable from an initialization exception alone", () => {
    expect(classify({ name: "PrismaClientInitializationError", message: "secret" })[0]).toBe("INITIALIZATION_UNCLASSIFIED");
  });
});
