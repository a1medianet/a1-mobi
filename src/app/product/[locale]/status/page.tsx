import { notFound } from "next/navigation";
import { appVersionInfo } from "@/core/version";

export const dynamic="force-dynamic";

export default async function StatusPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";const release=appVersionInfo();
  const services=[
    ["A1 Billing Core",Boolean(process.env.A1_BILLING_CORE_URL&&process.env.A1_BILLING_SERVICE_TOKEN)],
    ["A1 Pulse",Boolean(process.env.A1_PULSE_HEARTBEAT_URL&&process.env.A1_PULSE_ERROR_URL&&process.env.A1_PULSE_SERVICE_TOKEN)],
    ["A1 Assist",Boolean(process.env.A1_ASSIST_ENDPOINT&&process.env.A1_ASSIST_SERVICE_TOKEN)],
  ] as const;
  return <main className="product-shell product-page">
    <section className="page-intro compact"><span className="product-eyebrow">PRODUCT STATUS</span><h1>{ar?"حالة نسخة A1 Mobi":"A1 Mobi release status"}</h1><p>{ar?"حالة الإصدار والتكاملات لهذه البيئة. لا تعرض الصفحة أسرارًا أو تفاصيل بنية حساسة.":"Release and integration status for this environment without exposing secrets or sensitive infrastructure details."}</p></section>
    <section className="trust-grid">
      <article className="trust-card"><span className="product-eyebrow">RELEASE</span><h2>{release.version}</h2><p>Build: {release.build}<br/>Channel: {release.channel}<br/>Update: {release.updateState}</p></article>
      {services.map(([name,ready])=><article className="trust-card" key={name}><span className="product-eyebrow">INTEGRATION</span><h2>{name}</h2><p>{ready?(ar?"مهيأ في هذه البيئة":"Configured in this environment"):(ar?"غير مهيأ في هذه البيئة":"Not configured in this environment")}</p></article>)}
    </section>
  </main>;
}
