#!/usr/bin/env node
/**
 * Read-only deployment gate for A1 Mobi auth security settings.
 * Reads environment only; never prints credentials or sends email.
 */
const env = process.env;
const issues = [];
const checks = [];
const check = (condition, label, failure) => {
  if (condition) checks.push(label);
  else issues.push(failure);
};
const hostname = (env.A1_MOBI_TURNSTILE_HOSTNAME || "").trim().toLowerCase();
const siteKey = env.A1_MOBI_TURNSTILE_SITE_KEY || "";
const secret = env.A1_MOBI_TURNSTILE_SECRET || "";
const enabled = env.A1_MOBI_TURNSTILE_ENABLED === "1";
const login = env.A1_MOBI_TURNSTILE_LOGIN_ENABLED === "1" ||
  env.A1_MOBI_TURNSTILE_LOGIN_ALWAYS_ENABLED === "1";
let origin;
try { origin = new URL(env.APP_ORIGIN || ""); } catch { /* Report below. */ }
check(Boolean(origin && origin.protocol === "https:" && !origin.username &&
  !origin.password && !origin.search && !origin.hash && origin.pathname === "/"),
  "HTTPS origin", "APP_ORIGIN must be a clean HTTPS root URL");
if (enabled || login) {
  check(siteKey.length > 10 && secret.length > 10 && siteKey !== secret,
    "Turnstile keys present", "Turnstile enabled without distinct public and private keys");
  check(Boolean(hostname && origin?.hostname === hostname),
    "Turnstile hostname matches origin", "Turnstile hostname must match APP_ORIGIN exactly");
} else {
  checks.push("Turnstile switches remain OFF");
}
if (env.A1_MOBI_PASSKEYS_ENABLED === "1") {
  check(Boolean(origin && origin.protocol === "https:" && !origin.port &&
    env.A1_MOBI_PASSKEY_RP_ID?.trim().toLowerCase() === origin.hostname.toLowerCase()),
    "WebAuthn RP pinned to HTTPS origin", "Passkeys require exact HTTPS origin and RP ID");
} else checks.push("Passkeys switch remains OFF");
const smtpNames = ["A1_MOBI_SMTP_HOST", "A1_MOBI_SMTP_PORT",
  "A1_MOBI_SMTP_USER", "A1_MOBI_SMTP_PASSWORD", "A1_MOBI_SMTP_FROM"];
check(smtpNames.every(name => Boolean(env[name]?.trim())) &&
  ["465", "587"].includes(env.A1_MOBI_SMTP_PORT || ""),
  "SMTP delivery settings present", "SMTP recovery delivery configuration is incomplete");
const outcome = issues.length ? "BLOCKED" : "CONFIG_READY_NOT_LIVE_VERIFIED";
console.log(JSON.stringify({gate: "A1_MOBI_AUTH_PREFLIGHT", outcome, checks, issues}, null, 2));
process.exitCode = issues.length ? 1 : 0;
