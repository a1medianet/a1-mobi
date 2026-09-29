import Link from "next/link";
import { notFound } from "next/navigation";

const modules = {
  inventory: { ar: "المخزون والأجهزة", en: "Inventory & devices", icon: "◇", stepsAr: ["المنتجات والباركود", "استلام المخزون مع فحص IMEI", "المواقع والتسويات وسجل الحركة"], stepsEn: ["Products and barcodes", "Stock intake with IMEI check", "Locations, adjustments, and movement log"] },
  repairs: { ar: "الصيانة", en: "Repairs", icon: "⌁", stepsAr: ["استلام الجهاز وفحص IMEI", "التشخيص والموافقة والقطع", "التسليم والتحصيل والضمان"], stepsEn: ["Intake and IMEI check", "Diagnosis, approval, and parts", "Delivery, payment, and warranty"] },
  customers: { ar: "العملاء والديون", en: "Customers & debt", icon: "♙", stepsAr: ["سجل العملاء والأجهزة", "حساب الدين والدفعات", "كشف الحساب والتدقيق"], stepsEn: ["Customer and device records", "Debt and repayments", "Statements and audit"] },
  cash: { ar: "الصندوق", en: "Cash", icon: "▤", stepsAr: ["فتح جلسة الصندوق", "التحصيل والمصروف والتحويل", "الإقفال والفروقات الموثقة"], stepsEn: ["Open cash session", "Receipts, expenses, and transfers", "Close and document variances"] },
  topup: { ar: "التعبئة", en: "Top-up", icon: "↗", stepsAr: ["تحديد المزود والرقم", "فحص الجهاز إن كان حاضرًا", "التنفيذ والتسوية"], stepsEn: ["Choose provider and number", "Check IMEI if device is present", "Execute and settle"] },
  reports: { ar: "التقارير", en: "Reports", icon: "▥", stepsAr: ["المبيعات والأرباح", "الصيانة والديون", "المخزون والتعبئة والصندوق"], stepsEn: ["Sales and profit", "Repairs and debt", "Inventory, top-up, and cash"] },
} as const;

type ModuleKey = keyof typeof modules;
export default async function ModulePage({ params }: { params: Promise<{ locale: string; module: string }> }) {
  const { locale, module } = await params;
  if ((locale !== "ar" && locale !== "en") || !(module in modules)) notFound();
  const data = modules[module as ModuleKey];
  const ar = locale === "ar";
  const title = ar ? data.ar : data.en;
  const steps = ar ? data.stepsAr : data.stepsEn;
  return <main dir={ar ? "rtl" : "ltr"} className="module-page">
    <header className="module-header"><div>
      <Link href={`/${locale}`} className="back-link">{ar ? "← لوحة التحكم" : "← Dashboard"}</Link>
      <p className="module-kicker">A1 MOBI · {module.toUpperCase()}</p>
      <h1>{data.icon} {title}</h1>
      <p className="module-sub">{ar ? "مساحة العمل الخاصة بهذا القسم" : "Workspace for this store domain"}</p>
    </div></header>
    <div className="module-banner" role="status">
      <strong>{ar ? "واجهة قيد التوصيل" : "Interface integration in progress"}</strong>
      <p>{ar ? "منطق العمل محفوظ في وحدات الخادم، لكن هذه الصفحة لا تقرأ أو تحفظ بيانات المتجر بعد. لا تُسجل أي عملية من هنا." : "The server domain logic exists, but this page does not read or save store data yet. No transactions are recorded here."}</p>
    </div>
    <section className="module-step-grid" aria-label={title}>
      {steps.map((step, index) => <article className="module-step" key={step}>
        <span>{String(index + 1).padStart(2, "0")}</span><h2>{step}</h2>
        <p>{ar ? "سيظهر سير العمل الفعلي هنا بعد ربط الهوية والصلاحيات وبيانات الفرع." : "The real workflow will appear here after identity, permissions, and branch data are connected."}</p>
      </article>)}
    </section>
    <nav className="module-next" aria-label={ar ? "روابط متاحة" : "Available links"}>
      <Link href={`/${locale}/device-trust`}>{ar ? "معاينة فحص IMEI" : "IMEI format preview"} ←</Link>
      <Link href={`/${locale}/pos`}>{ar ? "معاينة نقطة البيع" : "POS preview"} ←</Link>
    </nav>
  </main>;
}
