import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { currentStoreContext } from "@/server/auth-http";

type Language = "ar" | "en";
type Item = {id:string; label:string; at:Date; amount:number|null; currency:string; path:string; status:string};
type Data = {
  branch:string; products:number; devices:number; sales:number; total:number; repairs:number; ready:number;
  saleCount:number; repairCount:number; topupCount:number;
  recentRepairs:{id:string;number:string;device:string;name:string;status:string}[];
  recentSales:{id:string;number:string;total:number;currency:string;status:string}[];
  recentActivity:Item[];
};
const words = {
  ar:{
    title:"\u0625\u062f\u0627\u0631\u0629 \u0645\u062a\u062c\u0631\u0643 \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f", sub:"\u0628\u064a\u0639\u060c \u0645\u062e\u0632\u0648\u0646\u060c \u0635\u064a\u0627\u0646\u0629\u060c \u0639\u0645\u0644\u0627\u0621 \u0648\u0635\u0646\u062f\u0648\u0642 \u2014 \u0641\u064a \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f.",
    sale:"\u0639\u0645\u0644\u064a\u0629 \u0628\u064a\u0639 \u062c\u062f\u064a\u062f\u0629", repair:"\u062a\u0630\u0643\u0631\u0629 \u0635\u064a\u0627\u0646\u0629 \u062c\u062f\u064a\u062f\u0629", products:"\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a", customers:"\u0627\u0644\u0639\u0645\u0644\u0627\u0621",
    inventory:"\u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0648\u0627\u0644\u0623\u062c\u0647\u0632\u0629", trust:"\u0641\u062d\u0635 IMEI", topup:"\u0627\u0644\u062a\u0639\u0628\u0626\u0629", admin:"\u0627\u0644\u0625\u062f\u0627\u0631\u0629", cash:"\u0627\u0644\u0635\u0646\u062f\u0648\u0642",
    overview:"\u0645\u0644\u062e\u0635 \u0627\u0644\u0645\u062a\u062c\u0631", activeProducts:"\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a \u0627\u0644\u0646\u0634\u0637\u0629", inStock:"\u0623\u062c\u0647\u0632\u0629 \u0628\u0627\u0644\u0645\u062e\u0632\u0648\u0646",
    completedSales:"\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0627\u0644\u0645\u0643\u062a\u0645\u0644\u0629", openRepairs:"\u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0627\u0644\u0645\u0641\u062a\u0648\u062d\u0629", ready:"\u062c\u0627\u0647\u0632\u0629 \u0644\u0644\u062a\u0633\u0644\u064a\u0645",
    tools:"\u0627\u0628\u062f\u0623 \u0645\u0646 \u0647\u0646\u0627", chart:"\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a", chartNote:"\u062a\u0648\u0632\u064a\u0639 \u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0645\u0633\u062c\u0651\u0644\u0629 \u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0641\u0631\u0639 \u0645\u0646\u0630 \u0628\u062f\u0621 \u0627\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645.",
    noOperations:"\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0645\u0644\u064a\u0627\u062a \u0645\u0633\u062c\u0651\u0644\u0629 \u0628\u0639\u062f.", recentRepairs:"\u0622\u062e\u0631 \u062a\u0630\u0627\u0643\u0631 \u0627\u0644\u0635\u064a\u0627\u0646\u0629", recentSales:"\u0622\u062e\u0631 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a",
    recentActivity:"\u062d\u0631\u0643\u0629 \u0627\u0644\u0645\u062a\u062c\u0631", emptyRepairs:"\u0644\u0627 \u062a\u0648\u062c\u062f \u062a\u0630\u0627\u0643\u0631 \u0635\u064a\u0627\u0646\u0629.", emptySales:"\u0644\u0627 \u062a\u0648\u062c\u062f \u0639\u0645\u0644\u064a\u0627\u062a \u0628\u064a\u0639.",
    unavailable:"\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062a\u062c\u0631. \u0644\u0645 \u0646\u0639\u0631\u0636 \u0623\u0631\u0642\u0627\u0645\u064b\u0627 \u063a\u064a\u0631 \u0645\u0624\u0643\u062f\u0629\u061b \u0623\u0639\u062f \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0641\u062d\u0629.",
    reference:"\u0627\u0644\u0645\u0631\u062c\u0639", timestamp:"\u0627\u0644\u062a\u0627\u0631\u064a\u062e", amount:"\u0627\u0644\u0645\u0628\u0644\u063a", status:"\u0627\u0644\u062d\u0627\u0644\u0629", records:"\u0633\u062c\u0644\u0627\u062a \u062d\u0642\u064a\u0642\u064a\u0629",
    noActivity:"\u0644\u0627 \u062a\u0648\u062c\u062f \u062d\u0631\u0643\u0629 \u0645\u0633\u062c\u0651\u0644\u0629 \u0628\u0639\u062f.", viewAll:"\u0639\u0631\u0636 \u0627\u0644\u0643\u0644", sample:"", count:"\u0645\u0646"
  },
  en:{
    title:"Manage your store from one place",sub:"Sales, inventory, repairs, customers and cash \u2014 in one place.",
    sale:"New sale",repair:"New repair ticket",products:"Manage products",customers:"Customers",
    inventory:"Inventory & devices",trust:"IMEI check",topup:"Top-up",admin:"Admin",cash:"Cash",
    overview:"Store overview",activeProducts:"Active products",inStock:"Devices in stock",
    completedSales:"Completed sales",openRepairs:"Open repairs",ready:"Ready for delivery",
    tools:"Start here",chart:"Operation breakdown",chartNote:"Recorded operations in this branch since first use.",
    noOperations:"No operations recorded yet.",recentRepairs:"Recent repairs",recentSales:"Recent sales",
    recentActivity:"Store activity",emptyRepairs:"No repair tickets recorded.",emptySales:"No recorded sales.",
    unavailable:"Store data could not be loaded. No unverified figures were shown. Reload this page.",
    reference:"Reference",timestamp:"Date",amount:"Amount",status:"Status",records:"Actual records",
    noActivity:"No store activity recorded yet.",viewAll:"View all",sample:"",count:"of"
  }
} as const;

const fmtMoney=(n:number,currency="USD")=>new Intl.NumberFormat("en-US",{style:"currency",currency:/^[A-Z]{3}$/.test(currency)?currency:"USD"}).format(n);
const fmtDate=(d:Date,locale:Language)=>new Intl.DateTimeFormat(locale==="ar"?"ar-LB":"en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"}).format(d);

export async function StoreHome({locale}:{locale:Language}) {
  const t=words[locale],ar=locale==="ar";
  const ctx=await currentStoreContext();
  if(!ctx) redirect("/"+locale+"/login?next=%2F"+locale);
  const scope={tenantId:ctx.tenantId,branchId:ctx.branchId};
  const href=(path:string)=>"/"+locale+"/"+path;
  let data:Data|null=null;
  try {
    const [branch,products,devices,saleSummary,allSales,repairs,ready,repairCount,topupCount,recentRepairs,recentSales,recentTopups]=await Promise.all([
      db.branch.findFirst({where:{id:ctx.branchId,tenantId:ctx.tenantId},select:{name:true}}),
      db.product.count({where:{tenantId:ctx.tenantId,isActive:true}}),
      db.serializedDevice.count({where:{tenantId:ctx.tenantId,status:"IN_STOCK",stockLocation:{is:{tenantId:ctx.tenantId,branchId:ctx.branchId}}}}),
      db.sale.aggregate({where:{...scope,status:"COMPLETED",baseCurrency:"USD"},_count:{_all:true},_sum:{total:true}}),
      db.sale.count({where:{...scope,status:"COMPLETED"}}),
      db.repairOrder.count({where:{...scope,status:{notIn:["CANCELLED","DELIVERED"]}}}),
      db.repairOrder.count({where:{...scope,status:"READY"}}),
      db.repairOrder.count({where:{...scope,status:{not:"CANCELLED"}}}),
      db.topUpTransaction.count({where:{...scope,status:"POSTED"}}),
      db.repairOrder.findMany({where:scope,orderBy:{intakeAt:"desc"},take:4,select:{id:true,number:true,customerName:true,deviceDescription:true,status:true,intakeAt:true,finalPrice:true}}),
      db.sale.findMany({where:scope,orderBy:{occurredAt:"desc"},take:5,select:{id:true,number:true,total:true,baseCurrency:true,status:true,occurredAt:true}}),
      db.topUpTransaction.findMany({where:{...scope,status:"POSTED"},orderBy:{occurredAt:"desc"},take:3,select:{id:true,occurredAt:true,collectionAmount:true,collectionCurrency:true}}),
    ]);
    const activities:Item[]=[
      ...recentSales.map(x=>({id:x.id,label:x.number,at:x.occurredAt,amount:Number(x.total),currency:x.baseCurrency,path:"pos",status:x.status})),
      ...recentRepairs.map(x=>({id:x.id,label:x.number,at:x.intakeAt,amount:null,currency:"USD",path:"repairs",status:x.status})),
      ...recentTopups.map(x=>({id:x.id,label:x.id.slice(0,10),at:x.occurredAt,amount:Number(x.collectionAmount),currency:x.collectionCurrency,path:"topup",status:"POSTED"})),
    ];
    data={
      branch:branch?.name??"",products,devices,sales:allSales,total:Number(saleSummary._sum.total??0),repairs,ready,
      saleCount:allSales,repairCount,topupCount,
      recentRepairs:recentRepairs.map(r=>({id:r.id,number:r.number,device:r.deviceDescription,name:r.customerName,status:r.status})),
      recentSales:recentSales.map(s=>({id:s.id,number:s.number,total:Number(s.total),currency:s.baseCurrency,status:s.status})),
      recentActivity:activities.sort((a,b)=>b.at.getTime()-a.at.getTime()).slice(0,6),
    };
  }catch {
    // Fail closed: never substitute sample records or zeros for an unavailable database.
  }
  const spotlight=[
    {path:"pos",title:t.sale,sub:"Sales POS",icon:"\ud83d\uded2",tone:"blue",image:"https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=75"},
    {path:"repairs",title:t.repair,sub:"Repair intake",icon:"\ud83d\udd27",tone:"orange",image:"https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=600&q=75"},
    {path:"products/manage",title:t.products,sub:"Products",icon:"\u25a3",tone:"blue",image:"https://images.unsplash.com/photo-1603891128711-11b4b03bb138?auto=format&fit=crop&w=600&q=75"},
    {path:"customers",title:t.customers,sub:"Customers",icon:"\u2659",tone:"orange",image:"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=600&q=75"},
  ];
  const metrics=data?[
    {label:t.completedSales,value:fmtMoney(data.total),detail:ar?"\u0645\u0628\u064a\u0639\u0627\u062a \u0628\u0627\u0644\u062f\u0648\u0644\u0627\u0631":"USD sales",tone:"blue",icon:"\u2197"},
    {label:t.activeProducts,value:String(data.products),detail:ar?"\u0645\u0646\u062a\u062c \u0646\u0634\u0637":"Active products",tone:"green",icon:"\u25a6"},
    {label:t.openRepairs,value:String(data.repairs),detail:`${data.ready} ${t.ready}`,tone:"amber",icon:"\u25c7"},
    {label:t.inStock,value:String(data.devices),detail:ar?"\u0641\u064a \u0647\u0630\u0627 \u0627\u0644\u0641\u0631\u0639":"This branch",tone:"rose",icon:"#"},
  ]:[];
  const chartItems=data?[
    {label:ar?"\u0628\u064a\u0639":"Sales",count:data.saleCount},
    {label:ar?"\u0635\u064a\u0627\u0646\u0629":"Repairs",count:data.repairCount},
    {label:ar?"\u062a\u0639\u0628\u0626\u0629":"Top-up",count:data.topupCount}
  ]:[];
  const chartTotal=chartItems.reduce((s,x)=>s+x.count,0);
  const rawShares=chartItems.map(x=>chartTotal?x.count*100/chartTotal:0);
  const shares=rawShares.map(Math.floor);
  const leftovers=chartTotal?100-shares.reduce((a,b)=>a+b,0):0;
  const largest=chartItems.map((_,i)=>i).sort((a,b)=>(rawShares[b]-shares[b])-(rawShares[a]-shares[a])||a-b);
  for(let i=0;i<leftovers;i++)shares[largest[i]]++;
  return <main className="content pilot-dashboard mobi-c-polish store-home" dir={ar?"rtl":"ltr"}>
    <section className="welcome pilot-welcome">
      <div><h1>{t.title}</h1><p>{t.sub}</p>{data?.branch&&<div className="store-line"><b>{ar&&data.branch==="Main Branch"?"\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0631\u0626\u064a\u0633\u064a":data.branch}</b></div>}</div>
      <div className="hero-actions"><Link className="soft-btn" href={href("admin")}>{t.admin}</Link><Link className="primary" href={href("pos")}><span aria-hidden="true">+</span>{t.sale}</Link></div>
    </section>
    <section className="mobi-c-spotlight" aria-label={ar?"\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629":"Main operations"}>
      {spotlight.map(a=><Link key={a.path} href={href(a.path)} className={"mobi-c-action "+a.tone}>
        <img src={a.image} alt="" loading="lazy"/><span className="mobi-c-action-copy"><b>{a.icon}</b><strong>{a.title}</strong><small>{a.sub}</small></span><span className="mobi-c-action-arrow" aria-hidden="true">{"\u2197"}</span>
      </Link>)}
    </section>
    {!data?<section className="activity-card" role="alert"><p>{t.unavailable}</p></section>:<>
      <section className="section-head"><h2>{t.overview}</h2></section>
      <section className="metrics" aria-label={t.overview}>{metrics.map(m=><article key={m.label} className="metric">
        <div className={"metric-icon "+m.tone} aria-hidden="true">{m.icon}</div>
        <div className="metric-body"><p>{m.label}</p><strong><bdi dir="ltr">{m.value}</bdi></strong><small className={m.tone}>{m.detail}</small></div>
      </article>)}</section>
      <section className="quick-card"><div className="section-head"><h2>{t.tools}</h2></div>
        <div className="quick-grid pilot-quick-grid">{[
          [t.inventory,"inventory","\u25a4"],[t.trust,"device-trust","\u2315"],[t.topup,"topup","\u2197"]
        ].map(([label,path,icon])=><Link className="quick-action" href={href(path)} key={path}><span className="quick-icon blue">{icon}</span><b>{label}</b></Link>)}</div>
      </section>
      {chartTotal>0&&<section className="mobi-c-insight">
        <figure className="operation-breakdown-chart" aria-labelledby="store-ops-heading">
          <figcaption><h2 id="store-ops-heading">{t.chart}</h2><p className="sr-only">{t.chartNote}</p></figcaption>
          {chartTotal===0&&<p className="operation-breakdown-empty">{t.noOperations}</p>}
          {chartTotal>0&&<><div className="operation-breakdown-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
          <ul className="operation-breakdown-rows operation-breakdown-columns">{chartItems.map((x,index)=>{
            const width=chartTotal?x.count*100/chartTotal:0;
            return <li key={x.label}><div className="operation-breakdown-label"><span>{x.label}</span><strong>{x.count} {t.count} {chartTotal} <bdi dir="ltr">({shares[index]}%)</bdi></strong></div>
              <div className="operation-breakdown-track"><span className="operation-breakdown-fill" style={{height:width+"%"}}/></div></li>;
          })}</ul></>}
        </figure>
      </section>}
      {(data.recentRepairs.length>0||data.recentSales.length>0)&&<section className="mobi-c-ops-grid" data-single={data.recentRepairs.length===0||data.recentSales.length===0?"true":undefined}>
        {data.recentRepairs.length>0&&<article className="activity-card"><div className="section-head"><h2>{t.recentRepairs}</h2><Link className="text-link" href={href("repairs")}>{t.viewAll}</Link></div>
          <div className="mobi-c-compact-list">{data.recentRepairs.length?data.recentRepairs.map(r=><div key={r.id}>
            <span className="mobi-c-list-icon orange">\u2301</span><div><b><bdi dir="ltr">{r.number}</bdi> \u2014 {r.device}</b><small>{r.name}</small></div><span className="pill pending">{r.status.replaceAll("_"," ")}</span>
          </div>):<p className="store-empty">{t.emptyRepairs}</p>}</div>
        </article>}
        {data.recentSales.length>0&&<article className="activity-card"><div className="section-head"><h2>{t.recentSales}</h2><Link className="text-link" href={href("pos")}>{t.viewAll}</Link></div>
          <div className="mobi-c-compact-list">{data.recentSales.length?data.recentSales.map(s=><div key={s.id}>
            <span className="mobi-c-list-icon blue">\u25a3</span><div><b dir="ltr">{s.number}</b><small>{s.status.replaceAll("_"," ")}</small></div><span className="pill done" dir="ltr">{fmtMoney(s.total,s.currency)}</span>
          </div>):<p className="store-empty">{t.emptySales}</p>}</div>
        </article>}
      </section>}
      {data.recentActivity.length>0&&<section className="activity-card">
        <div className="section-head"><h2>{t.recentActivity}</h2></div>
        {data.recentActivity.length?<div className="table-wrap"><table>
          <thead><tr><th>{t.reference}</th><th>{t.timestamp}</th><th>{t.amount}</th><th>{t.status}</th></tr></thead>
          <tbody>{data.recentActivity.map(a=><tr key={a.path+a.id}>
            <td><Link className="invoice" href={href(a.path)}><bdi dir="ltr">{a.label}</bdi></Link></td><td>{fmtDate(a.at,locale)}</td>
            <td><bdi dir="ltr">{a.amount===null?"\u2014":fmtMoney(a.amount,a.currency)}</bdi></td><td>{a.status.replaceAll("_"," ")}</td></tr>)}</tbody>
        </table></div>:<p className="store-empty">{t.noActivity}</p>}
      </section>}
    </>}
  </main>;
}
