/**
 * Return to a previously requested back-office page without permitting external,
 * cross-locale or sign-in redirect targets. Login is always required separately.
 */
export function safeStoreReturnPath(candidate: unknown, locale: "ar" | "en") {
  const fallback = `/${locale}`;
  if (typeof candidate !== "string" || candidate.length > 180) return fallback;
  if (candidate === fallback) return fallback;
  if (!candidate.startsWith(fallback + "/")) return fallback;
  if (!/^\/[a-z]{2}\/[a-z0-9/_-]+$/i.test(candidate)) return fallback;
  const segments = candidate.slice(fallback.length + 1).split("/");
  if (segments.some(segment => !segment || segment === "." || segment === "..")) return fallback;
  if (["login","recover"].includes(segments[0].toLowerCase())) return fallback;
  return candidate;
}
