type LogLevel = "info" | "warn" | "error";

const SENSITIVE_KEY = /(password|token|secret|authorization|cookie|session|credential)/i;

function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[truncated]";
  if (Array.isArray(value)) return value.map(item => sanitize(item, depth + 1));
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      output[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : sanitize(item, depth + 1);
    }
    return output;
  }
  return value;
}

export function structuredLog(
  level: LogLevel,
  event: string,
  context: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    service: "a1-mobi",
    level,
    event,
    ...sanitize(context) as Record<string, unknown>,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
  return payload;
}
