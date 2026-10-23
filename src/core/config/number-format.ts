/** Storefront numbers always use ASCII digits in both supported languages. */
export function formatNumber(value: number, locale: "ar" | "en" = "en", options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", { ...options, numberingSystem: "latn" }).format(value);
}

/** Keep dates readable with the same 0-9 digits as amounts, including Arabic. */
export function formatDate(value: string | Date, locale: "ar" | "en", options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-LB" : "en-GB", {
    ...options, numberingSystem: "latn", timeZone: "Asia/Beirut",
  }).format(new Date(value));
}
