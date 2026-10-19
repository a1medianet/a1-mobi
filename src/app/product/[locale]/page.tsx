import Link from "next/link";
import { DemoScenePhoto } from "@/components/demo-product-photo";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports, demoTopups } from "@/demo/operations";

const features={
  ar:[
    {icon:"▣",tone:"blue",title:"نقطة البيع",en:"Point of Sale",copy:"بيع الأجهزة والإكسسوارات مع حماية السعر والمخزون.",target:"demo"},
    {icon:"⌁",tone:"orange",title:"الصيانة",en:"Repairs",copy:"استلام وتشخيص ومتابعة القطع والدفعات والتسليم.",target:"demo#repairs"},
    {icon:"▦",tone:"blue",title:"المخزون",en:"Inventory",copy:"أجهزة وIMEI، حركات وجرد وتنبيهات نقص المخزون.",target:"help#inventory"},
    {icon:"♙",tone:"orange",title:"العملاء",en:"Customers",copy:"ملف العميل وأجهزته والديون وسجل الحركات.",target:"demo"},
    {icon:"↓",tone:"blue",title:"المشتريات",en:"Purchases",copy:"شراء واستلام الأجهزة والقطع مع حركة مخزون موثقة.",target:"help#inventory"},
    {icon:"▥",tone:"orange",title:"التقارير",en:"Reports",copy:"ملخصات المبيعات والصيانة والمخزون والديون.",target:"demo"},
  ],
  en:[
    {icon:"▣",tone:"blue",title:"Point of Sale",en:"POS",copy:"Sell devices and accessories with price and stock protection.",target:"demo"},
    {icon:"⌁",tone:"orange",title:"Repairs",en:"Repair workflow",copy:"Track intake, diagnosis, parts, payments and delivery.",target:"demo#repairs"},
    {icon:"▦",tone:"blue",title:"Inventory",en:"Devices & stock",copy:"Devices and IMEI, movements, counts and low-stock alerts.",target:"help#inventory"},
    {icon:"♙",tone:"orange",title:"Customers",en:"CRM & debt",copy:"Customer records, devices, debt and ledger activity.",target:"demo"},
    {icon:"↓",tone:"blue",title:"Purchases",en:"Receiving",copy:"Purchase and receive devices and parts with auditable stock movements.",target:"help#inventory"},
    {icon:"▥",tone:"orange",title:"Reports",en:"Operational truth",copy:"Summaries of sales, repairs, stock and customer debt.",target:"demo"},
  ],
} as const;

export default async function ProductLanding({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  const ar=locale==="ar";
  const counts=demoCatalogCounts();

  return <main>
    <section className="product-hero mobi-marketing-a">
      <div className="product-shell hero-layout">
        <div className="mobi-a-copy">
          <span className="product-eyebrow">{ar?"نظام تشغيل لمتجر الموبايل والصيانة":"MOBILE RETAIL & REPAIR OS"}</span>
          <h1>
            {ar
              ? <>أدر مبيعاتك، إصلاحاتك<br/><span className="mobi-headline-blue">ومخزونك</span> <span className="mobi-headline-orange">في مكان واحد.</span></>
              : <>Run sales, repairs and<br/><span className="mobi-headline-blue">inventory</span> <span className="mobi-headline-orange">in one place.</span></>}
          </h1>
          <p>{ar?"نقطة بيع، أجهزة وIMEI، مخزون، صيانة، عملاء وديون، صندوق، تعبئة وتقارير — في مساحة تشغيل واحدة واضحة.":"POS, IMEI devices, inventory, repairs, customers and debt, cash, top-up and reports — in one clear operating workspace."}</p>
          <p className="mobi-a-english-subline" dir="ltr">{ar?"Mobile retail & repair operating system · AR / EN · Multi-branch ready":"Arabic / English · Multi-branch ready · Built for real store workflows"}</p>
          <div className="product-actions mobi-a-cta-row">
            <Link className="product-cta mobi-a-primary" href={"/product/"+locale+"/signup"}>{ar?"ابدأ مجانًا الآن":"Start free now"} <span aria-hidden="true">↗</span></Link>
            <Link className="product-secondary mobi-a-video" href={"/product/"+locale+"/demo"}><span aria-hidden="true">▶</span>{ar?"شاهد الجولة":"Watch the tour"}</Link>
          </div>
          <Link className="mobi-a-store-bridge" href="/store-preview">
            <span aria-hidden="true">↗</span>
            {ar?"استعرض واجهة متجر العميل (B)":"Explore the customer storefront (B)"}
          </Link>
          <div className="hero-trust mobi-a-trust">
            <span><i className="blue">✓</i>{ar?"إعداد متجر بخطوات واضحة":"Guided store setup"}</span>
            <span><i className="orange">✓</i>{ar?"صلاحيات حسب الدور":"Role-based access"}</span>
            <span><i className="blue">✓</i>{ar?"عربي / English":"Arabic / English"}</span>
          </div>
        </div>

        <div className="mobi-a-visual">
          <div className="mobi-a-photo">
            <DemoScenePhoto
              src="/demo/abc/a-retail-hero.webp"
              alt={ar?"موظف وعميل في بيئة بيع حديثة — صورة توضيحية":"Illustrative employee and customer in a modern retail environment"}
              eager
            />
            <span>{ar?"إدارة المتجر من الواجهة إلى الخلفية":"From storefront to back office"}</span>
          </div>
          <aside className="mobi-a-device-mockup" aria-label={ar?"معاينة توضيحية للوحة الإدارة":"Illustrative dashboard preview"}>
            <div className="mobi-a-laptop">
              <div className="mobi-a-laptop-top"><span>A1 Mobi</span><small>{ar?"مثال توضيحي":"Demo preview"}</small></div>
              <div className="mobi-a-laptop-body">
                <div className="mobi-a-mini-sidebar"><b>A1</b><i/><i/><i/><i/><i/></div>
                <div className="mobi-a-mini-main">
                  <div className="mobi-a-mini-actions"><span/><span/><span/><span/></div>
                  <div className="mobi-a-mini-kpis">
                    <article><small>{ar?"المبيعات":"Sales"}</small><b>{"$"+demoReports.salesUsd.toLocaleString()}</b></article>
                    <article><small>{ar?"الصيانة":"Repairs"}</small><b>{demoRepairs.length}</b></article>
                    <article><small>{ar?"المنتجات":"Products"}</small><b>{counts.total}</b></article>
                    <article><small>{ar?"العملاء":"Customers"}</small><b>{demoCustomers.length}</b></article>
                  </div>
                  <div className="mobi-a-mini-chart">{[42,66,54,82,68,92,74].map((height,index)=><i key={index} style={{height:height+"%"}}/>)}</div>
                </div>
              </div>
            </div>
            <div className="mobi-a-phone">
              <span>A1</span>
              <b>{ar?"بيع جديد":"New sale"}</b>
              <small>{demoProducts[0]?.brand}</small>
              <strong>{"$"+(demoProducts[0]?.price??0).toLocaleString()}</strong>
              <i/>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="features" className="product-shell product-section mobi-a-features">
      <div className="product-section-head"><div><span className="product-eyebrow">{ar?"كل ما تحتاجه للتشغيل":"OPERATIONS"}</span><h2>{ar?"من البيع إلى الصيانة والمحاسبة.":"From sale to repair and reconciliation."}</h2></div><p>{ar?"ست وحدات أساسية مترابطة، بهوية واحدة ورحلة تشغيل واضحة.":"Six connected core capabilities with one visual system and one operating journey."}</p></div>
      <div className="mobi-a-feature-grid">{features[locale].map((feature,index)=>
        <article className="mobi-a-feature-card" key={feature.title}>
          <div className={"mobi-a-feature-icon "+feature.tone}>{feature.icon}</div>
          <small>{String(index+1).padStart(2,"0")}</small>
          <h3>{feature.title}</h3>
          <b>{feature.en}</b>
          <p>{feature.copy}</p>
          <Link href={"/product/"+locale+"/"+feature.target} aria-label={(ar?"استكشف ":"Explore ")+feature.title}>↗</Link>
        </article>)}
      </div>
    </section>

    <section className="mobi-a-repair-story product-shell">
      <div className="mobi-a-repair-image">
        <DemoScenePhoto src="https://images.unsplash.com/photo-1699550403361-27dee0f2a415?auto=format&fit=crop&w=1200&q=84" alt={ar?"فني يصلح هاتفًا — صورة توضيحية":"Illustrative phone repair technician"}/>
        <span className="mobi-a-trust-card"><b>{ar?"سجل صيانة واضح":"Clear repair record"}</b><small>{ar?"استلام · تشخيص · قطع · دفع · تسليم":"Intake · diagnosis · parts · payment · delivery"}</small></span>
      </div>
      <div><span className="product-eyebrow">{ar?"صيانة وتنظيم ومتابعة":"REPAIR WORKFLOW"}</span><h2>{ar?"من استلام الجهاز إلى التسليم بثقة.":"From intake to delivery with confidence."}</h2><p>{ar?"وثّق العطل والحالة وقطع الغيار والدفعات، واحتفظ بسجل واضح لكل عملية صيانة داخل المتجر.":"Track diagnosis, parts, progress and payments with a complete repair record."}</p><Link className="product-cta" href={"/product/"+locale+"/demo#repairs"}>{ar?"شاهد رحلة الصيانة":"Explore repair journey"} →</Link></div>
    </section>

    <section className="mobi-a-why">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">{ar?"لماذا A1 Mobi؟":"WHY A1 MOBI"}</span><h2>{ar?"مصمم لعمل المتجر الحقيقي.":"Built around real store work."}</h2></div><p>{ar?"ليس مجرد شاشة مبيعات؛ بل مسار يربط الجهاز والمخزون والعميل والصيانة والصندوق والتقرير.":"Not just a sales screen: it connects device, stock, customer, repair, cash and reporting truth."}</p></div>
        <div className="mobi-a-why-grid">
          {[
            ar?["01","تتبّع واضح","كل حركة مرتبطة بسجل يمكن مراجعته."]:["01","Traceable operations","Every movement is tied to reviewable evidence."],
            ar?["02","صلاحيات دقيقة","ما يراه البائع ليس ما يراه المدير."]:["02","Role boundaries","Seller and owner views respect different permissions."],
            ar?["03","IMEI من البداية","الجهاز المتسلسل يبقى معروفًا طوال رحلته."]:["03","IMEI-aware","Serialized devices stay traceable end-to-end."],
            ar?["04","تقارير من الحقيقة","المؤشرات مشتقة من العمليات لا من أرقام منفصلة."]:["04","Truth-based reports","Metrics derive from operations, not separate UI numbers."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section id="customers" className="product-shell mobi-a-testimonial">
      <div><span className="product-eyebrow">{ar?"مثال توضيحي · Demo":"ILLUSTRATIVE DEMO"}</span><blockquote>{ar?"«أريد أن أعرف ماذا بيع، ماذا دخل المخزون، أين وصل جهاز الصيانة، ومن يملك صلاحية رؤية الربح — من شاشة واحدة.»":"“I want one place to know what sold, what entered stock, where a repair stands, and who can see profit.”"}</blockquote><p>{ar?"سيناريو مستخدم توضيحي مبني على احتياجات متجر هواتف وصيانة، وليس شهادة عميل حقيقي.":"Illustrative user scenario based on mobile retail and repair needs; not a real customer testimonial."}</p></div>
      <aside><strong>{counts.total}</strong><span>{ar?"منتجات تجريبية":"demo products"}</span><strong>{demoRepairs.length}</strong><span>{ar?"أوامر صيانة تجريبية":"demo repair orders"}</span><strong>{demoTopups.length}</strong><span>{ar?"عمليات تعبئة تجريبية":"demo top-ups"}</span></aside>
    </section>

    <section className="product-flow">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">ONBOARDING</span><h2>{ar?"كيف تبدأ؟":"How do you start?"}</h2></div><p>{ar?"رحلة قصيرة من إنشاء المتجر إلى أول عملية تشغيل.":"A short path from store setup to the first operation."}</p></div>
        <div className="flow-grid">
          {[
            ar?["1","أنشئ الجهة","اسم المتجر، المالك، اللغة."]:["1","Create organization","Store name, owner and language."],
            ar?["2","أضف الفرع","اسم الفرع وكود التشغيل."]:["2","Add first branch","Branch name and operating code."],
            ar?["3","فعّل الحساب","ابدأ التجربة واضبط الصلاحيات."]:["3","Activate account","Start the trial and configure access."],
            ar?["4","ابدأ التشغيل","POS، مخزون، صيانة، فريق وتقارير."]:["4","Start operations","POS, inventory, repairs, team and reports."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section className="product-shell commercial-band"><div><span className="product-eyebrow">{ar?"لمتجر واحد أو عدة فروع":"ONE STORE · MULTIPLE BRANCHES"}</span><h2>{ar?"ابدأ بمتجر واحد، وتوسّع عندما تحتاج.":"Start with one store and grow when needed."}</h2><p>{ar?"الفروع والمستخدمون والصلاحيات جزء من نفس بنية التشغيل، مع فصل واضح بين بيانات كل جهة وفرع.":"Branches, users and permissions share one operating model with tenant and branch isolation."}</p></div><Link className="product-secondary" href={"/product/"+locale+"/pricing"}>{ar?"عرض الخطط":"View plans"}</Link></section>

    <section className="product-shell final-cta"><span className="product-eyebrow">{ar?"ابدأ بثقة":"GET STARTED"}</span><h2>{ar?"تعرّف على النظام، ثم افتح متجرَك.":"Know the system, then open your store."}</h2><p>{ar?"استعرض الجولة أولًا، ثم أنشئ حساب التجربة عندما تكون جاهزًا.":"Explore the guided tour first, then create your trial account when ready."}</p><div className="product-actions"><Link className="product-cta" href={"/product/"+locale+"/signup"}>{ar?"ابدأ مجانًا الآن":"Start free now"}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{ar?"شاهد الجولة":"Explore demo"}</Link></div></section>
  </main>;
}

