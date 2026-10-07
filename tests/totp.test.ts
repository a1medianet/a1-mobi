import { afterEach, describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  totpCode,
  verifyTotp,
} from "@/core/auth/totp";

const originalKey = process.env.A1_MOBI_MFA_ENCRYPTION_KEY;

afterEach(() => {
  if (originalKey === undefined) delete process.env.A1_MOBI_MFA_ENCRYPTION_KEY;
  else process.env.A1_MOBI_MFA_ENCRYPTION_KEY = originalKey;
});

describe("TOTP and recovery primitives", () => {
  it("round-trips base32 and verifies TOTP only inside the allowed window", () => {
    const raw = Buffer.from("a1-mobi-totp-test");
    expect(base32Decode(base32Encode(raw))).toEqual(raw);
    const secret = generateTotpSecret();
    const now = Date.UTC(2026, 9, 4, 9, 0, 0);
    const code = totpCode(secret, now);
    expect(verifyTotp(secret, code, now)).toBe(true);
    expect(verifyTotp(secret, code, now + 120_000)).toBe(false);
    expect(verifyTotp(secret, "abcdef", now)).toBe(false);
  });

  it("encrypts MFA secrets and normalizes recovery-code hashes", () => {
    process.env.A1_MOBI_MFA_ENCRYPTION_KEY = "ab".repeat(32);
    const secret = generateTotpSecret();
    const cipher = encryptTotpSecret(secret);
    expect(cipher).not.toContain(secret);
    expect(decryptTotpSecret(cipher)).toBe(secret);
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(codes.length);
    expect(hashRecoveryCode(codes[0]))
      .toBe(hashRecoveryCode(codes[0].toLowerCase().replaceAll("-", "")));
  });
});
