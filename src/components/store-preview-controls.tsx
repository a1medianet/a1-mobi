"use client";

import Link from "next/link";
import { useState } from "react";
import type { DemoProduct } from "@/demo/data";
import { DemoProductPhoto, StoreSectionLink } from "@/components/demo-product-photo";

export function StorePreviewHeader() {
  const [open, setOpen] = useState(false);
  return <header className="mobi-store-header">
    <div className="mobi-shop-brand" dir="ltr">
      <svg className="mobi-shop-logo" width="32" height="40" viewBox="0 0 32 40" fill="none" aria-hidden="true">
        <rect x="6" y="2" width="20" height="36" rx="5" stroke="#1265E8" strokeWidth="3"/>
        <path d="M13 7h6M14 32h4" stroke="#FF7A1A" strokeWidth="3" strokeLinecap="round"/>
      </svg>
      <div><strong><span style={{color:"#1265E8"}}>Tech</span><span style={{color:"#FF7A1A"}}>Zone</span></strong><small dir="rtl">متجر تجريبي · هواتف وصيانة</small></div>
    </div>
    <button className="mobi-store-menu-button" type="button" aria-expanded={open} aria-controls="store-menu" onClick={() => setOpen(value => !value)}>{open ? "إغلاق" : "القائمة"}</button>
    <nav id="store-menu" className={open ? "is-open" : ""} aria-label="التنقل الرئيسي" onClick={() => setOpen(false)}>
      <StoreSectionLink target="products">المنتجات</StoreSectionLink>
      <StoreSectionLink target="services">الصيانة</StoreSectionLink>
      <StoreSectionLink target="about-store">عن المتجر</StoreSectionLink>
      <StoreSectionLink target="store-contact">التواصل</StoreSectionLink>
    </nav>
    <div className="mobi-store-header-actions"><Link href="/product/ar" dir="ltr">A1 Mobi ↗</Link></div>
  </header>;
}

export function StorePreviewProducts({ products }: { products: DemoProduct[] }) {
  const [query, setQuery] = useState("");
  const term = query.trim().toLocaleLowerCase();
  const filtered = products.filter(product => [product.nameAr, product.nameEn, product.brand, product.sku].some(value => value.toLocaleLowerCase().includes(term)));
  return <section className="mobi-store-featured" id="products" tabIndex={-1} aria-label="منتجات وأسعار توضيحية">
    <div className="mobi-store-section-head"><div><span className="mobi-store-kicker">اختيارات تجريبية · USD</span><h2>هواتف وإكسسوارات</h2></div>
      <label className="mobi-store-search">البحث في المنتجات
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="اسم المنتج أو العلامة" aria-controls="store-product-results"/>
      </label>
    </div>
    <div className="mobi-store-products" id="store-product-results">{filtered.map(product => <article key={product.id} className="mobi-store-product">
      <div className="mobi-store-product-photo"><DemoProductPhoto product={product} locale="ar" compact /></div>
      <div className="mobi-store-product-body"><small>{product.brand}</small><h3>{product.nameAr}</h3><div><strong dir="ltr">${product.price.toLocaleString("en-US")}</strong>
        <Link href="/product/ar/demo" aria-label={"جولة توضيحية — " + product.nameAr}>عرض</Link>
      </div></div>
    </article>)}</div>
    <p className="mobi-store-result-note" role="status">{filtered.length ? `${filtered.length} منتجات توضيحية · الشراء والسلة وحجز الصيانة غير متاحة في هذه المعاينة` : "لا توجد منتجات مطابقة. جرّب اسمًا آخر."}</p>
  </section>;
}
