import Link from "next/link";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports } from "@/demo/operations";

const content={
  ar:{
    eyebrow:"A1 MOBI · RETAIL & REPAIR OS",
    title:"أدر متجر الموبايل والصيانة من مكان واحد.",
    sub:"نقطة بيع، أجهزة وIMEI، مخزون، صيانة، عملاء وديون، صندوق، تعبئة، تقارير، فريق وصلاحيات — ضمن نظام واحد متعدد الفروع.",
    primary:"ابدأ تجربة 7 أيام",secondary:"شاهد المتجر التجريبي",
    proof:"تجربة جاهزة وليست شاشة فارغة",proofText:"ادخل إلى مساحة تجريبية تحتوي منتجات ومخزون وصيانة وعملاء وحركات فعلية للاختبار.",
    section:"ما الذي يديره A1 Mobi؟",sectionSub:"من لحظة دخول الجهاز إلى المتجر حتى البيع أو الصيانة والتسليم والمحاسبة.",
    how:"كيف تبدأ؟",howSub:"رحلة قصيرة من إنشاء الجهة إلى أول عملية تشغيل.",
    plans:"مبني للمتجر اليوم، وللفروع غدًا",plansSub:"الحساب التجاري يفصل الجهة عن الفروع والمستخدمين، والاشتراك يأتي من A1 Billing Core.",
    cta:"جرّب النظام ببيانات واقعية",ctaSub:"لا تحتاج لإدخال منتجات أو عملاء من الصفر حتى تفهم التجربة.",
  },
  en:{
    eyebrow:"A1 MOBI · RETAIL & REPAIR OS",
    title:"Run mobile retail and repair from one operating system.",
    sub:"POS, devices and IMEI, inventory, repairs, customers and debt, cash, top-up, reports, team and permissions — in one multi-branch platform.",
    primary:"Start 7-day trial",secondary:"Open live demo",
    proof:"A ready experience, not an empty dashboard",proofText:"Enter a populated workspace with products, stock, repairs, customers and operational activity.",
    section:"What does A1 Mobi run?",sectionSub:"From device intake through sale or repair, delivery and accounting.",
    how:"How do you start?",howSub:"A short path from organization setup to the first operation.",
    plans:"Built for one store today and multiple branches tomorrow",plansSub:"Commercial accounts separate organization, branches and members; subscription state comes from A1 Billing Core.",
    cta:"Try the system with realistic data",ctaSub:"You do not need to enter products or customers from scratch to understand the workflow.",
  }
} as const;

const features={
  ar:[
    ["نقطة بيع","بيع الأجهزة والإكسسوارات مع حماية السعر والمخزون."],
    ["IMEI وثقة الجهاز","أجهزة تسلسلية، فحص IMEI وسجل حوادث قابل للتوسع."],
    ["المخزون","مشتريات، استلام، حركات، جرد وتنبيهات نقص."],
    ["الصيانة","استلام، تشخيص، موافقة، قطع، دفعات، حالة وتسليم."],
    ["العملاء والديون","ملف العميل، أجهزته، الرصيد والحركات."],
    ["الصندوق والعملات","جلسات صندوق، USD/LBP، مصاريف وفروقات."],
    ["التعبئة","مزودون وخدمات وتكلفة وهامش وتسوية."],
    ["التقارير","مبيعات، ربح، صيانة، مخزون، ديون وتنبيهات."],
    ["الفريق والصلاحيات","Owner / Manager / Sales / Technician / Accounting بصلاحيات محددة."],
  ],
  en:[
    ["Point of sale","Sell devices and accessories with price and stock protection."],
    ["IMEI & device trust","Serialized devices, IMEI checks and an extensible incident network."],
    ["Inventory","Purchases, receipts, movement, counts and low-stock alerts."],
    ["Repairs","Intake, diagnosis, approval, parts, payments, status and delivery."],
    ["Customers & debt","Customer record, devices, balance and ledger activity."],
    ["Cash & currency","Cash sessions, USD/LBP, expenses and variance control."],
    ["Top-up","Providers, services, cost, margin and settlement."],
    ["Reports","Sales, profit, repairs, stock, debt and operational alerts."],
    ["Team & permissions","Owner / Manager / Sales / Technician / Accounting with explicit permissions."],
  ]
} as const;

export default async function ProductLanding({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  const ar=locale==="ar";
  const t=content[locale];
  const counts=demoCatalogCounts();
  return <main>
    <section className="product-hero">
      <div className="product-shell hero-layout">
        <div>
          <span className="product-eyebrow">{t.eyebrow}</span>
          <h1>{t.title}</h1>
          <p>{t.sub}</p>
          <div className="product-actions">
            <Link className="product-cta" href={"/product/"+locale+"/signup"}>{t.primary}</Link>
            <Link className="product-secondary" href={"/product/"+locale+"/demo"}>{t.secondary}</Link>
          </div>
          <div className="hero-trust">
            <span>✓ {ar?"عربي / English":"Arabic / English"}</span>
            <span>✓ {ar?"متعدد الجهات والفروع":"Multi-tenant & branch-ready"}</span>
            <span>✓ {ar?"تجربة 7 أيام":"7-day trial"}</span>
          </div>
        </div>
        <aside className="product-preview-card">
          <div className="preview-top"><span>A1 Mobi</span><b>{ar?"فرع طرابلس التجريبي":"Tripoli Pilot Store"}</b></div>
          <div className="preview-metrics">
            <div><small>{ar?"المنتجات":"Products"}</small><strong>{counts.total}</strong></div>
            <div><small>{ar?"الصيانة المفتوحة":"Open repairs"}</small><strong>{demoRepairs.length}</strong></div>
            <div><small>{ar?"العملاء":"Customers"}</small><strong>{demoCustomers.length}</strong></div>
            <div><small>{ar?"مبيعات اليوم":"Today's sales"}</small><strong>{"$"+demoReports.salesUsd.toLocaleString()}</strong></div>
          </div>
          <div className="preview-products">{demoProducts.slice(0,4).map(product=><article key={product.id}><span>{product.type==="DEVICE"?"▯":"□"}</span><div><b>{ar?product.nameAr:product.nameEn}</b><small>{product.stock} {ar?"في المخزون":"in stock"} · {"$"+product.price}</small></div></article>)}</div>
        </aside>
      </div>
    </section>

    <section className="product-shell product-proof">
      <div><span className="product-eyebrow">{t.proof}</span><h2>{t.proofText}</h2></div>
      <div className="proof-stats">
        <article><strong>{counts.total}</strong><span>{ar?"منتجًا حقيقي الاسم":"real-world products"}</span></article>
        <article><strong>{demoRepairs.length}</strong><span>{ar?"أوامر صيانة":"repair orders"}</span></article>
        <article><strong>{demoCustomers.length}</strong><span>{ar?"عملاء تجريبيون":"sample customers"}</span></article>
        <article><strong>13</strong><span>{ar?"مساحة تشغيل":"operational workspaces"}</span></article>
      </div>
    </section>

    <section id="features" className="product-shell product-section">
      <div className="product-section-head"><div><span className="product-eyebrow">OPERATIONS</span><h2>{t.section}</h2></div><p>{t.sectionSub}</p></div>
      <div className="feature-grid">{features[locale].map(([title,copy],index)=><article className="feature-card" key={title}><span>{String(index+1).padStart(2,"0")}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>

    <section className="product-flow">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">ONBOARDING</span><h2>{t.how}</h2></div><p>{t.howSub}</p></div>
        <div className="flow-grid">
          {[
            ar?["1","أنشئ الجهة","اسم المتجر، المالك، اللغة."]:["1","Create organization","Store name, owner and language."],
            ar?["2","أضف الفرع","اسم الفرع وكود التشغيل."]:["2","Add first branch","Branch name and operating code."],
            ar?["3","ابدأ Trial","A1 Billing Core يمنح الصلاحيات لمدة 7 أيام."]:["3","Start trial","A1 Billing Core grants seven-day entitlements."],
            ar?["4","ادخل النظام","POS، مخزون، صيانة، فريق وتقارير."]:["4","Enter workspace","POS, inventory, repairs, team and reports."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section className="product-shell commercial-band">
      <div><span className="product-eyebrow">ACCOUNT → ORGANIZATION → TENANT → BRANCH</span><h2>{t.plans}</h2><p>{t.plansSub}</p></div>
      <Link className="product-secondary" href={"/product/"+locale+"/pricing"}>{ar?"عرض الخطط":"View plans"}</Link>
    </section>

    <section className="product-shell final-cta">
      <span className="product-eyebrow">A1 MOBI PILOT</span><h2>{t.cta}</h2><p>{t.ctaSub}</p>
      <div className="product-actions"><Link className="product-cta" href={"/product/"+locale+"/signup"}>{t.primary}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{t.secondary}</Link></div>
    </section>
  </main>;
}
