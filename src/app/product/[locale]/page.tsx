import Link from "next/link";
import { DemoProductPhoto, DemoScenePhoto } from "@/components/demo-product-photo";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports } from "@/demo/operations";

const content={
  ar:{
    eyebrow:"A1 MOBI · RETAIL & REPAIR OS",
    title:"أدر متجر الموبايل والصيانة من مكان واحد.",
    sub:"نقطة بيع، أجهزة وIMEI، مخزون، صيانة، عملاء وديون، صندوق، تعبئة، تقارير، فريق وصلاحيات — ضمن نظام واحد متعدد الفروع.",
    primary:"أنشئ حسابًا للتجربة",secondary:"شاهد جولة تعريفية",
    proof:"نظرة عملية قبل التسجيل",proofText:"اطّلع على أمثلة للمنتجات والمخزون والصيانة والعملاء لتتعرف على طريقة عمل النظام.",
    section:"ما الذي يديره A1 Mobi؟",sectionSub:"من لحظة دخول الجهاز إلى المتجر حتى البيع أو الصيانة والتسليم والمحاسبة.",
    how:"كيف تبدأ؟",howSub:"رحلة قصيرة من إنشاء الجهة إلى أول عملية تشغيل.",
    plans:"مبني للمتجر اليوم، وللفروع غدًا",plansSub:"ابدأ بمتجر واحد، وأضف فروعك وموظفيك حسب احتياج العمل، مع صلاحيات واضحة لكل مستخدم.",
    cta:"تعرّف على النظام ثم ابدأ متجرك",ctaSub:"استعرض الجولة التعريفية، ثم أنشئ حسابك لتبدأ إدارة أعمالك.",
  },
  en:{
    eyebrow:"A1 MOBI · RETAIL & REPAIR OS",
    title:"Run mobile retail and repair from one operating system.",
    sub:"POS, devices and IMEI, inventory, repairs, customers and debt, cash, top-up, reports, team and permissions — in one multi-branch platform.",
    primary:"Create a trial account",secondary:"Explore the guided tour",
    proof:"See the workflow before signing up",proofText:"Explore sample products, stock, repairs and customers to understand how the system works.",
    section:"What does A1 Mobi run?",sectionSub:"From device intake through sale or repair, delivery and accounting.",
    how:"How do you start?",howSub:"A short path from organization setup to the first operation.",
    plans:"Built for one store today and multiple branches tomorrow",plansSub:"Start with one store and add branches and staff as your business grows, with clear permissions for every role.",
    cta:"Get to know the system, then open your store",ctaSub:"Explore the guided tour before creating your store account.",
  }
} as const;

const features = {
  ar: [
    ["نقطة البيع", "بيع الأجهزة والإكسسوارات مع حماية السعر والمخزون.", "demo"],
    ["الصيانة", "استلام وتشخيص ومتابعة القطع والدفعات والتسليم.", "demo#repairs"],
    ["المخزون", "أجهزة وIMEI، حركات وجرد وتنبيهات نقص المخزون.", "help#inventory"],
    ["العملاء", "ملف العميل وأجهزته والديون وسجل الحركات.", "demo"],
    ["المشتريات", "شراء واستلام الأجهزة والقطع مع حركة مخزون موثقة.", "help#inventory"],
    ["التقارير", "ملخصات المبيعات والصيانة والمخزون والديون.", "demo"],
  ],
  en: [
    ["Point of sale", "Sell devices and accessories with price and stock protection.", "demo"],
    ["Repairs", "Track intake, diagnosis, parts, payments and delivery.", "demo#repairs"],
    ["Inventory", "Devices and IMEI, movements, counts and low-stock alerts.", "help#inventory"],
    ["Customers", "Customer records, devices, debt and ledger activity.", "demo"],
    ["Purchases", "Purchase and receive devices and parts with auditable stock movements.", "help#inventory"],
    ["Reports", "Summaries of sales, repairs, stock and customer debt.", "demo"],
  ],
} as const;

export default async function ProductLanding({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  const ar=locale==="ar";
  const t=content[locale];
  const counts=demoCatalogCounts();
  return <main>
    <section className="product-hero mobi-marketing-a">
      <div className="product-shell hero-layout">
        <div>
          <span className="product-eyebrow">{t.eyebrow}</span>
          <h1>{ar ? <>أدر <span className="mobi-headline-blue">متجر الموبايل</span><br/><span className="mobi-headline-orange">والصيانة</span> من مكان واحد.</> : <>Run <span className="mobi-headline-blue">mobile retail</span> and <span className="mobi-headline-orange">repair</span> from one place.</>}</h1>
          <p>{t.sub}</p>
          <div className="product-actions">
            <Link className="product-cta" href={"/product/"+locale+"/signup"}>{t.primary}</Link>
            <Link className="product-secondary" href={"/product/"+locale+"/demo"}>{t.secondary}</Link>
          </div>
          <div className="hero-trust">
            <span>✓ {ar?"عربي / English":"Arabic / English"}</span>
            <span>✓ {ar?"متعدد الجهات والفروع":"Multi-tenant & branch-ready"}</span>
            <span>✓ {ar?"حساب خاص بمتجرك":"Your own store account"}</span>
          </div>
        </div>
        <div className="mobi-a-visual">
          <div className="mobi-a-photo"><DemoScenePhoto src="https://images.unsplash.com/photo-1571854000455-d8b5b5b489fc?auto=format&fit=crop&w=1400&q=85" alt={ar?"هواتف معروضة في متجر — صورة توضيحية":"Illustrative smartphone display in a phone shop"} eager /><span>{ar?"تجارة وصيانة بإدارة أذكى":"Smarter retail & repairs"}</span></div>
        <aside className="product-preview-card mobi-a-floating-preview">
          <div className="preview-top"><span>A1 Mobi</span><b>{ar?"مثال توضيحي لمتجر":"Sample store preview"}</b></div>
          <div className="preview-metrics">
            <div><small>{ar?"المنتجات":"Products"}</small><strong>{counts.total}</strong></div>
            <div><small>{ar?"الصيانة المفتوحة":"Open repairs"}</small><strong>{demoRepairs.length}</strong></div>
            <div><small>{ar?"العملاء":"Customers"}</small><strong>{demoCustomers.length}</strong></div>
            <div><small>{ar?"مبيعات اليوم":"Today's sales"}</small><strong>{"$"+demoReports.salesUsd.toLocaleString()}</strong></div>
          </div>
          <div className="preview-products">{demoProducts.slice(0,4).map(product=><article key={product.id}><span className="mobi-a-preview-product"><DemoProductPhoto product={product} locale={locale} compact /></span><div><b>{ar?product.nameAr:product.nameEn}</b><small>{product.stock} {ar?"في المخزون":"in stock"} · {"$"+product.price}</small></div></article>)}</div>
        </aside>
        </div>
      </div>
    </section>

    <section className="product-shell product-proof">
      <div><span className="product-eyebrow">{t.proof}</span><h2>{t.proofText}</h2></div>
      <div className="proof-stats">
        <article><strong>{counts.total}</strong><span>{ar?"منتجًا نموذجيًا":"sample products"}</span></article>
        <article><strong>{demoRepairs.length}</strong><span>{ar?"أوامر صيانة":"repair orders"}</span></article>
        <article><strong>{demoCustomers.length}</strong><span>{ar?"عملاء تجريبيون":"sample customers"}</span></article>
        <article><strong>13</strong><span>{ar?"مساحة تشغيل":"operational workspaces"}</span></article>
      </div>
    </section>

    <section id="features" className="product-shell product-section">
      <div className="product-section-head"><div><span className="product-eyebrow">OPERATIONS</span><h2>{t.section}</h2></div><p>{t.sectionSub}</p></div>
      <div className="feature-grid">{features[locale].map(([title,copy,target],index)=><article className="feature-card" key={title}><span>{String(index+1).padStart(2,"0")}</span><h3>{title}</h3><p>{copy}</p><Link href={"/product/"+locale+"/"+target} aria-label={(ar?"استكشف ":"Explore ")+title}>{ar?"استكشف":"Explore"} →</Link></article>)}</div>
    </section>

    <section className="mobi-a-repair-story product-shell"><div className="mobi-a-repair-image"><DemoScenePhoto src="https://images.unsplash.com/photo-1699550403361-27dee0f2a415?auto=format&fit=crop&w=1100&q=80" alt={ar?"فني يصلح هاتفًا مفتوحًا باستخدام مفك — صورة توضيحية":"Illustrative technician repairing an open smartphone with a screwdriver"}/></div><div><span className="product-eyebrow">{ar?"صيانة وتنظيم ومتابعة":"REPAIR WORKFLOW"}</span><h2>{ar?"من استلام الجهاز إلى التسليم بثقة":"From intake to delivery with confidence"}</h2><p>{ar?"وثّق العطل، تابع الحالة وقطع الغيار، واحتفظ بسجل واضح لكل عملية صيانة داخل المتجر.":"Track diagnosis, parts, progress and delivery with a complete repair record."}</p><Link className="product-cta" href={"/product/"+locale+"/demo#repairs"}>{ar?"شاهد رحلة الصيانة":"Explore the repair journey"} →</Link></div></section>

    <section className="product-flow">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">ONBOARDING</span><h2>{t.how}</h2></div><p>{t.howSub}</p></div>
        <div className="flow-grid">
          {[
            ar?["1","أنشئ الجهة","اسم المتجر، المالك، اللغة."]:["1","Create organization","Store name, owner and language."],
            ar?["2","أضف الفرع","اسم الفرع وكود التشغيل."]:["2","Add first branch","Branch name and operating code."],
            ar?["3","ابدأ التجربة","اختر خطة مناسبة وفعّل تجربة حسابك."]:["3","Start your trial","Choose a suitable plan and activate your trial account."],
            ar?["4","ادخل النظام","POS، مخزون، صيانة، فريق وتقارير."]:["4","Enter workspace","POS, inventory, repairs, team and reports."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section className="product-shell commercial-band">
      <div><span className="product-eyebrow">{ar?"لمتجر واحد أو عدة فروع":"ONE STORE · MULTIPLE BRANCHES"}</span><h2>{t.plans}</h2><p>{t.plansSub}</p></div>
      <Link className="product-secondary" href={"/product/"+locale+"/pricing"}>{ar?"عرض الخطط":"View plans"}</Link>
    </section>

    <section className="product-shell final-cta">
      <span className="product-eyebrow">{ar?"ابدأ بثقة":"GET STARTED"}</span><h2>{t.cta}</h2><p>{t.ctaSub}</p>
      <div className="product-actions"><Link className="product-cta" href={"/product/"+locale+"/signup"}>{t.primary}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{t.secondary}</Link></div>
    </section>
  </main>;
}
