import Link from "next/link";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts, demoTransactions } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports, demoTopups } from "@/demo/operations";

export default async function DemoPage({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params;
  if(locale!=="ar" && locale!=="en") notFound();
  const ar=locale==="ar";
  const counts=demoCatalogCounts();
  const modules=[
    [ar?"إدارة نقاط البيع":"Point-of-sale operations","pos"],
    [ar?"تنظيم المنتجات":"Product management","products"],
    [ar?"تتبع المخزون":"Inventory tracking","inventory"],
    [ar?"متابعة الصيانة":"Repair tracking","repairs"],
    [ar?"إدارة الفريق":"Team administration","admin"],
  ];
  return <main className="product-shell product-page">
    <section className="page-intro">
      <span className="product-eyebrow">{ar?"جولة تعريفية":"PRODUCT WALKTHROUGH"}</span>
      <h1>{ar?"تعرّف على نظام إدارة متجرك قبل الاشتراك.":"See how your store management system works."}</h1>
      <p>{ar?"هذه بيانات توضيحية لعرض البيع والمخزون والصيانة. لا تُنفّذ هذه الصفحة عمليات بيع أو حجوزات أو مدفوعات حقيقية.":"This guided preview uses sample store activity. It does not process sales, orders or real payments."}</p>
      <div className="product-actions">
        <Link className="product-cta" href={"/product/"+locale+"/signup"}>{ar?"أنشئ حساب متجرك":"Create your store account"}</Link>
        <Link className="product-secondary" href={"/"+locale+"/login"}>{ar?"لديك حساب؟ سجّل الدخول":"Already have an account? Sign in"}</Link>
      </div>
    </section>
    <section className="demo-kpis" aria-label={ar?"أمثلة على البيانات":"Example data"}>
      <article><small>{ar?"المنتجات":"Products"}</small><strong>{counts.total}</strong></article>
      <article><small>{ar?"الأجهزة المسجلة":"Serialized units"}</small><strong>{counts.serializedUnits}</strong></article>
      <article><small>{ar?"الصيانة":"Repairs"}</small><strong>{demoRepairs.length}</strong></article>
      <article><small>{ar?"العملاء":"Customers"}</small><strong>{demoCustomers.length}</strong></article>
      <article><small>{ar?"مبيعات توضيحية":"Sample sales"}</small><strong>{"$"+demoReports.salesUsd.toLocaleString()}</strong></article>
      <article><small>{ar?"خدمات التعبئة":"Top-ups"}</small><strong>{demoTopups.length}</strong></article>
    </section>
    <section className="demo-grid">
      <article className="demo-panel">
        <div className="panel-title"><span className="product-eyebrow">{ar?"كتالوج توضيحي":"SAMPLE CATALOG"}</span><h2>{ar?"أمثلة على المنتجات":"Example product records"}</h2></div>
        {demoProducts.slice(0,6).map(p=><div className="demo-row" key={p.id}>
          <span aria-hidden="true">▦</span><div><b>{ar?p.nameAr:p.nameEn}</b><small>{p.sku} · {"$"+p.price} · {p.stock} {ar?"قطعة توضيحية":"sample units"}</small></div>
        </div>)}
      </article>
      <article className="demo-panel">
        <div className="panel-title"><span className="product-eyebrow">{ar?"سجل توضيحي":"SAMPLE ACTIVITY"}</span><h2>{ar?"كيف تظهر عمليات المتجر؟":"How store operations appear"}</h2></div>
        {demoTransactions.map(row=><div className="demo-row" key={row.id}>
          <span aria-hidden="true">▣</span><div><b>{row.id} · {ar?row.customerAr:row.customerEn}</b><small>{row.time} · {"$"+row.amount} · {row.status}</small></div>
        </div>)}
      </article>
    </section>
    <section className="journey-links" aria-label={ar?"أقسام إدارة المتجر":"Store management modules"}>
      {modules.map(([label,key])=><Link href={"/"+locale+"/login"} key={key}>
        <span aria-hidden="true">↗</span><b>{label}</b><small>{ar?"بعد تسجيل الدخول":"Available after sign-in"} →</small>
      </Link>)}
    </section>
  </main>;
}
