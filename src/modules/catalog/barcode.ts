export function normalizeBarcode(value: string): string {
  const normalized = value.trim().replace(/\s+/g, "");
  if (!/^[A-Za-z0-9._-]{4,64}$/.test(normalized)) {
    throw new Error("INVALID_BARCODE");
  }
  return normalized;
}

export function createInternalBarcode(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("INVALID_BARCODE_SEQUENCE");
  }
  return `A1M-${sequence.toString().padStart(10, "0")}`;
}