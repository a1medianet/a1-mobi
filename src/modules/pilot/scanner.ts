import { isValidImei } from "@/modules/devices/imei";

export type ScanKind = "IMEI" | "EAN13" | "CODE";

export function normalizeScan(raw: string): string {
  return raw.replace(/[\r\n\t]/g, "").trim();
}

export function classifyScan(raw: string): { kind: ScanKind; value: string } {
  const value = normalizeScan(raw);
  if (!value) throw new Error("Scan is empty");
  if (/^\d{15}$/.test(value)) {
    if (!isValidImei(value)) throw new Error("Invalid IMEI checksum");
    return { kind: "IMEI", value };
  }
  if (/^\d{13}$/.test(value)) return { kind: "EAN13", value };
  if (/^[A-Za-z0-9._/-]{2,64}$/.test(value)) return { kind: "CODE", value };
  throw new Error("Unsupported scanner input");
}

export type ImeiSelection = { deviceId: string; selectedIds: string[]; changed: boolean };
export function selectScannedImei(
  raw: string,
  availableDevices: readonly { id: string; imei: string | null }[],
  selectedIds: readonly string[],
  maxDevices = 12,
): ImeiSelection {
  const scan = classifyScan(raw);
  if (scan.kind !== "IMEI") throw new Error("IMEI_REQUIRED");
  const device = availableDevices.find(item => item.imei === scan.value);
  if (!device) throw new Error("DEVICE_NOT_AVAILABLE");
  if (selectedIds.includes(device.id)) {
    return { deviceId: device.id, selectedIds: [...selectedIds], changed: false };
  }
  if (selectedIds.length >= maxDevices) throw new Error("INVOICE_DEVICE_LIMIT");
  return { deviceId: device.id, selectedIds: [...selectedIds, device.id], changed: true };
}