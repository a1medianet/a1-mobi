import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function base32Encode(input: Uint8Array) {
  let bits = 0, value = 0, output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  let bits = 0, value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error("INVALID_BASE32");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function totpCounter(nowMs = Date.now(), stepSeconds = 30) {
  return Math.floor(nowMs / 1000 / stepSeconds);
}

function totpCodeForCounter(secret: string, counter: number) {
  const key = base32Decode(secret);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff)
  ) % 1_000_000;
  return value.toString().padStart(6, "0");
}

export function totpCode(secret: string, nowMs = Date.now(), stepSeconds = 30) {
  return totpCodeForCounter(secret, totpCounter(nowMs, stepSeconds));
}

export function matchTotpCounter(
  secret: string,
  code: string,
  nowMs = Date.now(),
  window = 1,
) {
  if (!/^\d{6}$/.test(code)) return null;
  const supplied = Buffer.from(code);
  const current = totpCounter(nowMs);
  for (let delta = -window; delta <= window; delta += 1) {
    const counter = current + delta;
    if (counter < 0) continue;
    const expected = Buffer.from(totpCodeForCounter(secret, counter));
    if (supplied.length === expected.length && timingSafeEqual(supplied, expected)) {
      return counter;
    }
  }
  return null;
}

export function verifyTotp(secret: string, code: string, nowMs = Date.now(), window = 1) {
  return matchTotpCounter(secret, code, nowMs, window) !== null;
}

function encryptionKey() {
  const raw = process.env.A1_MOBI_MFA_ENCRYPTION_KEY?.trim();
  if (!raw) throw new Error("MFA_KEY_NOT_CONFIGURED");
  let key: Buffer;
  if (/^[a-fA-F0-9]{64}$/.test(raw)) key = Buffer.from(raw, "hex");
  else key = Buffer.from(raw, "base64url");
  if (key.length !== 32) throw new Error("MFA_KEY_NOT_CONFIGURED");
  return key;
}

export function mfaConfigurationStatus() {
  try {
    encryptionKey();
    return { ready: true, encryptionKey: "configured" as const };
  } catch {
    return {
      ready: process.env.NODE_ENV !== "production",
      encryptionKey: "not-configured" as const,
    };
  }
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"),
    encrypted.toString("base64url")].join(".");
}

export function decryptTotpSecret(payload: string) {
  const [version, ivText, tagText, cipherText] = payload.split(".");
  if (version !== "v1" || !ivText || !tagText || !cipherText) throw new Error("INVALID_MFA_SECRET");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(cipherText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    let raw = "";
    const bytes = randomBytes(12);
    for (let i = 0; i < 12; i += 1) {
      raw += RECOVERY_ALPHABET[bytes[i] % RECOVERY_ALPHABET.length];
    }
    return raw.match(/.{1,4}/g)!.join("-");
  });
}

export function hashRecoveryCode(code: string) {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return createHash("sha256").update(normalized).digest("hex");
}
