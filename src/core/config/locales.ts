export const SUPPORTED_LOCALES = ["ar", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const localeDirection: Record<SupportedLocale, "rtl" | "ltr"> = {
  ar: "rtl",
  en: "ltr",
};

export function resolveLocale(value?: string): SupportedLocale {
  return value === "en" ? "en" : "ar";
}