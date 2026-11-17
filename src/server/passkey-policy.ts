/**
 * A1 Login G4 WebAuthn relying-party boundary.
 * Staged only: no endpoints are enabled until credential lifecycle and browser UAT pass.
 */
export type PasskeyPolicy = Readonly<{ origin: string; rpId: string; rpName: "A1 Mobi" }>;

export function passkeysEnabled(env: Record<string, string | undefined> = process.env) {
  return env.A1_MOBI_PASSKEYS_ENABLED === "1";
}

export function resolvePasskeyPolicy(
  env: Record<string, string | undefined> = process.env,
): PasskeyPolicy {
  const originString = env.APP_ORIGIN?.trim();
  const rpId = env.A1_MOBI_PASSKEY_RP_ID?.trim().toLowerCase();
  if (!originString || !rpId) throw new Error("PASSKEY_POLICY_UNAVAILABLE");
  let url: URL;
  try { url = new URL(originString); } catch { throw new Error("PASSKEY_POLICY_UNAVAILABLE"); }
  // Keep each merchant custom domain out of the RP scope until explicit domain
  // verification and credential migration. No wildcard/suffix-based RP selection.
  if (url.protocol !== "https:" || url.hostname.toLowerCase() !== rpId ||
      url.username || url.password || url.port || url.search || url.hash ||
      url.pathname !== "/" || !/^[a-z0-9.-]+$/.test(rpId) ||
      rpId.startsWith(".") || rpId.endsWith(".") || rpId.includes("..")) {
    throw new Error("PASSKEY_POLICY_UNAVAILABLE");
  }
  return Object.freeze({ origin: url.origin, rpId, rpName: "A1 Mobi" });
}
