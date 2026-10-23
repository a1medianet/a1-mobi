import Link from "next/link";
import { DemoScenePhoto } from "@/components/demo-product-photo";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports } from "@/demo/operations";

const features={
  ar:[
    {icon:"▣",tone:"blue",title:"نقطة البيع",en:"",copy:"بيع سريع وفاتورة واضحة.",target:"demo"},
    {icon:"⌁",tone:"orange",title:"الصيانة",en:"",copy:"متابعة الإصلاح حتى التسليم.",target:"demo#repairs"},
    {icon:"▦",tone:"blue",title:"المخزون",en:"",copy:"اعرف المتوفر وحركة كل جهاز.",target:"help#inventory"},
    {icon:"♙",tone:"orange",title:"العملاء",en:"",copy:"كل بيانات العميل في سجل واحد.",target:"demo"},
    {icon:"↓",tone:"blue",title:"المشتريات",en:"",copy:"استلام الأجهزة وقطع الغيار.",target:"help#inventory"},
    {icon:"▥",tone:"orange",title:"التقارير",en:"",copy:"نتائج البيع والصيانة في لمحة.",target:"demo"},
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

function FeatureIcon({ index }: { index: number }) {
  const icons = [
    <><circle cx="9" cy="20" r="1"/><circle cx="19" cy="20" r="1"/><path d="M2 3h2l2.8 12h12.7l2-8H5"/></>,
    <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18a2 2 0 0 0 3 3l5.3-5.3a5 5 0 0 0 6.4-6.4l-3.4 3.4-3.6-3.6z"/></>,
    <><path d="M3 8.5 12 4l9 4.5v10L12 23l-9-4.5z"/><path d="M3 8.5 12 13l9-4.5M12 13v10"/></>,
    <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M17 11a3 3 0 1 0-2-5.5M17 15a5 5 0 0 1 4 5v1"/></>,
    <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 17v3h16v-3"/></>,
    <><path d="M4 20V12m5 8V8m5 12V4m5 16v-9M2 21h20"/></>,
  ];
  return <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[index]}</svg>;
}

export default async function ProductLanding({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="ar"&&locale!=="en") notFound();
  const ar=locale==="ar";
  const counts=demoCatalogCounts();

  return <main>
    <section className="product-hero mobi-marketing-a" aria-label={ar?"نظام تشغيل محلات الهواتف":"Mobile retail operating system"}>
      <div className="product-shell hero-layout">
        <div className="mobi-a-copy">
          <span className="product-eyebrow">{ar?"نظام تشغيل لمتجر الموبايل والصيانة":"MOBILE RETAIL & REPAIR OS"}</span>
          <h1>
            {ar
              ? <>البيع والصيانة والمخزون<br/><span className="mobi-headline-blue">في </span><span className="mobi-headline-orange">مكان واحد.</span></>
              : <>Sales, repairs and stock<br/><span className="mobi-headline-blue">in </span><span className="mobi-headline-orange">one place.</span></>}
          </h1>
          <p>{ar?"كل ما تحتاجه لإدارة محل الهواتف وخدمة عملائك، في نظام واحد.":"Everything you need to run your phone shop and serve customers, in one system."}</p>
          <div className="product-actions mobi-a-cta-row">
            <Link className="product-cta mobi-a-primary" href={"/product/"+locale+"/signup"}>{ar?"ابدأ التجربة":"Start trial"} <span aria-hidden="true">{ar?"←":"→"}</span></Link>
            <Link className="product-secondary mobi-a-video" href={"/product/"+locale+"/demo"}><span aria-hidden="true">▶</span>{ar?"شاهد الجولة":"Watch the tour"}</Link>
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
                    <article><small>{ar?"المبيعات":"Sales"}</small><b>{"$"+demoReports.salesUsd.toLocaleString("en-US")}</b></article>
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
              <strong>{"$"+(demoProducts[0]?.price??0).toLocaleString("en-US")}</strong>
              <i/>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="features" className="product-shell product-section mobi-a-features" aria-label={ar?"ست قدرات رئيسية":"Six essential capabilities"}>
      <div className="product-section-head"><div><span className="product-eyebrow">{ar?"كل ما تحتاجه للتشغيل":"OPERATIONS"}</span><h2>{ar?"من البيع إلى الصيانة والمحاسبة.":"From sale to repair and reconciliation."}</h2></div><p>{ar?"أدوات مترابطة لتنظيم العمل اليومي وخدمة عملائك.":"Connected tools to organize daily work and serve your customers."}</p></div>
      <div className="mobi-a-feature-grid">{features[locale].map((feature,index)=>
        <article className="mobi-a-feature-card" key={feature.title}>
          <div className={"mobi-a-feature-icon "+feature.tone}><FeatureIcon index={index}/></div>
          <h3>{feature.title}</h3>
          {feature.en && <b>{feature.en}</b>}
          <p>{feature.copy}</p>
          <Link href={"/product/"+locale+"/"+feature.target} aria-label={(ar?"استكشف ":"Explore ")+feature.title}><span aria-hidden="true">{ar?"←":"→"}</span></Link>
        </article>)}
      </div>
    </section>

    <section className="mobi-a-repair-story product-shell">
      <div className="mobi-a-repair-image">
        <DemoScenePhoto src="/demo/abc/repair-service.webp" alt={ar?"فني يصلح هاتفًا — صورة توضيحية":"Illustrative phone repair technician"}/>
        <span className="mobi-a-trust-card"><b>{ar?"سجل صيانة واضح":"Clear repair record"}</b><small>{ar?"استلام · تشخيص · قطع · دفع · تسليم":"Intake · diagnosis · parts · payment · delivery"}</small></span>
      </div>
      <div><h2>{ar?"تابع الصيانة حتى التسليم.":"Track repairs through delivery."}</h2><p>{ar?"سجل واحد للجهاز والعطل والقطع والدفعات.":"One record for the device, issue, parts and payments."}</p><Link className="product-cta" href={"/product/"+locale+"/demo#repairs"}>{ar?"شاهد رحلة الصيانة":"Explore repair journey"} <span aria-hidden="true">{ar?"←":"→"}</span></Link></div>
    </section>

    <section className="mobi-a-why" id="why">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">{ar?"لماذا تختار موبي؟":"WHY A1 MOBI"}</span><h2>{ar?"مصمم لعمل متجرك.":"Built for your shop."}</h2></div><p>{ar?"تتبّع واضح وصلاحيات تحمي بياناتك.":"Clear tracking and access that protect your data."}</p></div>
        <div className="mobi-a-why-grid">
          {[
            ar?["01","تتبّع واضح","كل عملية محفوظة وقابلة للمراجعة."]:["01","Traceable operations","Every movement is tied to reviewable evidence."],
            ar?["02","صلاحيات دقيقة","لكل موظف ما يحتاجه من صلاحيات."]:["02","Role boundaries","Seller and owner views respect different permissions."],
            ar?["03","تتبّع الأجهزة","تعرف موقع كل جهاز وحالته."]:["03","IMEI-aware","Serialized devices stay traceable end-to-end."],
            ar?["04","تقارير واضحة","نتائج مستمدة من عمل المتجر."]:["04","Truth-based reports","Metrics derive from operations, not separate UI numbers."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section className="product-flow">
      <div className="product-shell">
        <div className="product-section-head"><div><h2>{ar?"ابدأ في أربع خطوات":"Get started in four steps"}</h2></div></div>
        <div className="flow-grid">
          {[
            ar?["1","أنشئ متجرك","اسم المتجر ولغة العمل."]:["1","Create your store","Store name, owner and language."],
            ar?["2","أضف الفرع","حدد اسم فرعك الأول."]:["2","Add first branch","Branch name and operating code."],
            ar?["3","أدخل بيانات المالك","أنشئ حسابك الآمن."]:["3","Add owner details","Secure the owner account."],
            ar?["4","راجع وابدأ","تحقق من البيانات وابدأ التجربة."]:["4","Review and begin","Review details and start the trial."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section className="product-shell final-cta mobi-a-final-cta"><h2>{ar?"جاهز لتجربة موبي؟":"Ready to try A1 Mobi?"}</h2><p>{ar?"أنشئ متجرًا تجريبيًا أو شاهد الجولة.":"Create a trial shop or watch the tour."}</p><div className="product-actions"><Link className="product-cta" href={"/product/"+locale+"/signup"}>{ar?"ابدأ التجربة":"Start trial"}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{ar?"شاهد الجولة":"Explore demo"}</Link></div></section>
  </main>;
}

