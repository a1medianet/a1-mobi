/** Internal in-app address, not an Internet mailbox. */
export const MOBI_ACCOUNT_DOMAIN = "a1mobi.app";
const RESERVED = new Set([
  "admin", "administrator", "root", "support", "help", "billing", "security",
  "system", "platform", "info", "contact", "postmaster", "abuse", "noreply",
  "no-reply", "mailer-daemon", "webmaster", "api", "status", "team",
]);

export function normalizeAccountHandle(input: string): string | null {
  const handle = input.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,29}$/.test(handle)) return null;
  if (RESERVED.has(handle)) return null;
  return handle;
}

export function internalAccountAddress(handle: string): string {
  const normalized = normalizeAccountHandle(handle);
  if (!normalized) throw new Error("INVALID_ACCOUNT_HANDLE");
  return `${normalized}@${MOBI_ACCOUNT_DOMAIN}`;
}
