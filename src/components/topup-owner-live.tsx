"use client";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
type Provider={id:string;code:string;name:string;mode:"IMMEDIATE"|"ON_ACCOUNT";payableBalance:number|null;isActive:boolean};
type Service={id:string;providerId:string;code:string;nameAr:string;nameEn:string;defaultCost:number|null;defaultSale:number;isActive:boolean};
type Entry={id:string;providerId:string;serviceId:string;customerPhone:string;costBase:number|null;saleBase:number;profitBase:number|null;status:string;settlementId:string|null;occurredAt:string};
type Snapshot={providers:Provider[];services:Service[];transactions:Entry[];cashOpen:boolean;canConfigure:boolean};
const usd=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
export default function TopupOwnerLive({locale,integrationSandboxEnabled=false}:{locale:"ar"|"en";integrationSandboxEnabled?:boolean}){
 const ar=locale==="ar";
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const [providerId,setProviderId]=useState(""),[serviceId,setServiceId]=useState(""),[phone,setPhone]=useState("");
 const [fulfilled,setFulfilled]=useState(false),[collected,setCollected]=useState(false);
 const [settleProvider,setSettleProvider]=useState(""),[selected,setSelected]=useState<string[]>([]),[reference,setReference]=useState("");
 const refresh=useCallback(async()=>{
  const r=await fetch("/api/ops/topup",{cache:"no-store"});const body=await r.json();
  if(!r.ok)throw new Error(body.error||"READ_FAILED");
  setData(body);
 },[]);
 useEffect(()=>{let active=true;const load=async()=>{try{await refresh()}catch(e){if(active)setError(e instanceof Error?e.message:"READ_FAILED")}};void load();return()=>{active=false}},[refresh]);
 const availableServices=useMemo(()=>data?.services.filter(s=>s.isActive&&(!providerId||s.providerId===providerId))??[],[data,providerId]);
 const service=availableServices.find(s=>s.id===serviceId);
 const provider=data?.providers.find(p=>p.id===providerId);
 const pending=data?.transactions.filter(x=>x.providerId===settleProvider&&x.status==="POSTED"&&!x.settlementId)??[];
 const amount=pending.filter(x=>selected.includes(x.id)).reduce((v,x)=>v+(x.costBase??0),0);
 async function send(payload:object){
  setBusy(true);setError("");setNotice("");
  try{
   const response=await fetch("/api/ops/topup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const body=await response.json();if(!response.ok)throw new Error(body.error||"OPERATION_FAILED");
   await refresh();setNotice(ar?"تم حفظ العملية في سجلات المتجر.":"Saved in the store records.");return true;
  }catch(e){setError(e instanceof Error?e.message:"OPERATION_FAILED");return false}finally{setBusy(false)}
 }
 async function createProvider(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,values=new FormData(form);
  if(await send({action:"provider",code:String(values.get("code")).trim(),name:String(values.get("name")).trim(),mode:String(values.get("mode"))}))form.reset();
 }
 async function createService(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,values=new FormData(form);
  if(await send({action:"service",providerId:String(values.get("provider")),code:String(values.get("code")).trim(),
   nameAr:String(values.get("nameAr")).trim(),nameEn:String(values.get("nameEn")).trim(),cost:Number(values.get("cost")),sale:Number(values.get("sale"))}))form.reset();
 }
 async function createSale(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!service||!fulfilled||!collected)return;
  if(await send({action:"post",serviceId:service.id,phone,fulfilled:true,collected:true,idempotencyKey:crypto.randomUUID()})){
   setPhone("");setFulfilled(false);setCollected(false);
  }
 }
 async function settle(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected.length||amount<=0||!reference.trim())return;
  if(await send({action:"settle",providerId:settleProvider,transactionIds:selected,amount:Number(amount.toFixed(4)),
   reference,confirmed:true,idempotencyKey:crypto.randomUUID()})){setSelected([]);setReference("")}
 }
 const field={width:"100%",padding:"11px",borderRadius:9,border:"1px solid #cbd7e6",background:"#fff",color:"#132c48"} as const;
 return <main className="module-page mobi-topup-live" lang={locale} dir={ar?"rtl":"ltr"}>
  <header className="module-header"><div>
   <Link className="back-link" href={`/${locale}`}>{ar?"الرئيسية":"Dashboard"}</Link>
   <p className="module-kicker">A1 MOBI · TOP-UP</p>
   <h1>{ar?"التعبئة والتشريج":"Recharge & Top-up"}</h1>
   <p className="module-sub">{ar?"سجل التعبئة الفعلي والمزوّدين والتسويات، دون مخزون افتراضي.":"Actual recharge records, providers and settlements without artificial stock."}</p>
  </div></header>
  <p className="mobi-topup-disclaimer" role="note">{ar
   ?"تسجيل يدوي فقط: لا يرسل هذا النظام تعبئة إلى Alfa أو touch أو أي مزوّد. سجّل العملية بعد تنفيذها لدى المزوّد واستلام ثمنها من الزبون."
   :"Manual recording only: this system does not send credit to any operator. Record a transaction only after provider fulfillment and customer payment."}</p>
  <section className="activity-card" aria-label={ar?"طرق التعبئة":"Recharge methods"}>
   <h2>{ar?"طرق التعبئة":"Recharge methods"}</h2>
   <p className="module-sub">{ar?"التعبئة اليدوية متاحة الآن؛ سجّل فقط العمليات التي أكّد المزوّد تنفيذها.":"Manual top-up is available now; record only fulfillment confirmed by the supplier."}</p>
   <p className="module-sub">{integrationSandboxEnabled
    ?(ar?"يتوفر مسار A1 Recharge منفصل عبر التبويب أعلاه. لا ينفّذ شحنًا حقيقيًا؛ وقد يسجّل تحصيلًا وهميًا داخل قاعدة G5 فقط بعد تأكيد صريح.":"Use the A1 Recharge tab above for isolated tests. No real carrier dispatch; explicitly approved synthetic transactions may post only to G5.")
    :(ar?"الربط المباشر مع A1 Recharge قيد الاختبار ولم يُفعّل لهذا المتجر بعد. لا تُنشئ هذه الصفحة تعبئة آلية أو طلبًا لدى المزوّد.":"A1 Recharge direct integration is being tested and is not enabled for this store. This page does not dispatch automatic top-ups or supplier requests.")}</p>
  </section>
  {error&&<p className="preview-notice" role="alert">{error}</p>}
  {notice&&<p className="module-banner" role="status">{notice}</p>}
  {!data?<p>{ar?"جارٍ تحميل بيانات المتجر...":"Loading store data..."}</p>:<>
  {!data.cashOpen&&<div className="preview-notice" role="alert">{ar?"يجب فتح جلسة الصندوق قبل تسجيل تعبئة أو تسوية نقدية.":"Open a cash drawer session before recording any top-up or settlement."} <Link href={`/${locale}/cash`}>{ar?"فتح الصندوق":"Open cash"}</Link></div>}
  <section className="metrics ops-metrics">
   <article className="metric"><div className="metric-body"><p>{ar?"مزوّدون":"Providers"}</p><strong>{data.providers.length}</strong></div></article>
   <article className="metric"><div className="metric-body"><p>{ar?"خدمات معرّفة":"Services"}</p><strong>{data.services.length}</strong></div></article>
   <article className="metric"><div className="metric-body"><p>{ar?"عمليات مسجّلة":"Recorded transactions"}</p><strong>{data.transactions.length}</strong></div></article>
   <article className="metric"><div className="metric-body"><p>{ar?"مبيعات العمليات المعروضة":"Displayed sales"}</p><strong>{usd(data.transactions.reduce((v,x)=>v+x.saleBase,0))}</strong></div></article>
  </section>
  <section className="mobi-topup-grid">
   <form className="activity-card" onSubmit={createSale}>
    <h2>{ar?"تسجيل تعبئة منفذة":"Record completed top-up"}</h2>
    <label>{ar?"المزوّد":"Provider"}<select style={field} value={providerId} onChange={e=>{setProviderId(e.target.value);setServiceId("")}} required>
     <option value="">{ar?"اختر المزوّد":"Choose provider"}</option>
     {data.providers.filter(p=>p.isActive).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
    </select></label>
    <label>{ar?"الخدمة":"Service"}<select style={field} value={serviceId} onChange={e=>setServiceId(e.target.value)} required>
     <option value="">{ar?"اختر الخدمة":"Choose service"}</option>
     {availableServices.map(s=><option key={s.id} value={s.id}>{ar?s.nameAr:s.nameEn} — {usd(s.defaultSale)}</option>)}
    </select></label>
    <label>{ar?"رقم الزبون أو مرجع الخدمة":"Customer number or service reference"}
     <input style={field} type="text" required minLength={3} maxLength={40} value={phone} onChange={e=>setPhone(e.target.value)}/></label>
    {service&&<p className="module-sub">{ar?"سعر البيع":"Sale"}: <strong>{usd(service.defaultSale)}</strong>{provider?.mode==="ON_ACCOUNT"?" · "+(ar?"على حساب المزوّد":"Provider payable"):""}</p>}
    <label className="mobi-topup-check"><input type="checkbox" checked={fulfilled} onChange={e=>setFulfilled(e.target.checked)}/>
     {ar?"أؤكد أنني نفذت التعبئة لدى المزوّد خارج النظام.":"I confirm the provider fulfilled this top-up outside the system."}</label>
    <label className="mobi-topup-check"><input type="checkbox" checked={collected} onChange={e=>setCollected(e.target.checked)}/>
     {ar?"أؤكد استلام المبلغ كاملًا بالدولار وتسجيله في الصندوق.":"I confirm full USD payment collected into the drawer."}</label>
    <button className="primary" disabled={busy||!data.cashOpen||!service||!fulfilled||!collected}>{ar?"حفظ التعبئة في الحسابات":"Post completed top-up"}</button>
   </form>
   {data.canConfigure&&<div className="mobi-topup-admin">
    <form className="activity-card" onSubmit={createProvider}>
     <h2>{ar?"إضافة مزوّد أو تاجر":"Add supplier/provider"}</h2>
     <label>{ar?"الاسم":"Name"}<input style={field} name="name" required minLength={2} maxLength={100}/></label>
     <label>{ar?"رمز فريد (حروف إنجليزية)":"Unique code"}<input style={field} name="code" dir="ltr" required pattern="[A-Za-z0-9._-]{2,48}"/></label>
     <label>{ar?"طريقة التعامل":"Payment arrangement"}<select style={field} name="mode"><option value="ON_ACCOUNT">{ar?"على الحساب — تسوية لاحقًا":"On account — settle later"}</option><option value="IMMEDIATE">{ar?"دفع فوري من الصندوق":"Immediate cost from drawer"}</option></select></label>
     <button className="primary" disabled={busy}>{ar?"حفظ المزوّد":"Save provider"}</button>
    </form>
    <form className="activity-card" onSubmit={createService}>
     <h2>{ar?"تعريف خدمة أو كرت":"Add service/card"}</h2>
     <label>{ar?"المزوّد":"Provider"}<select style={field} name="provider" required defaultValue=""><option value="" disabled>{ar?"اختر":"Choose"}</option>{data.providers.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
     <label>{ar?"رمز الخدمة":"Service code"}<input style={field} name="code" dir="ltr" required pattern="[A-Za-z0-9._-]{2,48}"/></label>
     <label>{ar?"الاسم بالعربية":"Arabic name"}<input style={field} name="nameAr" required minLength={2}/></label>
     <label>{ar?"الاسم بالإنكليزية":"English name"}<input style={field} name="nameEn" required minLength={2}/></label>
     <div className="mobi-topup-two">
      <label>{ar?"التكلفة بالدولار":"Cost USD"}<input style={field} name="cost" type="number" min="0" step="0.0001" required/></label>
      <label>{ar?"سعر البيع بالدولار":"Sale USD"}<input style={field} name="sale" type="number" min="0.0001" step="0.0001" required/></label>
     </div>
     <button className="primary" disabled={busy||!data.providers.length}>{ar?"حفظ الخدمة":"Save service"}</button>
    </form>
   </div>}
  </section>
  {data.canConfigure&&data.providers.some(p=>p.mode==="ON_ACCOUNT")&&<form className="activity-card" onSubmit={settle}>
   <h2>{ar?"تسوية حساب المزوّد":"Supplier settlement"}</h2>
   <label>{ar?"المزوّد":"Provider"}<select style={field} value={settleProvider} onChange={e=>{setSettleProvider(e.target.value);setSelected([])}}><option value="">{ar?"اختر المزوّد":"Choose provider"}</option>{data.providers.filter(p=>p.mode==="ON_ACCOUNT").map(p=><option key={p.id} value={p.id}>{p.name} ({p.payableBalance===null?"—":usd(p.payableBalance)})</option>)}</select></label>
   {pending.map(t=><label className="mobi-topup-check" key={t.id}><input type="checkbox" checked={selected.includes(t.id)} onChange={e=>setSelected(current=>e.target.checked?[...current,t.id]:current.filter(x=>x!==t.id))}/>
    {t.customerPhone} · {data.services.find(s=>s.id===t.serviceId)?.nameAr??""} · {t.costBase===null?"—":usd(t.costBase)}</label>)}
   {!!selected.length&&<p>{ar?"إجمالي التسوية":"Settlement total"}: <strong>{usd(amount)}</strong></p>}
   <label>{ar?"مرجع الدفع (كاش / Wish)":"Payment reference (cash/Wish)"}<input style={field} value={reference} onChange={e=>setReference(e.target.value)} minLength={3} maxLength={80}/></label>
   <p className="module-sub">{ar?"يُسجَّل خروج المبلغ من الصندوق بعد دفعه للمزوّد فعليًا.":"Posts a cash-out only after you actually pay the supplier."}</p>
   <button className="primary" disabled={busy||!data.cashOpen||!selected.length||!reference.trim()||amount<=0}>{ar?"اعتماد التسوية المدفوعة":"Post paid settlement"}</button>
  </form>}
  <section className="activity-card"><h2>{ar?"آخر عمليات التعبئة الحقيقية":"Latest recorded top-ups"}</h2>
   {!data.transactions.length?<p className="module-sub">{ar?"لم تُسجَّل أي تعبئة بعد.":"No top-up records yet."}</p>:
    <div className="table-wrap"><table><thead><tr><th>{ar?"التاريخ":"Date"}</th><th>{ar?"المزوّد":"Provider"}</th><th>{ar?"الخدمة":"Service"}</th><th>{ar?"الرقم":"Number"}</th><th>{ar?"بيع USD":"Sale USD"}</th><th>{ar?"الحالة":"Status"}</th></tr></thead><tbody>{data.transactions.map(t=><tr key={t.id}>
     <td>{new Date(t.occurredAt).toLocaleString(ar?"ar-LB":"en-US")}</td>
     <td>{data.providers.find(p=>p.id===t.providerId)?.name}</td>
     <td>{data.services.find(s=>s.id===t.serviceId)?.[ar?"nameAr":"nameEn"]}</td>
     <td dir="ltr">{t.customerPhone}</td><td>{usd(t.saleBase)}</td><td>{t.status==="POSTED"?(ar?"مسجلة":"Posted"):t.status}</td>
    </tr>)}</tbody></table></div>}
  </section>
  </>}
 </main>;
}
