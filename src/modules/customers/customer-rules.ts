export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Customer phone is required");
  let normalized = trimmed.replace(/[^0-9+]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (normalized.startsWith("+")) normalized = `+${normalized.slice(1).replace(/\D/g, "")}`;
  else normalized = normalized.replace(/\D/g, "");
  if (normalized.replace("+", "").length < 7) throw new Error("Customer phone is invalid");
  return normalized;
}

export function validateCustomerName(name: string) {
  const clean = name.trim();
  if (clean.length < 2) throw new Error("Customer name is required");
  return clean;
}
