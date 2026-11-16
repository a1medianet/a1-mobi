import Link from "next/link";
import { notFound } from "next/navigation";
import { currentStoreContext } from "@/server/auth-http";

export const dynamic = "force-dynamic";

export default async function TopupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  await currentStoreContext("topup.manage");
  const ar = locale === "ar";
  return <main className="module-page" lang={locale} dir={ar ? "rtl" : "ltr"}>
    <header className="module-header"><div>
      <Link href={`/${locale}`} className="back-link">{ar ? "الرئيسية" : "Dashboard"}</Link>
      <p className="module-kicker">A1 MOBI · TOP-UP</p>
      <h1>{ar ? "التعبئة والتشريج" : "Recharge & Top-up"}</h1>
      <p className="module-sub">{ar ? "إدارة خدمات التعبئة وشركاء التوريد والتسويات الخاصة بمتجرك." : "Recharge providers, merchant services and daily settlements."}</p>
    </div></header>
    <section className="activity-card" aria-live="polite">
      <div className="section-head"><h2>{ar ? "ربط الخدمات قيد التجهيز" : "Provider connection pending"}</h2></div>
      <p>{ar ? "لم يتم بعد تفعيل تسجيل عمليات التعبئة الفعلية أو الربط المباشر بمزودي الخدمة لهذا المتجر. لن نعرض عمليات نموذجية أو مبيعات وهمية ضمن بيانات Top Mobile." : "Live recharge entry and provider connections have not yet been enabled for this store. Sample transactions and fictitious sales are not shown as merchant records."}</p>
      <p className="module-sub">{ar ? "سيُضاف سجل الخدمات (أيام، دولارات، بطاقات، U-Share)، وجهات التوريد، والتحويلات بين المتاجر، والمستحقات والتسوية عند إتمام الاعتماد التشغيلي." : "Services (days, credit, cards, U-Share), suppliers, inter-store sourcing, payables and settlements will be added following operational approval."}</p>
      <Link className="soft-btn" href={`/${locale}/cash`}>{ar ? "الانتقال إلى الصندوق" : "Open cash drawer"}</Link>
    </section>
  </main>;
}
