import { afterEach, describe, expect, it } from "vitest";
import { bootstrapSecretMatches } from "@/server/bootstrap-service";

const original = process.env.A1_MOBI_BOOTSTRAP_SECRET;
afterEach(() => {
  if (original === undefined) delete process.env.A1_MOBI_BOOTSTRAP_SECRET;
  else process.env.A1_MOBI_BOOTSTRAP_SECRET = original;
});

describe("bootstrap secret boundary", () => {
  it("fails closed when not configured and compares the configured secret", () => {
    delete process.env.A1_MOBI_BOOTSTRAP_SECRET;
    expect(() => bootstrapSecretMatches("anything")).toThrow("BOOTSTRAP_NOT_CONFIGURED");

    const secret = "a".repeat(40);
    process.env.A1_MOBI_BOOTSTRAP_SECRET = secret;
    expect(bootstrapSecretMatches(null)).toBe(false);
    expect(bootstrapSecretMatches("b".repeat(40))).toBe(false);
    expect(bootstrapSecretMatches(secret)).toBe(true);
  });
});
