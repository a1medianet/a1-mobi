from pathlib import Path
root=Path(r"C:\A1Hub\a1-mobi")
def edit(relative, before, after):
    f=root/relative
    txt=f.read_text(encoding="utf-8")
    n=txt.count(before)
    if n!=1: raise RuntimeError(f"Expected 1 match {relative}: got {n}, key {before[:65]!r}")
    f.write_text(txt.replace(before,after,1),encoding="utf-8",newline="\n")
    print("UPDATED",relative)
p="src/components/store-preview-controls.tsx"
edit(p,'    menu:"القائمة",close:"إغلاق",','''    storyLabel:"قصتنا",storyTitle:"تجربة رقمية تشبه متجرًا حقيقيًا.",storyText:"يعرض نموذج TechZone طريقة تعريف العملاء بالمنتجات والخدمات والفروع، مع تجربة واضحة على الهاتف والكمبيوتر. جميع البيانات للتوضيح فقط.",
    serviceLabel:"خدماتنا",serviceTitle:"من الاستلام إلى تسليم الجهاز.",serviceText:"تعرف على مراحل الصيانة التي يمكن لمتجرك عرضها للزوار بوضوح، قبل تفعيل نظام الحجز الفعلي.",
    service1:"استلام الجهاز",service2:"الفحص والتشخيص",service3:"تقدير التكلفة",service4:"الجاهزية والتسليم",
    service1Text:"توثيق بيانات الجهاز والحالة عند الاستلام.",service2Text:"تقييم العطل والخطوات المطلوبة للإصلاح.",service3Text:"توضيح التكلفة والحصول على موافقة العميل.",service4Text:"متابعة الحالة حتى التسليم النهائي.",
    trustLabel:"لماذا هذا التصميم؟",trustHeading:"مساحة واحدة، رحلة عميل أوضح.",trustDesc:"هوية مستقلة لكل متجر، كتالوج قابل للبحث، معلومات خدمات مرتبة وتجربة ثنائية اللغة.",
    trustFeature1:"واجهة مستقلة للجهة",trustFeature2:"كتالوج وأسعار واضحة",trustFeature3:"رحلة صيانة مفهومة",
    faqLabel:"أسئلة متكررة",faqTitle:"كل شيء واضح قبل الزيارة.",faq1:"هل يمكن شراء المنتجات من هذه المعاينة؟",faqAnswer1:"يمكن تجربة السلة فقط؛ الدفع والطلبات الحقيقية غير مفعّلة.",faq2:"هل يمكن حجز موعد صيانة؟",faqAnswer2:"يمكن الاطلاع على مراحل الخدمة، لكن الحجز يتطلب تهيئة الجهة الفعلية.",faq3:"هل الأسعار والموقع وساعات العمل حقيقية؟",faqAnswer3:"لا، جميعها بيانات توضيحية قابلة للاستبدال ببيانات الجهة عند التفعيل.",
    contactHeading:"كن قريبًا من عملائك.",contactDesc:"هذه معاينة لهوية متجر يمكن تخصيص عنوانه وأوقات عمله ووسائل تواصله من لوحة الإدارة.",contactAction:"اطّلع على منصة A1 Mobi",contactNote:"لا رقم هاتف أو واتساب حقيقي متصل بهذه المعاينة.",catalogHint:"ابحث أو استعرض المنتجات التوضيحية أدناه.",siteDemo:"نموذج متجر إلكتروني متكامل قابل للتمرير",
    menu:"القائمة",close:"إغلاق",''')
edit(p,'    menu:"Menu",close:"Close",','''    storyLabel:"Our story",storyTitle:"A real-store experience, built for the web.",storyText:"TechZone demonstrates how a merchant can showcase products, services and locations in an independent storefront on desktop and mobile. All displayed data is illustrative.",
    serviceLabel:"Services",serviceTitle:"From device intake to handover.",serviceText:"Show customers what to expect from the repair process before real appointment bookings are configured.",
    service1:"Device intake",service2:"Inspection & diagnosis",service3:"Cost estimate",service4:"Ready & delivered",
    service1Text:"Record device information and condition upon arrival.",service2Text:"Assess the issue and required repair work.",service3Text:"Explain the cost and obtain customer approval.",service4Text:"Track progress through final handover.",
    trustLabel:"Why this experience?",trustHeading:"One space. A clearer customer journey.",trustDesc:"An independent shop identity, searchable product catalog, organized service details and bilingual navigation.",
    trustFeature1:"Independent merchant identity",trustFeature2:"Clear catalog and prices",trustFeature3:"Understandable repair workflow",
    faqLabel:"Common questions",faqTitle:"Know before you visit.",faq1:"Can I buy from this demo store?",faqAnswer1:"The sample basket is interactive, but real orders and payments are disabled.",faq2:"Can I book a repair appointment?",faqAnswer2:"You can explore the service steps; bookings need a configured real merchant.",faq3:"Are these prices, addresses and hours real?",faqAnswer3:"No. They are illustrative information and will be replaced when a merchant configures their store.",
    contactHeading:"Stay close to your customers.",contactDesc:"A preview of a store whose address, business hours and channels can be configured from the owner dashboard.",contactAction:"Explore A1 Mobi",contactNote:"No real store phone or WhatsApp is linked to this preview.",catalogHint:"Search or browse the illustrated product range.",siteDemo:"A complete scrollable storefront preview",
    menu:"Menu",close:"Close",''')
edit(p,'  return <main className="mobi-store" lang={locale} dir={ar?"rtl":"ltr"}>','  return <main className="mobi-store mobi-store-website" lang={locale} dir={ar?"rtl":"ltr"}>')
edit(p,'<div id="services" tabIndex={-1}><b>✦ {t.service}</b>','<div id="service-summary"><b>✦ {t.service}</b>')
edit(p,'<div id="store-contact" tabIndex={-1}><b>◉ {t.contactLabel}</b>','<div><b>◉ {t.contactLabel}</b>')
edit(p,'<span className="mobi-store-caption" id="about-store" tabIndex={-1}>{t.demo}</span>','<span className="mobi-store-caption">{t.demo}</span>')
edit(p,'<div><span className="mobi-store-kicker">{t.sample}</span><h2>{t.section}</h2></div>','<div><span className="mobi-store-kicker">{t.sample}</span><h2>{t.section}</h2><p className="mobi-store-section-description">{t.catalogHint}</p></div>')
edit(p,'{filtered.slice(0,4).map(product=><article key={product.id} className="mobi-store-product">','{filtered.map(product=><article key={product.id} className="mobi-store-product">')
edit(p,'''    <footer className="mobi-store-bottom">
      <span>✓ {t.trust1}</span><span>✓ {t.trust2}</span><span>✓ {t.trust3}</span><span className="mobi-store-powered">{t.powered}</span>
    </footer>''','''    <section className="mobi-store-services mobi-store-section" id="services" tabIndex={-1}>
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
    </footer>''')
css=root/"src/app/globals.css"
s=css.read_text(encoding="utf-8")
tag="A1 MOBI B MERCHANT SCROLLABLE SITE 20261017"
assert tag not in s
styles='''
/* A1 MOBI B MERCHANT SCROLLABLE SITE 20261017 — replaces superseded one-screen pilot gate. */
.mobi-store-website{display:block;min-height:100dvh;height:auto;overflow-x:clip;overflow-y:visible;padding:0 clamp(15px,3vw,56px);background:#f7faff}
.mobi-store-website > section{margin-top:clamp(14px,2.3vw,30px);scroll-margin-top:110px}
.mobi-store-website .mobi-store-header{position:sticky;top:0;z-index:55;border-radius:0 0 18px 18px}
.mobi-store-website .mobi-store-hero{min-height:475px;max-height:none;height:auto;flex:none}
.mobi-store-website .mobi-store-hero-copy{padding:clamp(32px,4vw,70px)}
.mobi-store-website .mobi-store-hero h1{font-size:clamp(35px,3.7vw,66px);line-height:1.25}
.mobi-store-website .mobi-store-info{margin-top:16px}
.mobi-store-website .mobi-store-info>div{padding:19px 22px}
.mobi-store-website .mobi-store-featured{height:auto;min-height:0;overflow:visible;display:block;margin-top:68px}
.mobi-store-website .mobi-store-section-head{margin-bottom:24px;align-items:center}
.mobi-store-website .mobi-store-section-head h2,.mobi-store-website .mobi-store-section-title h2{font-size:clamp(25px,2.65vw,39px);font-family:"Alexandria","IBM Plex Sans Arabic",sans-serif;font-weight:790;color:#14233d;line-height:1.48;margin:7px 0}
.mobi-store-section-description,.mobi-store-section-title>p{font-size:14px;line-height:1.9;color:#64758d;margin:8px 0}
.mobi-store-website .mobi-store-products{height:auto;overflow:visible;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}
.mobi-store-website .mobi-store-product{display:flex;flex-direction:column;height:auto;overflow:hidden;min-height:370px;box-shadow:0 12px 30px #1d345008;border-radius:18px}
.mobi-store-website .mobi-store-product-photo{min-height:220px;height:220px;background:linear-gradient(145deg,#f3f7fc,#eaf0f9)}
.mobi-store-website .mobi-store-product-photo img{max-height:180px}
.mobi-store-website .mobi-store-product-body{flex:1;padding:20px;gap:6px}
.mobi-store-website .mobi-store-product-body h3{font-size:14px;min-height:43px;line-height:1.6;margin:3px 0 11px}
.mobi-store-website .mobi-store-product-body strong{font-size:18px}
.mobi-store-website .mobi-store-add{min-height:40px;cursor:pointer}
.mobi-store-website .mobi-store-section{padding-block:72px}
.mobi-store-website .mobi-store-section-title{max-width:780px;margin-bottom:28px}
.mobi-store-service-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.mobi-store-service-steps article{position:relative;border:1px solid #e3eaf5;border-radius:20px;padding:24px;background:#fff;min-height:214px}
.mobi-store-step-number{font-size:32px;display:block;font-weight:850;color:#ff7a1a;letter-spacing:-1px}
.mobi-store-service-steps h3{font-size:17px;color:#14233d;margin:13px 0 8px}
.mobi-store-service-steps p,.mobi-store-story-copy p{font-size:14px;line-height:1.95;color:#64758d;margin:0}
.mobi-store-service-banner{margin-top:24px;padding:25px 32px;background:#142b4d;color:#fff;border-radius:20px;display:flex;gap:22px;align-items:center}
.mobi-store-service-banner>span{font-size:30px;color:#ff9d53}
.mobi-store-service-banner strong{font-size:18px}.mobi-store-service-banner p{margin:5px 0 0;color:#d8e2f2;font-size:13px}
.mobi-store-service-banner button{margin-inline-start:auto;border:1px solid #f4a975;border-radius:10px;padding:12px 18px;color:#fff;background:#ff7a1a}
.mobi-store-service-banner button:disabled{opacity:.65;cursor:not-allowed}
.mobi-store-story{display:grid;grid-template-columns:1fr 1fr;gap:clamp(25px,5vw,85px);align-items:center}
.mobi-store-story-art{position:relative;min-height:375px;background:linear-gradient(130deg,#13345c,#1265e8 80%);border-radius:28px;color:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}
.mobi-store-story-art:before{content:"";position:absolute;width:350px;height:350px;inset-inline-start:-110px;top:-100px;border:1px solid #ffffff30;border-radius:50%;box-shadow:0 0 0 35px #ffffff08,0 0 0 70px #ffffff06}
.mobi-store-story-art>span{position:absolute;top:40px;inset-inline-start:42px;font-size:29px;font-weight:900}
.mobi-store-story-art>span span{color:#ffa25f}
.mobi-store-story-art>small{position:absolute;bottom:28px;inset-inline-start:40px;color:#dcecff}
.mobi-store-story-device{position:relative;width:185px;height:270px;border:9px solid #162943;border-radius:25px;background:#fff;transform:rotate(-11deg);box-shadow:0 22px 45px #08162950;display:flex;align-items:center;flex-direction:column;color:#1265e8;gap:12px;padding:25px 15px}
.mobi-store-story-device>span{font-size:60px}.mobi-store-story-device>strong{font-size:13px}.mobi-store-story-device i{display:block;width:100%;height:19px;background:#dbeaff;border-radius:7px}.mobi-store-story-device i:nth-last-child(2){width:75%;background:#ffe1c8}
.mobi-store-story-copy h2,.mobi-store-contact-section h2{font-size:clamp(26px,3vw,40px);line-height:1.5;margin:12px 0;color:#14233d}
.mobi-store-story-facts{display:grid;gap:14px;margin-top:24px;font-weight:700;color:#1265e8}
.mobi-store-values{background:#fff;border-radius:28px;padding-inline:clamp(24px,4vw,65px)}
.mobi-store-value-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.mobi-store-value-grid article{min-height:160px;border-radius:17px;background:#f4f8ff;padding:26px;display:flex;flex-direction:column;gap:20px}
.mobi-store-value-grid article span{color:#ff7a1a;font-size:14px;font-weight:900}.mobi-store-value-grid article b{font-size:17px}.mobi-store-value-grid article i{font-size:35px;color:#1265e8;font-style:normal;align-self:flex-end}
.mobi-store-faq-list{display:grid;gap:10px;max-width:920px}
.mobi-store-faq-list details{background:#fff;border:1px solid #e1e9f5;border-radius:14px;padding:19px 24px}
.mobi-store-faq-list summary{cursor:pointer;font-size:16px;font-weight:750;color:#14233d}
.mobi-store-faq-list details p{line-height:1.9;color:#64758d;font-size:14px;margin:14px 0 0}
.mobi-store-contact-section{border-radius:25px;padding-inline:clamp(22px,4vw,60px);background:linear-gradient(115deg,#eaf4ff,#fff7f0);display:grid;grid-template-columns:1.2fr .8fr;gap:25px;align-items:center}
.mobi-store-contact-section p{color:#536783;line-height:1.9;font-size:15px}.mobi-store-contact-section small{color:#9b502a}
.mobi-store-contact-card{border:1px solid #deebff;background:#fff;border-radius:20px;padding:28px;box-shadow:0 12px 30px #243c5c09}
.mobi-store-contact-card strong{font-size:25px;color:#1265e8}.mobi-store-contact-card p{font-size:14px;color:#536783}
.mobi-store-contact-card a{display:inline-flex;align-items:center;justify-content:center;margin-top:16px;padding:12px 20px;border-radius:10px;text-decoration:none;color:#fff;background:#1265e8;font-weight:750}
.mobi-store-footer{margin-top:28px;display:grid;grid-template-columns:2fr 1fr 1fr 1.5fr;gap:32px;padding:50px clamp(25px,4vw,65px);color:#dce8f8;background:#14233d;border-radius:25px 25px 0 0}
.mobi-store-footer div{display:flex;flex-direction:column;gap:12px}.mobi-store-footer p,.mobi-store-footer small{color:#aebed5;line-height:1.7;margin:0}
.mobi-store-footer strong{font-size:15px;color:#fff}.mobi-store-footer-logo{font-size:29px!important;color:#ff7a1a!important}.mobi-store-footer-logo span{color:#6eabff}
.mobi-store-footer button{background:none;border:0;text-align:start;padding:0;color:#c8d7ed;font-size:14px;cursor:pointer}
.mobi-store-footer-powered{font-size:13px;color:#c8d7ed}.mobi-store-website :is(.mobi-store-faq-list details,.mobi-store-value-grid article,.mobi-store-product):focus-within{outline:2px solid #ff7a1a;outline-offset:2px}
@media(min-width:1200px) and (min-height:740px){
 .mobi-store-website{height:auto;min-height:100dvh;display:block;overflow-y:visible}
 .mobi-store-website .mobi-store-hero{min-height:475px;max-height:none;height:auto}
 .mobi-store-website .mobi-store-featured{height:auto;min-height:0;overflow:visible}
 .mobi-store-website .mobi-store-products{height:auto;overflow:visible}
 .mobi-store-website .mobi-store-product{height:auto}
 .mobi-store-website .mobi-store-bottom{min-height:0}
}
@media(max-width:1050px){
 .mobi-store-website .mobi-store-products{grid-template-columns:repeat(2,minmax(0,1fr))}
 .mobi-store-service-steps{grid-template-columns:repeat(2,minmax(0,1fr))}
 .mobi-store-story{grid-template-columns:1fr}
 .mobi-store-website .mobi-store-hero{min-height:400px;max-height:none}
}
@media(max-width:640px){
 .mobi-store-website{padding-inline:10px}
 .mobi-store-website .mobi-store-header{top:0}
 .mobi-store-website .mobi-store-hero{display:flex;flex-direction:column;min-height:0;height:auto}
 .mobi-store-website .mobi-store-photo{height:250px}
 .mobi-store-website .mobi-store-hero-copy{padding:24px}
 .mobi-store-website .mobi-store-hero h1{font-size:clamp(27px,7vw,36px)}
 .mobi-store-website .mobi-store-featured{margin-top:42px}
 .mobi-store-website .mobi-store-products{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .mobi-store-website .mobi-store-product{min-height:270px}
 .mobi-store-website .mobi-store-product-photo{height:130px;min-height:130px}
 .mobi-store-website .mobi-store-product-photo img{max-height:112px}
 .mobi-store-website .mobi-store-product-body{padding:12px;gap:3px}
 .mobi-store-website .mobi-store-product-body h3{font-size:11px;line-height:1.5;margin:3px 0}
 .mobi-store-website .mobi-store-product-body strong{font-size:14px}
 .mobi-store-website .mobi-store-product-body>div{align-items:flex-start}
 .mobi-store-website .mobi-store-add{font-size:11px;padding-inline:7px}
 .mobi-store-website .mobi-store-section{padding-block:38px}
 .mobi-store-service-steps{grid-template-columns:1fr 1fr;gap:9px}
 .mobi-store-service-steps article{padding:16px;min-height:215px}
 .mobi-store-service-steps h3{font-size:14px}
 .mobi-store-service-steps p{font-size:12px}
 .mobi-store-service-banner{padding:20px;gap:12px;flex-wrap:wrap}
 .mobi-store-service-banner button{margin-inline-start:0}
 .mobi-store-story-art{min-height:280px}
 .mobi-store-story-device{transform:rotate(-8deg) scale(.77)}
 .mobi-store-values{padding-inline:20px}
 .mobi-store-value-grid{grid-template-columns:1fr}
 .mobi-store-contact-section{grid-template-columns:1fr;padding-inline:20px}
 .mobi-store-footer{grid-template-columns:1fr 1fr;padding:35px 22px;gap:24px}
 .mobi-store-footer>div:first-child,.mobi-store-footer-powered{grid-column:1/-1}
}
'''
css.write_text(s+"\n"+styles,encoding="utf-8",newline="\n")
print("APPENDED SCROLLABLE MERCHANT CSS",len(styles))
q="src/app/store-preview/page.tsx"
edit(q,'''  const products=[
    ...demoProducts.filter(product=>product.type==="DEVICE").slice(0,3),
    ...demoProducts.filter(product=>product.type==="ACCESSORY").slice(0,1),
  ];''','''  const products=[
    ...demoProducts.filter(product=>product.type==="DEVICE"),
    ...demoProducts.filter(product=>product.type==="ACCESSORY").slice(0,4),
  ];''')
q="scripts/abc-browser-qa.mjs"
edit(q,'assert(bViewport.scrollHeight <= bViewport.innerHeight, "B exceeds 1440x900 viewport: " + JSON.stringify(bViewport));','''assert(bViewport.scrollHeight > bViewport.innerHeight * 1.5, "B must be a fully scrollable merchant site: " + JSON.stringify(bViewport));
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-product").length >= 8'), "B should show a real storefront catalog");
  assert(await evaluate(cdp, '["services","about-store","store-contact"].every(id=>Boolean(document.getElementById(id)))'), "B merchant services/about/contact sections missing");
  assert(await evaluate(cdp, 'document.querySelectorAll(".mobi-store-faq-list details").length === 3'), "B customer FAQ missing");''')
edit(q,'assert(await evaluate(cdp, \'document.querySelectorAll(".mobi-store-product").length === 4\'), "B must render four featured products");','assert(await evaluate(cdp, \'document.querySelectorAll(".mobi-store-product").length >= 8\'), "B must render expanded merchant catalog");')
print("B FULL WEBSITE PATCH COMPLETE")
