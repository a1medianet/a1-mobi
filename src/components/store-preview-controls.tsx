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
    brandSub:"Ù…ØªØ¬Ø± ØªØ¬Ø±ÙŠØ¨ÙŠ Â· Ù‡ÙˆØ§ØªÙ ÙˆØµÙŠØ§Ù†Ø©",
    home:"Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠØ©",products:"Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª",repairs:"Ø§Ù„ØµÙŠØ§Ù†Ø©",about:"Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø¹Ù†Ø§",contact:"ØªÙˆØ§ØµÙ„",
    search:"Ø§Ø¨Ø­Ø« Ø¹Ù† Ù‡Ø§ØªÙ Ø£Ùˆ Ø¥ÙƒØ³Ø³ÙˆØ§Ø±",whatsapp:"WhatsApp",whatsappUnavailable:"WhatsApp ØºÙŠØ± Ù…Ù‡ÙŠÙ‘Ø£ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©",
    kicker:"Ù…Ø±Ø­Ø¨Ù‹Ø§ Ø¨Ùƒ ÙÙŠ TechZone",title:"Ø£Ø­Ø¯Ø« Ø§Ù„Ù‡ÙˆØ§ØªÙ.",accent:"ÙˆØ®Ø¯Ù…Ø© ØªØ«Ù‚ Ø¨Ù‡Ø§.",sub:"Ø§Ø®ØªØ± Ø¬Ù‡Ø§Ø²Ùƒ Ø§Ù„Ù‚Ø§Ø¯Ù…ØŒ ÙˆØ§Ø³ØªÙƒØ´Ù Ø§Ù„Ø¥ÙƒØ³Ø³ÙˆØ§Ø±Ø§Øª ÙˆØ®Ø¯Ù…Ø§Øª Ø§Ù„ØµÙŠØ§Ù†Ø© Ù…Ù† Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯.",
    discover:"Ø§ÙƒØªØ´Ù Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª",repair:"Ø§Ø­Ø¬Ø² ØµÙŠØ§Ù†Ø©",repairUnavailable:"Ø­Ø¬Ø² Ø§Ù„ØµÙŠØ§Ù†Ø© ØºÙŠØ± Ù…ØªØ§Ø­ ÙÙŠ Ù‡Ø°Ù‡ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©",
    demo:"TechZone Ø¹Ù„Ø§Ù…Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ© ØªÙˆØ¶ÙŠØ­ÙŠØ© Â· Ø§Ù„ØµÙˆØ± ÙˆØ§Ù„Ø£Ø³Ø¹Ø§Ø± Ù„Ø§ ØªÙ…Ø«Ù‘Ù„ Ø¹Ø±ÙˆØ¶ Ù…ØªØ¬Ø± Ø­Ù‚ÙŠÙ‚ÙŠ",
    location:"Ø§Ù„Ù…ÙˆÙ‚Ø¹",hours:"Ø³Ø§Ø¹Ø§Øª Ø§Ù„Ø¹Ù…Ù„",hoursValue:"ØªÙØ­Ø¯Ù‘Ø¯ Ù…Ù† Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±",service:"ØµÙŠØ§Ù†Ø© Ø§Ù„Ø£Ø¬Ù‡Ø²Ø©",serviceValue:"Ø§Ø³ØªÙ„Ø§Ù… Â· ØªØ´Ø®ÙŠØµ Â· Ù…ØªØ§Ø¨Ø¹Ø© Â· ØªØ³Ù„ÙŠÙ…",
    contactLabel:"Ø§Ù„ØªÙˆØ§ØµÙ„",contactValue:"Ø±Ù‚Ù… Ø§Ù„Ù…ØªØ¬Ø± ØºÙŠØ± Ù…Ù‡ÙŠÙ‘Ø£ ÙÙŠ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©",
    section:"Ø£Ø¨Ø±Ø² Ù…Ù†ØªØ¬Ø§ØªÙ†Ø§",sample:"Ø§Ø®ØªÙŠØ§Ø±Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ© Â· USD",add:"Ø£Ø¶Ù Ø¥Ù„Ù‰ Ø§Ù„Ø³Ù„Ø©",cartUnavailable:"Ø§Ù„Ø³Ù„Ø© ØºÙŠØ± Ù…ÙØ¹Ù‘Ù„Ø© ÙÙŠ Ø§Ù„Ù…Ø¹Ø§ÙŠÙ†Ø©",
    noResults:"Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª Ù…Ø·Ø§Ø¨Ù‚Ø©. Ø¬Ø±Ù‘Ø¨ Ø§Ø³Ù…Ù‹Ø§ Ø¢Ø®Ø±.",result:"Ù…Ù†ØªØ¬Ø§Øª ØªÙˆØ¶ÙŠØ­ÙŠØ©",trust1:"Ø£Ø¬Ù‡Ø²Ø© Ù…Ø®ØªØ§Ø±Ø©",trust2:"ØµÙŠØ§Ù†Ø© Ù…Ù†Ø¸Ù…Ø©",trust3:"Ù…ØªØ§Ø¨Ø¹Ø© ÙˆØ§Ø¶Ø­Ø©",powered:"Powered by A1 Mobi",
    menu:"Ø§Ù„Ù‚Ø§Ø¦Ù…Ø©",close:"Ø¥ØºÙ„Ø§Ù‚",
  },
  en:{
    brandSub:"Demo store Â· phones & repair",
    home:"Home",products:"Products",repairs:"Repairs",about:"About",contact:"Contact",
    search:"Search phones or accessories",whatsapp:"WhatsApp",whatsappUnavailable:"WhatsApp is not configured in this preview",
    kicker:"Welcome to TechZone",title:"Latest phones.",accent:"Service you can trust.",sub:"Choose your next device and explore accessories and repair services in one place.",
    discover:"Explore products",repair:"Book repair",repairUnavailable:"Repair booking is not available in this preview",
    demo:"TechZone is an illustrative demo brand Â· images and prices are not real-store offers",
    location:"Location",hours:"Working hours",hoursValue:"Configured by each store",service:"Device repair",serviceValue:"Intake Â· diagnosis Â· tracking Â· delivery",
    contactLabel:"Contact",contactValue:"Store phone is not configured in preview",
    section:"Featured products",sample:"Demo selection Â· USD",add:"Add to cart",cartUnavailable:"Cart is not enabled in preview",
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
        <span aria-hidden="true">âŒ•</span>
        <input value={query} onChange={event=>setQuery(event.target.value)} placeholder={t.search} aria-label={t.search}/>
      </label>

      <button className="mobi-store-menu-button" type="button" aria-expanded={open} aria-controls="store-menu" onClick={()=>setOpen(value=>!value)}>{open?t.close:t.menu}</button>

      <nav id="store-menu" className={open?"is-open":""} aria-label={ar?"Ø§Ù„ØªÙ†Ù‚Ù„ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ":"Store navigation"}>
        <button type="button" onClick={()=>scrollTo("store-home")}>{t.home}</button>
        <button type="button" onClick={()=>scrollTo("products")}>{t.products}</button>
        <button type="button" onClick={()=>scrollTo("services")}>{t.repairs}</button>
        <button type="button" onClick={()=>scrollTo("about-store")}>{t.about}</button>
        <button type="button" onClick={()=>scrollTo("store-contact")}>{t.contact}</button>
      </nav>

      <div className="mobi-store-header-actions">
        <button className="mobi-store-whatsapp" type="button" disabled title={t.whatsappUnavailable}>â— {t.whatsapp}</button>
        <button className="mobi-store-lang" type="button" onClick={()=>setLocale(ar?"en":"ar")}>{ar?"EN":"Ø§Ù„Ø¹Ø±Ø¨ÙŠØ©"}</button>
        <Link href={"/product/"+locale} dir="ltr">A1 Mobi â†—</Link>
      </div>
    </header>

    <section className="mobi-store-hero" id="store-home">
      <div className="mobi-store-photo">
        <DemoScenePhoto
          src="/demo/abc/b-techzone-hero.webp"
          alt={ar?"Ù…ØªØ¬Ø± ØªÙ‚Ù†ÙŠ ØªÙˆØ¶ÙŠØ­ÙŠ Ù…Ø®ØªÙ„Ù Ø¹Ù† ØµÙØ­Ø© A":"Illustrative technology retail scene distinct from page A"}
          eager
        />
      </div>
      <div className="mobi-store-hero-copy">
        <span className="mobi-store-kicker">{t.kicker}</span>
        <h1>{t.title}<br/><em>{t.accent}</em></h1>
        <p>{t.sub}</p>
        <div className="mobi-store-buttons">
          <button type="button" className="mobi-store-btn mobi-store-btn-primary" onClick={()=>scrollTo("products")}>{t.discover} â†</button>
          <button type="button" className="mobi-store-btn mobi-store-btn-secondary" disabled title={t.repairUnavailable}>{t.repair}</button>
        </div>
        <span className="mobi-store-caption" id="about-store" tabIndex={-1}>{t.demo}</span>
      </div>
    </section>

    <section className="mobi-store-info" id="visit" tabIndex={-1} aria-label={ar?"Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±":"Store information"}>
      <div><b>âŒ– {t.location}</b><span>{ar?branchAr:branchEn}</span></div>
      <div><b>â—· {t.hours}</b><span>{t.hoursValue}</span></div>
      <div id="services" tabIndex={-1}><b>âœ¦ {t.service}</b><span>{t.serviceValue}</span></div>
      <div id="store-contact" tabIndex={-1}><b>â—‰ {t.contactLabel}</b><span>{t.contactValue}</span></div>
    </section>

    <section className="mobi-store-featured" id="products" tabIndex={-1} aria-label={ar?"Ù…Ù†ØªØ¬Ø§Øª ÙˆØ£Ø³Ø¹Ø§Ø± ØªÙˆØ¶ÙŠØ­ÙŠØ©":"Illustrative products and prices"}>
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
      <span>âœ“ {t.trust1}</span><span>âœ“ {t.trust2}</span><span>âœ“ {t.trust3}</span><span className="mobi-store-powered">{t.powered}</span>
    </footer>
  </main>;
}

