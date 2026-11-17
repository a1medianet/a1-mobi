import { describe, expect, it } from "vitest";
import { passkeysEnabled, resolvePasskeyPolicy } from "@/server/passkey-policy";
const base = { APP_ORIGIN: "https://mobi.a1net.tech/", A1_MOBI_PASSKEY_RP_ID: "mobi.a1net.tech" };

describe("WebAuthn G4 relying-party preflight", () => {
  it("is disabled by default and opt-in only", () => {
    expect(passkeysEnabled({})).toBe(false);
    expect(passkeysEnabled({ A1_MOBI_PASSKEYS_ENABLED: "1" })).toBe(true);
    expect(passkeysEnabled({ A1_MOBI_PASSKEYS_ENABLED: "true" })).toBe(false);
  });
  it("pins the relying party to an exact HTTPS origin", () => {
    expect(resolvePasskeyPolicy(base)).toEqual({
      origin: "https://mobi.a1net.tech", rpId: "mobi.a1net.tech", rpName: "A1 Mobi",
    });
  });
  it("fails closed for origin/RP mismatches and unsafe URL forms", () => {
    const bad = [
      { APP_ORIGIN: "http://mobi.a1net.tech/" },
      { APP_ORIGIN: "https://other.a1net.tech/" },
      { APP_ORIGIN: "https://mobi.a1net.tech:8443/" },
      { APP_ORIGIN: "https://mobi.a1net.tech/private" },
      { APP_ORIGIN: "https://user:pass@mobi.a1net.tech/" },
      { APP_ORIGIN: "https://mobi.a1net.tech/?next=1" },
      { A1_MOBI_PASSKEY_RP_ID: ".a1net.tech" },
      { A1_MOBI_PASSKEY_RP_ID: "a1net.tech" },
    ];
    for (const item of bad) expect(() => resolvePasskeyPolicy({ ...base, ...item })).toThrow("PASSKEY_POLICY_UNAVAILABLE");
  });
  it("never infers a relying-party id from missing environment", () => {
    expect(() => resolvePasskeyPolicy({ APP_ORIGIN: base.APP_ORIGIN })).toThrow("PASSKEY_POLICY_UNAVAILABLE");
  });
});
