import Link from "next/link";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts, demoTransactions } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports, demoTopups } from "@/demo/operations";

export default async function DemoPage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;if(locale!=="ar"&&locale!=="en")notFound();const ar=locale==="ar";const counts=demoCatalogCounts();
  return <main className="product-shell product-page">
    <section className="page-intro"><span className="product-eyebrow">LIVE PILOT EXPERIENCE</span><h1>{ar?"تجربة ممتلئة بالبيانات، لا Dashboard فارغ.":"A populated experience, not an empty dashboard."}</h1><p>{ar?"هذه المساحة معدّة لتجربة رحلة متجر موبايل حقيقية دون التأثير على بيانات إنتاجية.":"This workspace is prepared to test a realistic mobile-store journey without touching production data."}</p>
      <div className="product-actions"><Link className="product-cta" href={"/"+locale}>{ar?"ادخل المتجر التجريبي":"Enter demo workspace"}</Link><Link className="product-secondary" href={"/product/"+locale+"/signup"}>{ar?"أنشئ متجرك التجريبي":"Create your trial store"}</Link></div>
    </section>
    <section className="demo-kpis">
      <article><small>{ar?"المنتجات":"Products"}</small><strong>{counts.total}</strong></article>
      <article><small>{ar?"المخزون التسلسلي":"Serialized units"}</small><strong>{counts.serializedUnits}</strong></article>
      <article><small>{ar?"الصيانة":"Repairs"}</small><strong>{demoRepairs.length}</strong></article>
      <article><small>{ar?"العملاء":"Customers"}</small><strong>{demoCustomers.length}</strong></article>
      <article><small>{ar?"المبيعات":"Sales"}</small><strong>{"$"+demoReports.salesUsd.toLocaleString()}</strong></article>
      <article><small>{ar?"التعبئة":"Top-ups"}</small><strong>{demoTopups.length}</strong></article>
    </section>
    <section className="demo-grid">
      <article className="demo-panel"><div className="panel-title"><span className="product-eyebrow">CATALOG</span><h2>{ar?"منتجات يمكن البحث وبيعها":"Products ready to search and sell"}</h2></div>{demoProducts.slice(0,6).map(p=><div className="demo-row" key={p.id}><span>{p.type==="DEVICE"?"▯":p.type==="PART"?"⌁":"□"}</span><div><b>{ar?p.nameAr:p.nameEn}</b><small>{p.sku} · {"$"+p.price} · {p.stock} {ar?"متوفر":"in stock"}</small></div></div>)}</article>
      <article className="demo-panel"><div className="panel-title"><span className="product-eyebrow">OPERATIONS</span><h2>{ar?"عمليات اليوم":"Today's activity"}</h2></div>{demoTransactions.map(row=><div className="demo-row" key={row.id}><span>{row.kind==="repair"?"◇":row.kind==="topup"?"↗":"▣"}</span><div><b>{row.id} · {ar?row.customerAr:row.customerEn}</b><small>{row.time} · {"$"+row.amount} · {row.status}</small></div></div>)}</article>
    </section>
    <section className="journey-links">
      {[
        [ar?"جرّب نقطة البيع":"Try POS","/pos","▣"],
        [ar?"راجع المنتجات":"Browse products","/products","▦"],
        [ar?"شاهد المخزون":"See inventory","/inventory","◇"],
        [ar?"افتح الصيانة":"Open repairs","/repairs","⌁"],
        [ar?"راجع الإدارة":"Owner admin","/admin","⚙"],
      ].map(([label,path,icon])=><Link href={"/"+locale+path} key={path}><span>{icon}</span><b>{label}</b><small>{ar?"فتح التجربة":"Open demo"} →</small></Link>)}
    </section>
  </main>;
}
