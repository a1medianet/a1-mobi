// Deadline covers headers and body; cancellation also wins if transport ignores abort.
export const SESSION_TIMEOUT_MS = 3000;
export const LOGIN_TIMEOUT_MS = 12000;
export async function authRequest(url: string, init: RequestInit, timeoutMs: number, signal: AbortSignal) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: () => void = () => {};
  const cancelled = new Promise<never>((_, reject) => {
    cancel = () => { controller.abort(); reject(new Error("CANCELLED")); };
    if (signal.aborted) cancel();
    else signal.addEventListener("abort", cancel, { once: true });
    timer = setTimeout(() => { controller.abort(); reject(new Error("TIMEOUT")); }, timeoutMs);
  });
  try {
    return await Promise.race([cancelled, (async () => {
      const response = await fetch(url, { ...init, signal: controller.signal });
      const body = url === "/api/auth/session" ? {} : await response.json().catch(() => ({})) as { error?: string };
      return { ok: response.ok, status: response.status, body };
    })()]);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", cancel);
  }
}
