export const A1_CURRENCY_CODES = ["USD","LBP","EUR","GBP","SAR","AED","QAR","KWD","BHD","OMR","TRY","CAD","AUD"] as const;
export type A1CurrencyCode = typeof A1_CURRENCY_CODES[number];
export const A1_CURRENCY_COUNTRIES = ["LB","SA","AE","QA","BH","KW","OM","US","GB","FR","DE","TR","CA","AU"] as const;
export type A1CurrencyCountry = typeof A1_CURRENCY_COUNTRIES[number];
export const A1_CURRENCY_POLICY_KEY = "a1.currency.policy";
export type A1CurrencyPolicyConfig = {
  allowedCurrencies:string[];
  preferredCurrency:string;
  countryCode:string|null;
  preferredLocale:"ar"|"en";
  rateMode:"MANUAL";
};
export function isSupportedCurrency(value:string):value is A1CurrencyCode {
  return (A1_CURRENCY_CODES as readonly string[]).includes(value);
}
export function safeCurrencyPolicy(
  raw:unknown,baseCurrency:string,defaultLocale:string,
):A1CurrencyPolicyConfig {
  const value=raw && typeof raw==="object" && !Array.isArray(raw)
    ? raw as Record<string,unknown> : {};
  const configured=Array.isArray(value.allowedCurrencies)
    ? value.allowedCurrencies.filter((x):x is string=>typeof x==="string"&&isSupportedCurrency(x)):[];
  const allowedCurrencies=Array.from(new Set([baseCurrency,"USD","LBP",...configured]));
  const preferredCurrency=typeof value.preferredCurrency==="string" &&
    allowedCurrencies.includes(value.preferredCurrency)?value.preferredCurrency:
    (baseCurrency==="LBP"?"USD":"LBP");
  return {
    allowedCurrencies,
    preferredCurrency,
    countryCode:typeof value.countryCode==="string" && (A1_CURRENCY_COUNTRIES as readonly string[]).includes(value.countryCode)?value.countryCode:null,
    preferredLocale:value.preferredLocale==="en"?"en":value.preferredLocale==="ar"?"ar":defaultLocale==="en"?"en":"ar",
    rateMode:"MANUAL",
  };
}
