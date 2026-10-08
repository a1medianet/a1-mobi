"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DemoProductPhoto } from "@/components/demo-product-photo";
import { demoCatalogCounts, demoProducts, type DemoProductType } from "@/demo/data";

const copy = {
  ar: {
    back:"لوحة التحكم", title:"المنتجات", subtitle:"كتالوج تجريبي بمنتجات حقيقية وأرقام وأسعار اختبارية قابلة للتعديل",
    notice:"Pilot Demo — أسماء المنتجات واقعية، لكن الأسعار والمخزون قيم تجريبية وليست تسعير سوق ملزم.",
    search:"ابحث بالاسم أو SKU أو الباركود", all:"الكل", device:"أجهزة", accessory:"إكسسوارات", part:"قطع صيانة",
    stock:"المخزون", serialized:"IMEI / Serial", normal:"غير تسلسلي", price:"سعر البيع", low:"منخفض", healthy:"جيد",
    products:"منتجات", devices:"أجهزة", accessories:"إكسسوارات", parts:"قطع", serialUnits:"أجهزة تسلسلية", lowStock:"تنبيهات",
    noResults:"لا توجد نتائج مطابقة", admin:"الإدارة",
  },
  en: {
    back:"Dashboard", title:"Products", subtitle:"Pilot catalog with real-world product names and configurable demo values",
    notice:"Pilot Demo — product names are real-world items; prices and stock are demo values, not live market quotes.",
    search:"Search name, SKU, or barcode", all:"All", device:"Devices", accessory:"Accessories", part:"Repair parts",
    stock:"Stock", serialized:"IMEI / Serial", normal:"Non-serialized", price:"Retail price", low:"Low", healthy:"Healthy",
    products:"Products", devices:"Devices", accessories:"Accessories", parts:"Parts", serialUnits:"Serialized units", lowStock:"Alerts",
    noResults:"No matching products", admin:"Admin",
  },
} as const;

export default function ProductsPage() {
  const { locale: raw } = useParams<{ locale: string }>();
  const locale = raw === "en" ? "en" : "ar";
  const t = copy[locale];
  const [query,setQuery] = useState("");
  const [type,setType] = useState<"ALL" | DemoProductType>("ALL");
  const counts = demoCatalogCounts();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return demoProducts.filter(product => {
      const matchesType = type === "ALL" || product.type === type;
      const matchesQuery = !q || [
        product.nameAr, product.nameEn, product.sku, product.barcode, product.brand,
      ].some(value => value.toLowerCase().includes(q));
      return matchesType && matchesQuery;
    });
  },[query,type]);

  return <main className="module-page">
    <header className="module-header">
      <div>
        <Link href={"/"+locale} className="back-link">{t.back}</Link>
        <p className="module-kicker">A1 MOBI · CATALOG</p>
        <h1>{t.title}</h1>
        <p className="module-sub">{t.subtitle}</p>
      </div>
      <Link className="soft-btn" href={"/"+locale+"/admin"}>{t.admin}</Link>
    </header>

    <p className="preview-notice" role="status">{t.notice}</p>

    <section className="catalog-stats" aria-label={t.products}>
      {[
        [t.products,counts.total,"▦"],
        [t.devices,counts.devices,"◈"],
        [t.accessories,counts.accessories,"□"],
        [t.parts,counts.parts,"⌁"],
        [t.serialUnits,counts.serializedUnits,"#"],
        [t.lowStock,counts.lowStock,"!"],
      ].map(([label,value,icon]) => <article className="catalog-stat" key={String(label)}>
        <span aria-hidden="true">{icon}</span><div><small>{label}</small><strong>{value}</strong></div>
      </article>)}
    </section>

    <section className="catalog-panel">
      <div className="catalog-toolbar">
        <label className="module-search">
          <span aria-hidden="true">⌕</span>
          <input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t.search} aria-label={t.search}/>
        </label>
        <div className="filter-pills" role="group" aria-label={t.products}>
          {[
            ["ALL",t.all],["DEVICE",t.device],["ACCESSORY",t.accessory],["PART",t.part],
          ].map(([key,label]) => <button key={key} className={type===key?"active":""}
            onClick={()=>setType(key as "ALL" | DemoProductType)}>{label}</button>)}
        </div>
      </div>

      <div className="catalog-grid">
        {filtered.map(product => {
          const low = product.stock <= product.reorderAt;
          return <article className="catalog-card" key={product.id}>
            <div className={"catalog-product-visual "+product.type.toLowerCase()}>
              <DemoProductPhoto product={product} locale={locale} />
              <small>{product.brand}</small>
            </div>
            <div className="catalog-card-body">
              <div className="catalog-title-row">
                <div>
                  <small>{product.brand}</small>
                  <h2>{locale==="ar"?product.nameAr:product.nameEn}</h2>
                </div>
                <span className={"stock-pill "+(low?"low":"ok")}>{low?t.low:t.healthy}</span>
              </div>
              <p className="catalog-sku"><bdi dir="ltr">{product.sku}</bdi> · <bdi dir="ltr">{product.barcode}</bdi></p>
              <div className="catalog-meta">
                <div><small>{t.price}</small><strong><bdi dir="ltr">{"$"+product.price.toFixed(2)}</bdi></strong></div>
                <div><small>{t.stock}</small><strong>{product.stock}</strong></div>
                <div><small>{product.serialized?t.serialized:t.normal}</small><strong>{product.serialized?"✓":"—"}</strong></div>
              </div>
            </div>
          </article>;
        })}
      </div>
      {filtered.length===0 && <p className="empty-search">{t.noResults}</p>}
    </section>
  </main>;
}
