import "server-only";

/** Provider-neutral, fail-closed Cloudflare Turnstile verification.
 * Turnstile is not enabled in production until the UI and Cloudflare keys pass the activation gate.
 */
export type TurnstileSurface = "signup" | "recovery" | "login";

export function turnstileEnabled(surface: TurnstileSurface, env: Record<string,string|undefined> = process.env) {
  if (surface === "login") return env.A1_MOBI_TURNSTILE_LOGIN_ENABLED === "1";
  return env.A1_MOBI_TURNSTILE_ENABLED === "1";
}

export type TurnstileVerdict = "DISABLED" | "VERIFIED" | "MISSING" | "REJECTED" | "UNAVAILABLE";

export async function verifyTurnstile(input: {
  request: Request; token?: string; surface: TurnstileSurface;
  env?: Record<string,string|undefined>; fetcher?: typeof fetch;
}): Promise<TurnstileVerdict> {
  const env = input.env ?? process.env;
  if (!turnstileEnabled(input.surface, env)) return "DISABLED";
  const secret = env.A1_MOBI_TURNSTILE_SECRET;
  const expectedHostname = env.A1_MOBI_TURNSTILE_HOSTNAME?.trim().toLowerCase();
  if (!secret || !expectedHostname) return "UNAVAILABLE";
  if (!input.token || input.token.length > 2048 || !/^[\x21-\x7e]+$/.test(input.token)) return "MISSING";
  const form = new URLSearchParams({secret, response: input.token});
  // Omit remoteip: application headers are spoofable without a separately
  // authenticated, trusted Cloudflare-to-origin proxy boundary. Siteverify
  // validates tokens without remoteip, so this avoids trusting client input.
  try {
    const response = await (input.fetcher ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify",{
      method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:form.toString(),signal:AbortSignal.timeout(6000),cache:"no-store",
    });
    if(!response.ok) return "UNAVAILABLE";
    const result:unknown=await response.json();
    if(!result || typeof result!=="object")return "REJECTED";
    const r=result as {success?:unknown;hostname?:unknown;action?:unknown};
    if(r.success!==true)return "REJECTED";
    if(typeof r.hostname!=="string" || r.hostname.toLowerCase()!==expectedHostname)return "REJECTED";
    if(r.action!==input.surface)return "REJECTED";
    return "VERIFIED";
  } catch{return "UNAVAILABLE";}
}
