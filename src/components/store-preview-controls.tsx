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
    section:"أبرز منتجاتنا",sample:"اختيارات تجريبية · USD",add:"أضف إلى السلة",cartUnavailable:"لا يمكن إرسال طلب أو دفع في المعاينة",basket:"سلة المعاينة",basketNote:"سلة تفاعلية للتوضيح فقط؛ لا تُنشئ طلبًا ولا تخصم دفعة.",basketEmpty:"السلة فارغة",basketTotal:"المجموع التوضيحي",basketClear:"إفراغ السلة",basketClose:"إغلاق السلة",basketOpen:"فتح السلة",repairExplore:"استكشف الصيانة",
    noResults:"لا توجد منتجات مطابقة. جرّب اسمًا آخر.",result:"منتجات توضيحية",trust1:"أجهزة مختارة",trust2:"صيانة منظمة",trust3:"متابعة واضحة",powered:"Powered by A1 Mobi",
    storyLabel:"قصتنا",storyTitle:"تجربة رقمية تشبه متجرًا حقيقيًا.",storyText:"يعرض نموذج TechZone طريقة تعريف العملاء بالمنتجات والخدمات والفروع، مع تجربة واضحة على الهاتف والكمبيوتر. جميع البيانات للتوضيح فقط.",
    serviceLabel:"خدماتنا",serviceTitle:"من الاستلام إلى تسليم الجهاز.",serviceText:"تعرف على مراحل الصيانة التي يمكن لمتجرك عرضها للزوار بوضوح، قبل تفعيل نظام الحجز الفعلي.",
    service1:"استلام الجهاز",service2:"الفحص والتشخيص",service3:"تقدير التكلفة",service4:"الجاهزية والتسليم",
    service1Text:"توثيق بيانات الجهاز والحالة عند الاستلام.",service2Text:"تقييم العطل والخطوات المطلوبة للإصلاح.",service3Text:"توضيح التكلفة والحصول على موافقة العميل.",service4Text:"متابعة الحالة حتى التسليم النهائي.",
    trustLabel:"لماذا هذا التصميم؟",trustHeading:"مساحة واحدة، رحلة عميل أوضح.",trustDesc:"هوية مستقلة لكل متجر، كتالوج قابل للبحث، معلومات خدمات مرتبة وتجربة ثنائية اللغة.",
    trustFeature1:"واجهة مستقلة للجهة",trustFeature2:"كتالوج وأسعار واضحة",trustFeature3:"رحلة صيانة مفهومة",
    faqLabel:"أسئلة متكررة",faqTitle:"كل شيء واضح قبل الزيارة.",faq1:"هل يمكن شراء المنتجات من هذه المعاينة؟",faqAnswer1:"يمكن تجربة السلة فقط؛ الدفع والطلبات الحقيقية غير مفعّلة.",faq2:"هل يمكن حجز موعد صيانة؟",faqAnswer2:"يمكن الاطلاع على مراحل الخدمة، لكن الحجز يتطلب تهيئة الجهة الفعلية.",faq3:"هل الأسعار والموقع وساعات العمل حقيقية؟",faqAnswer3:"لا، جميعها بيانات توضيحية قابلة للاستبدال ببيانات الجهة عند التفعيل.",
    contactHeading:"كن قريبًا من عملائك.",contactDesc:"هذه معاينة لهوية متجر يمكن تخصيص عنوانه وأوقات عمله ووسائل تواصله من لوحة الإدارة.",contactAction:"اطّلع على منصة A1 Mobi",contactNote:"لا رقم هاتف أو واتساب حقيقي متصل بهذه المعاينة.",catalogHint:"ابحث أو استعرض المنتجات التوضيحية أدناه.",siteDemo:"نموذج متجر إلكتروني متكامل قابل للتمرير",
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
    section:"Featured products",sample:"Demo selection · USD",add:"Add to cart",cartUnavailable:"No checkout or payment is available in this demo",basket:"Preview basket",basketNote:"Interactive demo only. No real order or payment is created.",basketEmpty:"Basket is empty",basketTotal:"Illustrative total",basketClear:"Clear basket",basketClose:"Close basket",basketOpen:"Open basket",repairExplore:"Explore repairs",
    noResults:"No matching products. Try another search.",result:"demo products",trust1:"Selected devices",trust2:"Organized repair",trust3:"Clear tracking",powered:"Powered by A1 Mobi",
    storyLabel:"Our story",storyTitle:"A real-store experience, built for the web.",storyText:"TechZone demonstrates how a merchant can showcase products, services and locations in an independent storefront on desktop and mobile. All displayed data is illustrative.",
    serviceLabel:"Services",serviceTitle:"From device intake to handover.",serviceText:"Show customers what to expect from the repair process before real appointment bookings are configured.",
    service1:"Device intake",service2:"Inspection & diagnosis",service3:"Cost estimate",service4:"Ready & delivered",
    service1Text:"Record device information and condition upon arrival.",service2Text:"Assess the issue and required repair work.",service3Text:"Explain the cost and obtain customer approval.",service4Text:"Track progress through final handover.",
    trustLabel:"Why this experience?",trustHeading:"One space. A clearer customer journey.",trustDesc:"An independent shop identity, searchable product catalog, organized service details and bilingual navigation.",
    trustFeature1:"Independent merchant identity",trustFeature2:"Clear catalog and prices",trustFeature3:"Understandable repair workflow",
    faqLabel:"Common questions",faqTitle:"Know before you visit.",faq1:"Can I buy from this demo store?",faqAnswer1:"The sample basket is interactive, but real orders and payments are disabled.",faq2:"Can I book a repair appointment?",faqAnswer2:"You can explore the service steps; bookings need a configured real merchant.",faq3:"Are these prices, addresses and hours real?",faqAnswer3:"No. They are illustrative information and will be replaced when a merchant configures their store.",
    contactHeading:"Stay close to your customers.",contactDesc:"A preview of a store whose address, business hours and channels can be configured from the owner dashboard.",contactAction:"Explore A1 Mobi",contactNote:"No real store phone or WhatsApp is linked to this preview.",catalogHint:"Search or browse the illustrated product range.",siteDemo:"A complete scrollable storefront preview",
    menu:"Menu",close:"Close",
  },
} as const;

export function StorePreviewExperience({products,branchAr,branchEn}:StorePreviewExperienceProps){
  const [locale,setLocale]=useState<"ar"|"en">("ar");
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [basket,setBasket]=useState<Record<string,number>>({});
  const [basketOpen,setBasketOpen]=useState(false);
  const t=copy[locale];
  const ar=locale==="ar";
  const term=query.trim().toLocaleLowerCase();
  const filtered=useMemo(()=>products.filter(product=>
    [product.nameAr,product.nameEn,product.brand,product.sku].some(value=>value.toLocaleLowerCase().includes(term))
  ),[products,term]);
  const basketItems=useMemo(()=>products.filter(item=>(basket[item.id]??0)>0),[basket,products]);
  const basketCount=basketItems.reduce((sum,item)=>sum+(basket[item.id]??0),0);
  const basketTotal=basketItems.reduce((sum,item)=>sum+item.price*(basket[item.id]??0),0);
  function addDemo(id:string){setBasket(old=>({...old,[id]:Math.min(9,(old[id]??0)+1)}));setBasketOpen(true);}
  function reduceDemo(id:string){setBasket(old=>({...old,[id]:Math.max(0,(old[id]??0)-1)}));}

  function scrollTo(id:string){
    document.getElementById(id)?.scrollIntoView({behavior:"smooth",block:"start"});
    setOpen(false);
  }

  return <main className="mobi-store mobi-store-website" lang={locale} dir={ar?"rtl":"ltr"}>
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
        <button className="mobi-store-basket-trigger" type="button" aria-label={t.basketOpen} aria-expanded={basketOpen} aria-controls="mobi-store-basket" onClick={()=>setBasketOpen(old=>!old)}>▤ <strong>{basketCount}</strong></button>
        <button className="mobi-store-whatsapp" type="button" disabled title={t.whatsappUnavailable}>● {t.whatsapp}</button>
        <button className="mobi-store-lang" type="button" onClick={()=>setLocale(ar?"en":"ar")}>{ar?"EN":"العربية"}</button>
        <Link href={"/product/"+locale} dir="ltr">A1 Mobi ↗</Link>
      </div>
    </header>

    <section className="mobi-store-hero" id="store-home">
      <div className="mobi-store-photo">
        <DemoScenePhoto
          src="/demo/abc/b-techzone-hero.webp"
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
          <button type="button" className="mobi-store-btn mobi-store-btn-secondary" onClick={()=>scrollTo("services")}>{t.repairExplore}</button>
        </div>
        <span className="mobi-store-caption">{t.demo}</span>
      </div>
    </section>

    <section className="mobi-store-info" id="visit" tabIndex={-1} aria-label={ar?"معلومات المتجر":"Store information"}>
      <div><b>⌖ {t.location}</b><span>{ar?branchAr:branchEn}</span></div>
      <div><b>◷ {t.hours}</b><span>{t.hoursValue}</span></div>
      <div id="service-summary"><b>✦ {t.service}</b><span>{t.serviceValue}</span></div>
      <div><b>◉ {t.contactLabel}</b><span>{t.contactValue}</span></div>
    </section>

    <section className="mobi-store-featured" id="products" tabIndex={-1} aria-label={ar?"منتجات وأسعار توضيحية":"Illustrative products and prices"}>
      <div className="mobi-store-section-head">
        <div><span className="mobi-store-kicker">{t.sample}</span><h2>{t.section}</h2><p className="mobi-store-section-description">{t.catalogHint}</p></div>
        <small role="status">{filtered.length} {t.result}</small>
      </div>
      <div className="mobi-store-products" id="store-product-results">
        {filtered.map(product=><article key={product.id} className="mobi-store-product">
          <div className="mobi-store-product-photo"><DemoProductPhoto product={product} locale={locale} compact /></div>
          <div className="mobi-store-product-body">
            <small>{product.brand}</small>
            <h3>{ar?product.nameAr:product.nameEn}</h3>
            <div><strong dir="ltr">{"$"+product.price.toLocaleString("en-US")}</strong>
              <button className="mobi-store-add" type="button" onClick={()=>addDemo(product.id)}>{t.add}</button>
            </div>
          </div>
        </article>)}
      </div>
      {!filtered.length&&<p className="mobi-store-result-note" role="status">{t.noResults}</p>}
    </section>

    <section className="mobi-store-services mobi-store-section" id="services" tabIndex={-1}>
      <div className="mobi-store-section-title"><span className="mobi-store-kicker">{t.serviceLabel}</span><h2>{t.serviceTitle}</h2><p>{t.serviceText}</p></div>
      <div className="mobi-store-service-steps">{[
        [t.service1,t.service1Text],[t.service2,t.service2Text],[t.service3,t.service3Text],[t.service4,t.service4Text],
      ].map(([heading,body],index)=><article key={heading}>
        <span className="mobi-store-step-number">{String(index+1).padStart(2,"0")}</span><h3>{heading}</h3><p>{body}</p>
      </article>)}</div>
      <div className="mobi-store-service-banner">
        <span aria-hidden="true">✦</span>
        <div><strong>{t.service}</strong><p>{t.serviceValue}</p></div>
        <button type="button" disabled title={t.repairUnavailable}>{t.repair}</button>
      </div>
    </section>

    <section className="mobi-store-story mobi-store-section" id="about-store" tabIndex={-1}>
      <div className="mobi-store-story-art" aria-hidden="true">
        <span>Tech<span>Zone</span></span>
        <div className="mobi-store-story-device"><span>▣</span><strong>TECHZONE</strong><i/><i/><i/></div>
        <small>Digital storefront / Retail & repair</small>
      </div>
      <div className="mobi-store-story-copy">
        <span className="mobi-store-kicker">{t.storyLabel}</span><h2>{t.storyTitle}</h2><p>{t.storyText}</p>
        <div className="mobi-store-story-facts"><span>✓ {t.trustFeature1}</span><span>✓ {t.trustFeature2}</span><span>✓ {t.trustFeature3}</span></div>
      </div>
    </section>

    <section className="mobi-store-values mobi-store-section">
      <div className="mobi-store-section-title"><span className="mobi-store-kicker">{t.trustLabel}</span><h2>{t.trustHeading}</h2><p>{t.trustDesc}</p></div>
      <div className="mobi-store-value-grid">
        <article><span>01</span><b>{t.trustFeature1}</b><i aria-hidden="true">◇</i></article>
        <article><span>02</span><b>{t.trustFeature2}</b><i aria-hidden="true">▣</i></article>
        <article><span>03</span><b>{t.trustFeature3}</b><i aria-hidden="true">⌁</i></article>
      </div>
    </section>

    <section className="mobi-store-faq mobi-store-section">
      <div className="mobi-store-section-title"><span className="mobi-store-kicker">{t.faqLabel}</span><h2>{t.faqTitle}</h2></div>
      <div className="mobi-store-faq-list">{[
        [t.faq1,t.faqAnswer1],[t.faq2,t.faqAnswer2],[t.faq3,t.faqAnswer3],
      ].map(([question,answer])=><details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    </section>

    <section className="mobi-store-contact-section mobi-store-section" id="store-contact" tabIndex={-1}>
      <div><span className="mobi-store-kicker">{t.contactLabel}</span><h2>{t.contactHeading}</h2><p>{t.contactDesc}</p><small>{t.contactNote}</small></div>
      <div className="mobi-store-contact-card"><strong>TechZone</strong>
        <p>⌖ {ar?branchAr:branchEn}</p><p>◷ {t.hoursValue}</p>
        <Link href={"/product/"+locale}>{t.contactAction} ↗</Link>
      </div>
    </section>

    <footer className="mobi-store-bottom mobi-store-footer">
      <div><strong className="mobi-store-footer-logo"><span>Tech</span>Zone</strong><p>{t.siteDemo}</p><small>{t.demo}</small></div>
      <div><strong>{t.products}</strong><button type="button" onClick={()=>scrollTo("products")}>{t.section}</button><button type="button" onClick={()=>scrollTo("services")}>{t.repairs}</button></div>
      <div><strong>{t.about}</strong><button type="button" onClick={()=>scrollTo("about-store")}>{t.storyLabel}</button><button type="button" onClick={()=>scrollTo("store-contact")}>{t.contact}</button></div>
      <div className="mobi-store-footer-powered"><span>✓ {t.trust1} · {t.trust2} · {t.trust3}</span><span>{t.powered}</span></div>
    </footer>
    {basketOpen&&<aside id="mobi-store-basket" className="mobi-store-basket-panel" role="dialog" aria-modal="false" aria-label={t.basket}>
      <div className="mobi-store-basket-title"><h2>{t.basket} ({basketCount})</h2><button type="button" aria-label={t.basketClose} onClick={()=>setBasketOpen(false)}>×</button></div>
      <p className="mobi-store-basket-notice">{t.basketNote}</p>
      {basketItems.length===0?<p role="status">{t.basketEmpty}</p>:<>
        <ul className="mobi-store-basket-list">{basketItems.map(item=><li key={item.id}>
          <span>{ar?item.nameAr:item.nameEn}</span>
          <div><button type="button" aria-label={"− "+(ar?item.nameAr:item.nameEn)} onClick={()=>reduceDemo(item.id)}>−</button><b>{basket[item.id]}</b><button type="button" aria-label={"+ "+(ar?item.nameAr:item.nameEn)} onClick={()=>addDemo(item.id)}>+</button></div>
        </li>)}</ul>
        <div className="mobi-store-basket-total"><span>{t.basketTotal}</span><strong dir="ltr">{"$"+basketTotal.toLocaleString("en-US")}</strong></div>
        <button className="mobi-store-basket-clear" type="button" onClick={()=>setBasket({})}>{t.basketClear}</button>
        <p className="mobi-store-basket-notice">{t.cartUnavailable}</p>
      </>}
    </aside>}
  </main>;
}

