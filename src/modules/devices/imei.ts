export function normalizeImei(value: string): string {
  return value.replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x660))
    .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x6f0))
    .replace(/[\s-]/g, "");
}

export function isValidImei(value: string): boolean {
  const imei = normalizeImei(value);
  if (!/^\d{15}$/.test(imei) || imei === "000000000000000") return false;
  let sum = 0;
  for (let index = 0; index < imei.length; index += 1) {
    let digit = Number(imei[index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function requireValidImei(value: string): string {
  const imei = normalizeImei(value);
  if (!isValidImei(imei)) throw new Error("INVALID_IMEI");
  return imei;
}