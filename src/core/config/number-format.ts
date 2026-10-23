/** Storefront numbers always use ASCII digits in both supported languages. */
export function formatNumber(value: number, locale: "ar" | "en" = "en", options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", { ...options, numberingSystem: "latn" }).format(value);
}
