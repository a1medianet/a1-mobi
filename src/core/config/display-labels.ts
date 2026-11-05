type Locale = "ar" | "en";
const roles: Record<string, [string, string]> = {
  owner: ["صاحب المتجر", "Store owner"], manager: ["مدير", "Manager"],
  cashier: ["أمين الصندوق", "Cashier"], technician: ["فني صيانة", "Repair technician"],
};
export function roleLabel(role: { code: string; name: string }, locale: Locale) {
  return roles[role.code.toLowerCase()]?.[locale === "ar" ? 0 : 1] ?? role.name;
}
const statuses: Record<string, [string, string]> = {
  active: ["نشط", "Active"], trialing: ["فترة تجريبية", "Trial"], expired: ["منتهي", "Expired"],
  past_due: ["دفعة مستحقة", "Payment due"], canceled: ["ملغى", "Canceled"],
  cancelled: ["ملغى", "Canceled"], suspended: ["موقوف", "Suspended"],
};
export function billingStatusLabel(status: string, locale: Locale) {
  return statuses[status.toLowerCase()]?.[locale === "ar" ? 0 : 1] ?? (locale === "ar" ? "تواصل مع الدعم" : "Contact support");
}
const features: Record<string, [string, string]> = {
  branches: ["الفروع", "Branches"], users: ["المستخدمون", "Users"], inventory: ["المخزون", "Inventory"],
  pos: ["نقطة البيع", "POS"], repairs: ["الصيانة", "Repairs"], reports: ["التقارير", "Reports"],
  customers: ["الزبائن", "Customers"], cash: ["الصندوق", "Cash"], topup: ["التعبئة", "Top-up"],
};
export function entitlementLabel(code: string, locale: Locale) {
  const key = code.replace(/^mobi\./, "").replace(/\.(enabled|max|limit)$/, "");
  return features[key]?.[locale === "ar" ? 0 : 1] ?? (locale === "ar" ? "ميزة اشتراك" : "Subscription feature");
}
export function planLabel(code: string | undefined, locale: Locale) {
  const names: Record<string, [string, string]> = { "mobi-pilot": ["الخطة التجريبية", "Pilot plan"], "mobi-starter": ["الخطة الأساسية", "Starter plan"], "mobi-pro": ["الخطة الاحترافية", "Pro plan"] };
  return (code && names[code]?.[locale === "ar" ? 0 : 1]) || (locale === "ar" ? "خطة المتجر" : "Store plan");
}
