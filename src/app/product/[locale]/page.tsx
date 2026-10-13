import Link from "next/link";
import { DemoScenePhoto } from "@/components/demo-product-photo";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoProducts } from "@/demo/data";
import { demoRepairs, demoCustomers, demoReports, demoTopups } from "@/demo/operations";

const features={
  ar:[
    {icon:"â–£",tone:"blue",title:"Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨ÙŠØ¹",en:"Point of Sale",copy:"Ø¨ÙŠØ¹ Ø§Ù„Ø£Ø¬Ù‡Ø²Ø© ÙˆØ§Ù„Ø¥ÙƒØ³Ø³ÙˆØ§Ø±Ø§Øª Ù…Ø¹ Ø­Ù…Ø§ÙŠØ© Ø§Ù„Ø³Ø¹Ø± ÙˆØ§Ù„Ù…Ø®Ø²ÙˆÙ†.",target:"demo"},
    {icon:"âŒ",tone:"orange",title:"Ø§Ù„ØµÙŠØ§Ù†Ø©",en:"Repairs",copy:"Ø§Ø³ØªÙ„Ø§Ù… ÙˆØªØ´Ø®ÙŠØµ ÙˆÙ…ØªØ§Ø¨Ø¹Ø© Ø§Ù„Ù‚Ø·Ø¹ ÙˆØ§Ù„Ø¯ÙØ¹Ø§Øª ÙˆØ§Ù„ØªØ³Ù„ÙŠÙ….",target:"demo#repairs"},
    {icon:"â–¦",tone:"blue",title:"Ø§Ù„Ù…Ø®Ø²ÙˆÙ†",en:"Inventory",copy:"Ø£Ø¬Ù‡Ø²Ø© ÙˆIMEIØŒ Ø­Ø±ÙƒØ§Øª ÙˆØ¬Ø±Ø¯ ÙˆØªÙ†Ø¨ÙŠÙ‡Ø§Øª Ù†Ù‚Øµ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†.",target:"help#inventory"},
    {icon:"â™™",tone:"orange",title:"Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡",en:"Customers",copy:"Ù…Ù„Ù Ø§Ù„Ø¹Ù…ÙŠÙ„ ÙˆØ£Ø¬Ù‡Ø²ØªÙ‡ ÙˆØ§Ù„Ø¯ÙŠÙˆÙ† ÙˆØ³Ø¬Ù„ Ø§Ù„Ø­Ø±ÙƒØ§Øª.",target:"demo"},
    {icon:"â†“",tone:"blue",title:"Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª",en:"Purchases",copy:"Ø´Ø±Ø§Ø¡ ÙˆØ§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø£Ø¬Ù‡Ø²Ø© ÙˆØ§Ù„Ù‚Ø·Ø¹ Ù…Ø¹ Ø­Ø±ÙƒØ© Ù…Ø®Ø²ÙˆÙ† Ù…ÙˆØ«Ù‚Ø©.",target:"help#inventory"},
    {icon:"â–¥",tone:"orange",title:"Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±",en:"Reports",copy:"Ù…Ù„Ø®ØµØ§Øª Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ÙˆØ§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø¯ÙŠÙˆÙ†.",target:"demo"},
  ],
  en:[
    {icon:"â–£",tone:"blue",title:"Point of Sale",en:"POS",copy:"Sell devices and accessories with price and stock protection.",target:"demo"},
    {icon:"âŒ",tone:"orange",title:"Repairs",en:"Repair workflow",copy:"Track intake, diagnosis, parts, payments and delivery.",target:"demo#repairs"},
    {icon:"â–¦",tone:"blue",title:"Inventory",en:"Devices & stock",copy:"Devices and IMEI, movements, counts and low-stock alerts.",target:"help#inventory"},
    {icon:"â™™",tone:"orange",title:"Customers",en:"CRM & debt",copy:"Customer records, devices, debt and ledger activity.",target:"demo"},
    {icon:"â†“",tone:"blue",title:"Purchases",en:"Receiving",copy:"Purchase and receive devices and parts with auditable stock movements.",target:"help#inventory"},
    {icon:"â–¥",tone:"orange",title:"Reports",en:"Operational truth",copy:"Summaries of sales, repairs, stock and customer debt.",target:"demo"},
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
          <span className="product-eyebrow">{ar?"Ù†Ø¸Ø§Ù… ØªØ´ØºÙŠÙ„ Ù„Ù…ØªØ¬Ø± Ø§Ù„Ù…ÙˆØ¨Ø§ÙŠÙ„ ÙˆØ§Ù„ØµÙŠØ§Ù†Ø©":"MOBILE RETAIL & REPAIR OS"}</span>
          <h1>
            {ar
              ? <>Ø£Ø¯Ø± Ù…Ø¨ÙŠØ¹Ø§ØªÙƒØŒ Ø¥ØµÙ„Ø§Ø­Ø§ØªÙƒ<br/><span className="mobi-headline-blue">ÙˆÙ…Ø®Ø²ÙˆÙ†Ùƒ</span> <span className="mobi-headline-orange">ÙÙŠ Ù…ÙƒØ§Ù† ÙˆØ§Ø­Ø¯.</span></>
              : <>Run sales, repairs and<br/><span className="mobi-headline-blue">inventory</span> <span className="mobi-headline-orange">in one place.</span></>}
          </h1>
          <p>{ar?"Ù†Ù‚Ø·Ø© Ø¨ÙŠØ¹ØŒ Ø£Ø¬Ù‡Ø²Ø© ÙˆIMEIØŒ Ù…Ø®Ø²ÙˆÙ†ØŒ ØµÙŠØ§Ù†Ø©ØŒ Ø¹Ù…Ù„Ø§Ø¡ ÙˆØ¯ÙŠÙˆÙ†ØŒ ØµÙ†Ø¯ÙˆÙ‚ØŒ ØªØ¹Ø¨Ø¦Ø© ÙˆØªÙ‚Ø§Ø±ÙŠØ± â€” ÙÙŠ Ù…Ø³Ø§Ø­Ø© ØªØ´ØºÙŠÙ„ ÙˆØ§Ø­Ø¯Ø© ÙˆØ§Ø¶Ø­Ø©.":"POS, IMEI devices, inventory, repairs, customers and debt, cash, top-up and reports â€” in one clear operating workspace."}</p>
          <p className="mobi-a-english-subline" dir="ltr">{ar?"Mobile retail & repair operating system Â· AR / EN Â· Multi-branch ready":"Arabic / English Â· Multi-branch ready Â· Built for real store workflows"}</p>
          <div className="product-actions mobi-a-cta-row">
            <Link className="product-cta mobi-a-primary" href={"/product/"+locale+"/signup"}>{ar?"Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ù‹Ø§ Ø§Ù„Ø¢Ù†":"Start free now"} <span aria-hidden="true">â†—</span></Link>
            <Link className="product-secondary mobi-a-video" href={"/product/"+locale+"/demo"}><span aria-hidden="true">â–¶</span>{ar?"Ø´Ø§Ù‡Ø¯ Ø§Ù„Ø¬ÙˆÙ„Ø©":"Watch the tour"}</Link>
          </div>
          <div className="hero-trust mobi-a-trust">
            <span><i className="blue">âœ“</i>{ar?"Ø¥Ø¹Ø¯Ø§Ø¯ Ù…ØªØ¬Ø± Ø¨Ø®Ø·ÙˆØ§Øª ÙˆØ§Ø¶Ø­Ø©":"Guided store setup"}</span>
            <span><i className="orange">âœ“</i>{ar?"ØµÙ„Ø§Ø­ÙŠØ§Øª Ø­Ø³Ø¨ Ø§Ù„Ø¯ÙˆØ±":"Role-based access"}</span>
            <span><i className="blue">âœ“</i>{ar?"Ø¹Ø±Ø¨ÙŠ / English":"Arabic / English"}</span>
          </div>
        </div>

        <div className="mobi-a-visual">
          <div className="mobi-a-photo">
            <DemoScenePhoto
              src="/demo/abc/a-retail-hero.webp"
              alt={ar?"Ù…ÙˆØ¸Ù ÙˆØ¹Ù…ÙŠÙ„ ÙÙŠ Ø¨ÙŠØ¦Ø© Ø¨ÙŠØ¹ Ø­Ø¯ÙŠØ«Ø© â€” ØµÙˆØ±Ø© ØªÙˆØ¶ÙŠØ­ÙŠØ©":"Illustrative employee and customer in a modern retail environment"}
              eager
            />
            <span>{ar?"Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…ØªØ¬Ø± Ù…Ù† Ø§Ù„ÙˆØ§Ø¬Ù‡Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø®Ù„ÙÙŠØ©":"From storefront to back office"}</span>
          </div>
          <aside className="mobi-a-device-mockup" aria-label={ar?"Ù…Ø¹Ø§ÙŠÙ†Ø© ØªÙˆØ¶ÙŠØ­ÙŠØ© Ù„Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©":"Illustrative dashboard preview"}>
            <div className="mobi-a-laptop">
              <div className="mobi-a-laptop-top"><span>A1 Mobi</span><small>{ar?"Ù…Ø«Ø§Ù„ ØªÙˆØ¶ÙŠØ­ÙŠ":"Demo preview"}</small></div>
              <div className="mobi-a-laptop-body">
                <div className="mobi-a-mini-sidebar"><b>A1</b><i/><i/><i/><i/><i/></div>
                <div className="mobi-a-mini-main">
                  <div className="mobi-a-mini-actions"><span/><span/><span/><span/></div>
                  <div className="mobi-a-mini-kpis">
                    <article><small>{ar?"Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª":"Sales"}</small><b>{"$"+demoReports.salesUsd.toLocaleString()}</b></article>
                    <article><small>{ar?"Ø§Ù„ØµÙŠØ§Ù†Ø©":"Repairs"}</small><b>{demoRepairs.length}</b></article>
                    <article><small>{ar?"Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª":"Products"}</small><b>{counts.total}</b></article>
                    <article><small>{ar?"Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡":"Customers"}</small><b>{demoCustomers.length}</b></article>
                  </div>
                  <div className="mobi-a-mini-chart">{[42,66,54,82,68,92,74].map((height,index)=><i key={index} style={{height:height+"%"}}/>)}</div>
                </div>
              </div>
            </div>
            <div className="mobi-a-phone">
              <span>A1</span>
              <b>{ar?"Ø¨ÙŠØ¹ Ø¬Ø¯ÙŠØ¯":"New sale"}</b>
              <small>{demoProducts[0]?.brand}</small>
              <strong>{"$"+(demoProducts[0]?.price??0).toLocaleString()}</strong>
              <i/>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="features" className="product-shell product-section mobi-a-features">
      <div className="product-section-head"><div><span className="product-eyebrow">{ar?"ÙƒÙ„ Ù…Ø§ ØªØ­ØªØ§Ø¬Ù‡ Ù„Ù„ØªØ´ØºÙŠÙ„":"OPERATIONS"}</span><h2>{ar?"Ù…Ù† Ø§Ù„Ø¨ÙŠØ¹ Ø¥Ù„Ù‰ Ø§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ§Ù„Ù…Ø­Ø§Ø³Ø¨Ø©.":"From sale to repair and reconciliation."}</h2></div><p>{ar?"Ø³Øª ÙˆØ­Ø¯Ø§Øª Ø£Ø³Ø§Ø³ÙŠØ© Ù…ØªØ±Ø§Ø¨Ø·Ø©ØŒ Ø¨Ù‡ÙˆÙŠØ© ÙˆØ§Ø­Ø¯Ø© ÙˆØ±Ø­Ù„Ø© ØªØ´ØºÙŠÙ„ ÙˆØ§Ø¶Ø­Ø©.":"Six connected core capabilities with one visual system and one operating journey."}</p></div>
      <div className="mobi-a-feature-grid">{features[locale].map((feature,index)=>
        <article className="mobi-a-feature-card" key={feature.title}>
          <div className={"mobi-a-feature-icon "+feature.tone}>{feature.icon}</div>
          <small>{String(index+1).padStart(2,"0")}</small>
          <h3>{feature.title}</h3>
          <b>{feature.en}</b>
          <p>{feature.copy}</p>
          <Link href={"/product/"+locale+"/"+feature.target} aria-label={(ar?"Ø§Ø³ØªÙƒØ´Ù ":"Explore ")+feature.title}>â†—</Link>
        </article>)}
      </div>
    </section>

    <section className="mobi-a-repair-story product-shell">
      <div className="mobi-a-repair-image">
        <DemoScenePhoto src="https://images.unsplash.com/photo-1699550403361-27dee0f2a415?auto=format&fit=crop&w=1200&q=84" alt={ar?"ÙÙ†ÙŠ ÙŠØµÙ„Ø­ Ù‡Ø§ØªÙÙ‹Ø§ â€” ØµÙˆØ±Ø© ØªÙˆØ¶ÙŠØ­ÙŠØ©":"Illustrative phone repair technician"}/>
        <span className="mobi-a-trust-card"><b>{ar?"Ø³Ø¬Ù„ ØµÙŠØ§Ù†Ø© ÙˆØ§Ø¶Ø­":"Clear repair record"}</b><small>{ar?"Ø§Ø³ØªÙ„Ø§Ù… Â· ØªØ´Ø®ÙŠØµ Â· Ù‚Ø·Ø¹ Â· Ø¯ÙØ¹ Â· ØªØ³Ù„ÙŠÙ…":"Intake Â· diagnosis Â· parts Â· payment Â· delivery"}</small></span>
      </div>
      <div><span className="product-eyebrow">{ar?"ØµÙŠØ§Ù†Ø© ÙˆØªÙ†Ø¸ÙŠÙ… ÙˆÙ…ØªØ§Ø¨Ø¹Ø©":"REPAIR WORKFLOW"}</span><h2>{ar?"Ù…Ù† Ø§Ø³ØªÙ„Ø§Ù… Ø§Ù„Ø¬Ù‡Ø§Ø² Ø¥Ù„Ù‰ Ø§Ù„ØªØ³Ù„ÙŠÙ… Ø¨Ø«Ù‚Ø©.":"From intake to delivery with confidence."}</h2><p>{ar?"ÙˆØ«Ù‘Ù‚ Ø§Ù„Ø¹Ø·Ù„ ÙˆØ§Ù„Ø­Ø§Ù„Ø© ÙˆÙ‚Ø·Ø¹ Ø§Ù„ØºÙŠØ§Ø± ÙˆØ§Ù„Ø¯ÙØ¹Ø§ØªØŒ ÙˆØ§Ø­ØªÙØ¸ Ø¨Ø³Ø¬Ù„ ÙˆØ§Ø¶Ø­ Ù„ÙƒÙ„ Ø¹Ù…Ù„ÙŠØ© ØµÙŠØ§Ù†Ø© Ø¯Ø§Ø®Ù„ Ø§Ù„Ù…ØªØ¬Ø±.":"Track diagnosis, parts, progress and payments with a complete repair record."}</p><Link className="product-cta" href={"/product/"+locale+"/demo#repairs"}>{ar?"Ø´Ø§Ù‡Ø¯ Ø±Ø­Ù„Ø© Ø§Ù„ØµÙŠØ§Ù†Ø©":"Explore repair journey"} â†’</Link></div>
    </section>

    <section className="mobi-a-why">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">{ar?"Ù„Ù…Ø§Ø°Ø§ A1 MobiØŸ":"WHY A1 MOBI"}</span><h2>{ar?"Ù…ØµÙ…Ù… Ù„Ø¹Ù…Ù„ Ø§Ù„Ù…ØªØ¬Ø± Ø§Ù„Ø­Ù‚ÙŠÙ‚ÙŠ.":"Built around real store work."}</h2></div><p>{ar?"Ù„ÙŠØ³ Ù…Ø¬Ø±Ø¯ Ø´Ø§Ø´Ø© Ù…Ø¨ÙŠØ¹Ø§ØªØ› Ø¨Ù„ Ù…Ø³Ø§Ø± ÙŠØ±Ø¨Ø· Ø§Ù„Ø¬Ù‡Ø§Ø² ÙˆØ§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø¹Ù…ÙŠÙ„ ÙˆØ§Ù„ØµÙŠØ§Ù†Ø© ÙˆØ§Ù„ØµÙ†Ø¯ÙˆÙ‚ ÙˆØ§Ù„ØªÙ‚Ø±ÙŠØ±.":"Not just a sales screen: it connects device, stock, customer, repair, cash and reporting truth."}</p></div>
        <div className="mobi-a-why-grid">
          {[
            ar?["01","ØªØªØ¨Ù‘Ø¹ ÙˆØ§Ø¶Ø­","ÙƒÙ„ Ø­Ø±ÙƒØ© Ù…Ø±ØªØ¨Ø·Ø© Ø¨Ø³Ø¬Ù„ ÙŠÙ…ÙƒÙ† Ù…Ø±Ø§Ø¬Ø¹ØªÙ‡."]:["01","Traceable operations","Every movement is tied to reviewable evidence."],
            ar?["02","ØµÙ„Ø§Ø­ÙŠØ§Øª Ø¯Ù‚ÙŠÙ‚Ø©","Ù…Ø§ ÙŠØ±Ø§Ù‡ Ø§Ù„Ø¨Ø§Ø¦Ø¹ Ù„ÙŠØ³ Ù…Ø§ ÙŠØ±Ø§Ù‡ Ø§Ù„Ù…Ø¯ÙŠØ±."]:["02","Role boundaries","Seller and owner views respect different permissions."],
            ar?["03","IMEI Ù…Ù† Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©","Ø§Ù„Ø¬Ù‡Ø§Ø² Ø§Ù„Ù…ØªØ³Ù„Ø³Ù„ ÙŠØ¨Ù‚Ù‰ Ù…Ø¹Ø±ÙˆÙÙ‹Ø§ Ø·ÙˆØ§Ù„ Ø±Ø­Ù„ØªÙ‡."]:["03","IMEI-aware","Serialized devices stay traceable end-to-end."],
            ar?["04","ØªÙ‚Ø§Ø±ÙŠØ± Ù…Ù† Ø§Ù„Ø­Ù‚ÙŠÙ‚Ø©","Ø§Ù„Ù…Ø¤Ø´Ø±Ø§Øª Ù…Ø´ØªÙ‚Ø© Ù…Ù† Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª Ù„Ø§ Ù…Ù† Ø£Ø±Ù‚Ø§Ù… Ù…Ù†ÙØµÙ„Ø©."]:["04","Truth-based reports","Metrics derive from operations, not separate UI numbers."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section id="customers" className="product-shell mobi-a-testimonial">
      <div><span className="product-eyebrow">{ar?"Ù…Ø«Ø§Ù„ ØªÙˆØ¶ÙŠØ­ÙŠ Â· Demo":"ILLUSTRATIVE DEMO"}</span><blockquote>{ar?"Â«Ø£Ø±ÙŠØ¯ Ø£Ù† Ø£Ø¹Ø±Ù Ù…Ø§Ø°Ø§ Ø¨ÙŠØ¹ØŒ Ù…Ø§Ø°Ø§ Ø¯Ø®Ù„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†ØŒ Ø£ÙŠÙ† ÙˆØµÙ„ Ø¬Ù‡Ø§Ø² Ø§Ù„ØµÙŠØ§Ù†Ø©ØŒ ÙˆÙ…Ù† ÙŠÙ…Ù„Ùƒ ØµÙ„Ø§Ø­ÙŠØ© Ø±Ø¤ÙŠØ© Ø§Ù„Ø±Ø¨Ø­ â€” Ù…Ù† Ø´Ø§Ø´Ø© ÙˆØ§Ø­Ø¯Ø©.Â»":"â€œI want one place to know what sold, what entered stock, where a repair stands, and who can see profit.â€"}</blockquote><p>{ar?"Ø³ÙŠÙ†Ø§Ø±ÙŠÙˆ Ù…Ø³ØªØ®Ø¯Ù… ØªÙˆØ¶ÙŠØ­ÙŠ Ù…Ø¨Ù†ÙŠ Ø¹Ù„Ù‰ Ø§Ø­ØªÙŠØ§Ø¬Ø§Øª Ù…ØªØ¬Ø± Ù‡ÙˆØ§ØªÙ ÙˆØµÙŠØ§Ù†Ø©ØŒ ÙˆÙ„ÙŠØ³ Ø´Ù‡Ø§Ø¯Ø© Ø¹Ù…ÙŠÙ„ Ø­Ù‚ÙŠÙ‚ÙŠ.":"Illustrative user scenario based on mobile retail and repair needs; not a real customer testimonial."}</p></div>
      <aside><strong>{counts.total}</strong><span>{ar?"Ù…Ù†ØªØ¬Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ©":"demo products"}</span><strong>{demoRepairs.length}</strong><span>{ar?"Ø£ÙˆØ§Ù…Ø± ØµÙŠØ§Ù†Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©":"demo repair orders"}</span><strong>{demoTopups.length}</strong><span>{ar?"Ø¹Ù…Ù„ÙŠØ§Øª ØªØ¹Ø¨Ø¦Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©":"demo top-ups"}</span></aside>
    </section>

    <section className="product-flow">
      <div className="product-shell">
        <div className="product-section-head"><div><span className="product-eyebrow">ONBOARDING</span><h2>{ar?"ÙƒÙŠÙ ØªØ¨Ø¯Ø£ØŸ":"How do you start?"}</h2></div><p>{ar?"Ø±Ø­Ù„Ø© Ù‚ØµÙŠØ±Ø© Ù…Ù† Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ù…ØªØ¬Ø± Ø¥Ù„Ù‰ Ø£ÙˆÙ„ Ø¹Ù…Ù„ÙŠØ© ØªØ´ØºÙŠÙ„.":"A short path from store setup to the first operation."}</p></div>
        <div className="flow-grid">
          {[
            ar?["1","Ø£Ù†Ø´Ø¦ Ø§Ù„Ø¬Ù‡Ø©","Ø§Ø³Ù… Ø§Ù„Ù…ØªØ¬Ø±ØŒ Ø§Ù„Ù…Ø§Ù„ÙƒØŒ Ø§Ù„Ù„ØºØ©."]:["1","Create organization","Store name, owner and language."],
            ar?["2","Ø£Ø¶Ù Ø§Ù„ÙØ±Ø¹","Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹ ÙˆÙƒÙˆØ¯ Ø§Ù„ØªØ´ØºÙŠÙ„."]:["2","Add first branch","Branch name and operating code."],
            ar?["3","ÙØ¹Ù‘Ù„ Ø§Ù„Ø­Ø³Ø§Ø¨","Ø§Ø¨Ø¯Ø£ Ø§Ù„ØªØ¬Ø±Ø¨Ø© ÙˆØ§Ø¶Ø¨Ø· Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª."]:["3","Activate account","Start the trial and configure access."],
            ar?["4","Ø§Ø¨Ø¯Ø£ Ø§Ù„ØªØ´ØºÙŠÙ„","POSØŒ Ù…Ø®Ø²ÙˆÙ†ØŒ ØµÙŠØ§Ù†Ø©ØŒ ÙØ±ÙŠÙ‚ ÙˆØªÙ‚Ø§Ø±ÙŠØ±."]:["4","Start operations","POS, inventory, repairs, team and reports."],
          ].map(([n,title,copy])=><article key={n}><span>{n}</span><h3>{title}</h3><p>{copy}</p></article>)}
        </div>
      </div>
    </section>

    <section className="product-shell commercial-band"><div><span className="product-eyebrow">{ar?"Ù„Ù…ØªØ¬Ø± ÙˆØ§Ø­Ø¯ Ø£Ùˆ Ø¹Ø¯Ø© ÙØ±ÙˆØ¹":"ONE STORE Â· MULTIPLE BRANCHES"}</span><h2>{ar?"Ø§Ø¨Ø¯Ø£ Ø¨Ù…ØªØ¬Ø± ÙˆØ§Ø­Ø¯ØŒ ÙˆØªÙˆØ³Ù‘Ø¹ Ø¹Ù†Ø¯Ù…Ø§ ØªØ­ØªØ§Ø¬.":"Start with one store and grow when needed."}</h2><p>{ar?"Ø§Ù„ÙØ±ÙˆØ¹ ÙˆØ§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† ÙˆØ§Ù„ØµÙ„Ø§Ø­ÙŠØ§Øª Ø¬Ø²Ø¡ Ù…Ù† Ù†ÙØ³ Ø¨Ù†ÙŠØ© Ø§Ù„ØªØ´ØºÙŠÙ„ØŒ Ù…Ø¹ ÙØµÙ„ ÙˆØ§Ø¶Ø­ Ø¨ÙŠÙ† Ø¨ÙŠØ§Ù†Ø§Øª ÙƒÙ„ Ø¬Ù‡Ø© ÙˆÙØ±Ø¹.":"Branches, users and permissions share one operating model with tenant and branch isolation."}</p></div><Link className="product-secondary" href={"/product/"+locale+"/pricing"}>{ar?"Ø¹Ø±Ø¶ Ø§Ù„Ø®Ø·Ø·":"View plans"}</Link></section>

    <section className="product-shell final-cta"><span className="product-eyebrow">{ar?"Ø§Ø¨Ø¯Ø£ Ø¨Ø«Ù‚Ø©":"GET STARTED"}</span><h2>{ar?"ØªØ¹Ø±Ù‘Ù Ø¹Ù„Ù‰ Ø§Ù„Ù†Ø¸Ø§Ù…ØŒ Ø«Ù… Ø§ÙØªØ­ Ù…ØªØ¬Ø±ÙŽÙƒ.":"Know the system, then open your store."}</h2><p>{ar?"Ø§Ø³ØªØ¹Ø±Ø¶ Ø§Ù„Ø¬ÙˆÙ„Ø© Ø£ÙˆÙ„Ù‹Ø§ØŒ Ø«Ù… Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨ Ø§Ù„ØªØ¬Ø±Ø¨Ø© Ø¹Ù†Ø¯Ù…Ø§ ØªÙƒÙˆÙ† Ø¬Ø§Ù‡Ø²Ù‹Ø§.":"Explore the guided tour first, then create your trial account when ready."}</p><div className="product-actions"><Link className="product-cta" href={"/product/"+locale+"/signup"}>{ar?"Ø§Ø¨Ø¯Ø£ Ù…Ø¬Ø§Ù†Ù‹Ø§ Ø§Ù„Ø¢Ù†":"Start free now"}</Link><Link className="product-secondary" href={"/product/"+locale+"/demo"}>{ar?"Ø´Ø§Ù‡Ø¯ Ø§Ù„Ø¬ÙˆÙ„Ø©":"Explore demo"}</Link></div></section>
  </main>;
}

