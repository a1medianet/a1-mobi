import { isValidImei } from "@/modules/devices/imei";

export type ScanKind = "IMEI" | "EAN13" | "CODE";

export function normalizeScan(raw: string): string {
  return raw.replace(/[\r\n\t]/g, "").trim();
}

export function classifyScan(raw: string): { kind: ScanKind; value: string } {
  const value = normalizeScan(raw);
  if (!value) throw new Error("Scan is empty");
  if (/^\d{15}$/.test(value) && isValidImei(value)) return { kind: "IMEI", value };
  if (/^\d{13}$/.test(value)) return { kind: "EAN13", value };
  if (/^[A-Za-z0-9._/-]{2,64}$/.test(value)) return { kind: "CODE", value };
  throw new Error("Unsupported scanner input");
}
