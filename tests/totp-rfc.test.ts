import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, totpCode, verifyTotp } from "@/core/auth/totp";

describe("TOTP RFC compatibility", () => {
  it("matches the six-digit form of RFC 6238 SHA-1 vectors", () => {
    const secret = base32Encode(Buffer.from("12345678901234567890", "ascii"));
    const vectors = [
      [59_000, "287082"],
      [1_111_111_109_000, "081804"],
      [1_111_111_111_000, "050471"],
      [1_234_567_890_000, "005924"],
      [2_000_000_000_000, "279037"],
    ] as const;

    expect(base32Decode(secret)).toEqual(Buffer.from("12345678901234567890", "ascii"));
    for (const [time, expected] of vectors) {
      expect(totpCode(secret, time)).toBe(expected);
      expect(verifyTotp(secret, expected, time, 0)).toBe(true);
    }
  });
});
