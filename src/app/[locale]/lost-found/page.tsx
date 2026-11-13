import Link from "next/link";
import {notFound} from "next/navigation";
import ImeiStorePanel from "@/components/imei-store-panel";

export const dynamic = "force-dynamic";

export default async function LostFoundPage({
  params,
}:{
  params:Promise<{locale:string}>;
}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en")notFound();
  const ar=locale==="ar";
  return <main className="module-page" lang={locale} dir={ar?"rtl":"ltr"}>
    <header className="module-header">
      <div>
        <Link href={`/${locale}`} className="back-link">{ar?"الرئيسية":"Dashboard"}</Link>
        <h1>{ar?"المفقودات وبلاغات الأجهزة":"Lost & reported devices"}</h1>
        <p className="module-sub">
          {ar?"قسم مستقل لتسجيل البلاغات ومراجعتها داخل المتجر، مع ربطها بالعميل والجهاز.":"A separate workspace for store device reports, linked to customer and device records."}
        </p>
      </div>
    </header>
    <ImeiStorePanel locale={locale}/>
    <section className="activity-card" aria-label={ar?"حالة الربط الخارجي":"External network status"}>
      <h2>{ar?"الربط بالنظام المستقل":"External registry integration"}</h2>
      <p>{ar?
        "البلاغات الحالية داخلية ومقيدة بجهتها. لن تُنشر إلى نظام خارجي أو قاعدة بلاغات عامة قبل إطلاق منصة مستقلة، والتحقق من الملكية والموافقة والصلاحيات.":
        "Current reports remain internal to each organization. No reports are published externally before a separate registry is launched with ownership, consent and authorization checks."}
      </p>
      <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:12}}>
        <Link className="soft-btn" href={`/${locale}/device-trust`}>
          {ar?"فحص صحة رقم IMEI":"Validate IMEI number"}</Link>
        <Link className="soft-btn" href={`/${locale}/customers`}>
          {ar?"دليل العملاء":"Customer directory"}</Link>
      </div>
    </section>
  </main>;
}
