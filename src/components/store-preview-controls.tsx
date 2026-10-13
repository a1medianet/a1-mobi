"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DemoProduct } from "@/demo/data";
import { DemoProductPhoto, DemoScenePhoto } from "@/components/demo-product-photo";

type StorePreviewExperienceProps={
  products:DemoProduct[];
  branchAr:string;
  branchEn:string;
};

const copy={
  ar:{
    brandSub:"متجر تجريبي · هواتف وصيانة",
    home:"الرئيسية",products:"المنتجات",repairs:"الصيانة",about:"معلومات عنا",contact:"تواصل",
    search:"ابحث عن هاتف أو إكسسوار",whatsapp:"WhatsApp",whatsappUnavailable:"WhatsApp غير مهيّأ في هذه المعاينة",
    kicker:"مرحبًا بك في TechZone",title:"أحدث الهواتف.",accent:"وخدمة تثق بها.",sub:"اختر جهازك القادم، واستكشف الإكسسوارات وخدمات الصيانة من مكان واحد.",
    discover:"اكتشف المنتجات",repair:"احجز صيانة",repairUnavailable:"حجز الصيانة غير متاح في هذه المعاينة",
    demo:"TechZone علامة تجريبية توضيحية · الصور والأسعار لا تمثّل عروض متجر حقيقي",
    location:"الموقع",hours:"ساعات العمل",hoursValue:"تُحدّد من إعدادات المتجر",service:"صيانة الأجهزة",serviceValue:"استلام · تشخيص · متابعة · تسليم",
    contactLabel:"التواصل",contactValue:"رقم المتجر غير مهيّأ في المعاينة",
    section:"أبرز منتجاتنا",sample:"اختيارات تجريبية · USD",add:"أضف إلى السلة",cartUnavailable:"السلة غير مفعّلة في المعاينة",
    noResults:"لا توجد منتجات مطابقة. جرّب اسمًا آخر.",result:"منتجات توضيحية",trust1:"أجهزة مختارة",trust2:"صيانة منظمة",trust3:"متابعة واضحة",powered:"Powered by A1 Mobi",
    menu:"القائمة",close:"إغلاق",
  },
  en:{
    brandSub:"Demo store · phones & repair",
    home:"Home",products:"Products",repairs:"Repairs",about:"About",contact:"Contact",
    search:"Search phones or accessories",whatsapp:"WhatsApp",whatsappUnavailable:"WhatsApp is not configured in this preview",
    kicker:"Welcome to TechZone",title:"Latest phones.",accent:"Service you can trust.",sub:"Choose your next device and explore accessories and repair services in one place.",
    discover:"Explore products",repair:"Book repair",repairUnavailable:"Repair booking is not available in this preview",
    demo:"TechZone is an illustrative demo brand · images and prices are not real-store offers",
    location:"Location",hours:"Working hours",hoursValue:"Configured by each store",service:"Device repair",serviceValue:"Intake · diagnosis · tracking · delivery",
    contactLabel:"Contact",contactValue:"Store phone is not configured in preview",
    section:"Featured products",sample:"Demo selection · USD",add:"Add to cart",cartUnavailable:"Cart is not enabled in preview",
    noResults:"No matching products. Try another search.",result:"demo products",trust1:"Selected devices",trust2:"Organized repair",trust3:"Clear tracking",powered:"Powered by A1 Mobi",
    menu:"Menu",close:"Close",
  },
} as const;

export function StorePreviewExperience({products,branchAr,branchEn}:StorePreviewExperienceProps){
  const [locale,setLocale]=useState<"ar"|"en">("ar");
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const t=copy[locale];
  const ar=locale==="ar";
  const term=query.trim().toLocaleLowerCase();
  const filtered=useMemo(()=>products.filter(product=>
    [product.nameAr,product.nameEn,product.brand,product.sku].some(value=>value.toLocaleLowerCase().includes(term))
  ),[products,term]);

  function scrollTo(id:string){
    document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
    setOpen(false);
  }

  return <main className="mobi-store" lang={locale} dir={ar?"rtl":"ltr"}>
    <header className="mobi-store-header">
      <div className="mobi-shop-brand" dir="ltr">
        <svg className="mobi-shop-logo" width="34" height="42" viewBox="0 0 32 40" fill="none" aria-hidden="true">
          <rect x="6" y="2" width="20" height="36" rx="5" stroke="#1265E8" strokeWidth="3"/>
          <path d="M13 7h6M14 32h4" stroke="#FF7A1A" strokeWidth="3" strokeLinecap="round"/>
        </svg>
        <div><strong><span>Tech</span><em>Zone</em></strong><small>{t.brandSub}</small></div>
      </div>

      <label className="mobi-store-header-search">
        <span aria-hidden="true">⌕</span>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t.search} aria-label={t.search}/>
      </label>

      <button className="mobi-store-menu-button" type="button" aria-expanded={open} aria-controls="store-menu" onClick={()=>setOpen(value=>!value)}>{open?t.close:t.menu}</button>

      <nav id="store-menu" className={open?"is-open":""} aria-label={ar?"التنقل الرئيسي":"Store navigation"}>
        <button type="button" onClick={()=>scrollTo("store-home")}>{t.home}</button>
        <button type="button" onClick={()=>scrollTo("products")}>{t.products}</button>
        <button type="button" onClick={()=>scrollTo("services")}>{t.repairs}</button>
        <button type="button" onClick={()=>scrollTo("about-store")}>{t.about}</button>
        <button type="button" onClick={()=>scrollTo("store-contact")}>{t.contact}</button>
      </nav>

      <div className="mobi-store-header-actions">
        <button className="mobi-store-whatsapp" type="button" disabled title={t.whatsappUnavailable}>● {t.whatsapp}</button>
        <button className="mobi-store-lang" type="button" onClick={()=>setLocale(ar?"en":"ar")}>{ar?"EN":"العربية"}</button>
        <Link href={"/product/"+locale} dir="ltr">A1 Mobi ↗</Link>
      </div>
    </header>

    <section className="mobi-store-hero" id="store-home">
      <div className="mobi-store-photo">
        <DemoScenePhoto
          src="https://images.unsplash.com/photo-1603891128711-11b4b03bb138?auto=format&fit=crop&w=1600&q=84"
          alt={ar?"متجر تقني توضيحي مختلف عن صفحة A":"Illustrative technology retail scene distinct from page A"}
          eager
        />
      </div>
      <div className="mobi-store-hero-copy">
        <span className="mobi-store-kicker">{t.kicker}</span>
        <h1>{t.title}<br/><em>{t.accent}</em></h1>
        <p>{t.sub}</p>
        <div className="mobi-store-buttons">
          <button type="button" className="mobi-store-btn mobi-store-btn-primary" onClick={()=>scrollTo("products")}>{t.discover} ←</button>
          <button type="button" className="mobi-store-btn mobi-store-btn-secondary" disabled title={t.repairUnavailable}>{t.repair}</button>
        </div>
        <span className="mobi-store-caption" id="about-store" tabIndex={-1}>{t.demo}</span>
      </div>
    </section>

    <section className="mobi-store-info" id="visit" tabIndex={-1} aria-label={ar?"معلومات المتجر":"Store information"}>
      <div><b>⌖ {t.location}</b><span>{ar?branchAr:branchEn}</span></div>
      <div><b>◷ {t.hours}</b><span>{t.hoursValue}</span></div>
      <div id="services" tabIndex={-1}><b>✦ {t.service}</b><span>{t.serviceValue}</span></div>
      <div id="store-contact" tabIndex={-1}><b>◉ {t.contactLabel}</b><span>{t.contactValue}</span></div>
    </section>

    <section className="mobi-store-featured" id="products" tabIndex={-1} aria-label={ar?"منتجات وأسعار توضيحية":"Illustrative products and prices"}>
      <div className="mobi-store-section-head">
        <div><span className="mobi-store-kicker">{t.sample}</span><h2>{t.section}</h2></div>
        <small role="status">{filtered.length} {t.result}</small>
      </div>
      <div className="mobi-store-products" id="store-product-results">
        {filtered.slice(0,4).map(product=><article key={product.id} className="mobi-store-product">
          <div className="mobi-store-product-photo"><DemoProductPhoto product={product} locale={locale} compact /></div>
          <div className="mobi-store-product-body">
            <small>{product.brand}</small>
            <h3>{ar?product.nameAr:product.nameEn}</h3>
            <div><strong dir="ltr">{"$"+product.price.toLocaleString("en-US")}</strong>
              <button type="button" disabled title={t.cartUnavailable}>{t.add}</button>
            </div>
          </div>
        </article>)}
      </div>
      {!filtered.length&&<p className="mobi-store-result-note" role="status">{t.noResults}</p>}
    </section>

    <footer className="mobi-store-bottom">
      <span>✓ {t.trust1}</span><span>✓ {t.trust2}</span><span>✓ {t.trust3}</span><span className="mobi-store-powered">{t.powered}</span>
    </footer>
  </main>;
}
