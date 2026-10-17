"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Order={
 id:string;number:string;customerName:string;device:string;issue:string;imeiLast4:string|null;
 status:string;estimate:number|null;finalPrice:number;paidTotal:number;balanceDue:number;
 timeline:{status:string;at:string}[];
 warranty:{number:string;expiresAt:string;status:string}|null;
};
const stage:Record<string,{ar:string;en:string}>={
 INTAKE:{ar:"مستلم",en:"Received"},DIAGNOSIS:{ar:"قيد الفحص",en:"Diagnosing"},
 ESTIMATE_PENDING:{ar:"بانتظار الموافقة",en:"Awaiting approval"},
 APPROVED:{ar:"معتمد",en:"Approved"},IN_PROGRESS:{ar:"قيد الإصلاح",en:"Repair in progress"},
 READY:{ar:"جاهز للتسليم",en:"Ready for pickup"},
 DELIVERED:{ar:"تم التسليم",en:"Delivered"},CANCELLED:{ar:"ملغى",en:"Cancelled"},
};
const dict={
 ar:{back:"إدارة الصيانة",title:"طلبات صيانة الأجهزة",intro:"سجّل استلام الجهاز وتابع التشخيص والموافقة والإصلاح من شاشة واحدة.",
 warning:"نسخة تجريبية للاختبار — لا تسجّل بيانات عملاء حقيقيين.",
 refresh:"تحديث",new:"استلام جهاز جديد",name:"اسم العميل",phone:"رقم هاتف العميل",
 device:"نوع الجهاز",imei:"رقم IMEI (15 رقمًا)",condition:"حالة الجهاز عند الاستلام",
 issue:"العطل المذكور",receive:"تسجيل الاستلام",orders:"طلبات الصيانة المسجلة",
 select:"اختر الطلب",diagnosis:"التشخيص",estimate:"التكلفة المقدرة بالدولار",
 saveEstimate:"تسجيل التشخيص والتقدير",approve:"اعتماد تقدير الصيانة",
 start:"بدء الإصلاح",ready:"تجهيز الجهاز للتسليم",labor:"تكلفة العمل بالدولار",
 direct:"المصاريف الإضافية بالدولار",finalPrice:"السعر النهائي بالدولار",
 submitReady:"حفظ حالة الجاهزية",status:"الحالة",customer:"العميل",
 action:"الخطوة التالية",history:"مراحل الطلب",empty:"لا توجد طلبات صيانة بعد.",
 selectPlaceholder:"اختر الطلب المراد تشخيصه",save:"حُفظ التحديث بنجاح",
 error:"تعذّر تنفيذ العملية",balance:"الرصيد المستحق",
 cashOpen:"الصندوق مفتوح",cashClosed:"يجب فتح الصندوق قبل تحصيل الدفعات",
 openingUsd:"الرصيد الافتتاحي (USD)",openingLbp:"الرصيد الافتتاحي (LBP)",
 exchangeRate:"سعر صرف الليرة للدولار",openTill:"فتح الصندوق",
 payment:"تحصيل نقدي",amount:"المبلغ المستلم بالدولار",takePayment:"تسجيل الدفعة",
 settled:"تم تسديد القيمة",deliver:"تسليم الجهاز للعميل",
 pickup:"أؤكد أن العميل استلم الجهاز بالفعل",warrantyDays:"مدة الضمان بالأيام",
 warrantyTerms:"شروط الضمان",confirmDelivery:"تأكيد التسليم وإصدار الضمان",
 warranty:"الضمان",until:"ساري حتى",paid:"المدفوع",
 },
 en:{back:"Repairs",title:"Repair orders",intro:"Receive devices, diagnose faults, approve estimates and manage repairs in one place.",
 warning:"Test environment — do not enter real customer details.",
 refresh:"Refresh",new:"Receive device",name:"Customer name",phone:"Customer phone",
 device:"Device description",imei:"IMEI (15 digits)",condition:"Condition at intake",
 issue:"Reported problem",receive:"Record intake",orders:"Repair orders",
 select:"Select a ticket",diagnosis:"Diagnosis",estimate:"Estimated cost (USD)",
 saveEstimate:"Save diagnosis and estimate",approve:"Approve estimate",start:"Start repair",
 ready:"Mark ready for pickup",labor:"Labor cost (USD)",direct:"Additional cost (USD)",
 finalPrice:"Final price (USD)",submitReady:"Confirm ready",status:"Status",customer:"Customer",
 action:"Next action",history:"Ticket progress",empty:"No repairs yet.",
 selectPlaceholder:"Select a ticket to diagnose",save:"Changes saved",
 error:"Unable to complete request",balance:"Balance due",
 cashOpen:"Cash drawer open",cashClosed:"Open the cash drawer before recording cash payments",
 openingUsd:"Opening cash (USD)",openingLbp:"Opening cash (LBP)",
 exchangeRate:"LBP per USD exchange rate",openTill:"Open cash drawer",
 payment:"Cash collection",amount:"Cash received (USD)",takePayment:"Record payment",
 settled:"Fully paid",deliver:"Hand device to customer",
 pickup:"I confirm the customer received the device",warrantyDays:"Warranty duration (days)",
 warrantyTerms:"Warranty terms",confirmDelivery:"Confirm pickup and issue warranty",
 warranty:"Warranty",until:"Valid until",paid:"Paid",
 },
} as const;

export default function RepairLivePage(){
 const {locale:raw}=useParams<{locale:string}>();const locale=raw==="en"?"en":"ar";const t=dict[locale];
 const [orders,setOrders]=useState<Order[]>([]),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[loading,setLoading]=useState(true);
 const [cashOpen,setCashOpen]=useState(false);
 const [openingUsd,setOpeningUsd]=useState("0"),[openingLbp,setOpeningLbp]=useState("0");
 const [exchangeRate,setExchangeRate]=useState("");
 const [customerName,setCustomerName]=useState(""),[customerPhone,setCustomerPhone]=useState("");
 const [deviceDescription,setDeviceDescription]=useState(""),[imei,setImei]=useState("");
 const [condition,setCondition]=useState(""),[reportedIssue,setReportedIssue]=useState("");
 const [selectedId,setSelectedId]=useState(""),[diagnosis,setDiagnosis]=useState("");
 const [estimate,setEstimate]=useState(""),[labor,setLabor]=useState("0"),[direct,setDirect]=useState("0");
 const [finalPrice,setFinalPrice]=useState("");
 const [readyId,setReadyId]=useState<string|null>(null);
 const pending=orders.filter(o=>o.status==="INTAKE"||o.status==="DIAGNOSIS");
 const selected=pending.find(o=>o.id===selectedId);
 async function reload(){
  const res=await fetch("/api/ops/live-02",{cache:"no-store"});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"READ_FAILED");
  setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));
 }
 useEffect(()=>{
  let active=true;
  fetch("/api/ops/live-02",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"READ_FAILED");
   if(active){setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));}
  }).catch(e=>{if(active)setMessage(String(e.message));})
  .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 async function send(payload:Record<string,unknown>){
  if(busy)return false;
  setBusy(true);setMessage("");
  try{
   const res=await fetch("/api/ops/live-02",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
   const data=await res.json();
   if(!res.ok)throw new Error(data.error||"REQUEST_REJECTED");
   await reload();
   setMessage(t.save);
   if(payload.action==="intake"){
    setCustomerName("");setCustomerPhone("");setDeviceDescription("");setImei("");setCondition("");setReportedIssue("");
   }
   if(payload.action==="estimate")setSelectedId("");
   return true;
  }catch(e){setMessage(t.error+": "+(e instanceof Error?e.message:"UNKNOWN"));return false;}
  finally{setBusy(false);}
 }
 const statusLabel=(status:string)=>stage[status]?.[locale]??status;
 return <main className="module-page mobi-live02" lang={locale} dir={locale==="ar"?"rtl":"ltr"}>
  <header className="module-header"><div>
   <Link href={"/"+locale+"/repairs"} className="back-link">{t.back}</Link>
   <h1>{t.title}</h1><p className="module-sub">{t.intro}</p>
  </div><button className="soft-btn" type="button" disabled={busy}
   onClick={()=>void reload().catch(e=>setMessage(String(e.message)))}>{t.refresh}</button></header>
  <p role="note" className="preview-notice">{t.warning}</p>
  {message&&<p role="status" className="mobi-live-message">{message}</p>}
  <nav className="mobi-live02-flow" aria-label={locale==="ar"?"خطوات العمل":"Repair process"}>
   <a href="#mobi-repair-intake"><b>01</b>{locale==="ar"?"الاستلام":"Receive"}</a>
   <a href="#mobi-repair-diagnosis"><b>02</b>{locale==="ar"?"التشخيص":"Diagnose"}</a>
   <a href="#mobi-repair-orders"><b>03</b>{locale==="ar"?"الإصلاح":"Repair"}</a>
   <a href="#mobi-repair-cash"><b>04</b>{locale==="ar"?"التحصيل والتسليم":"Collect & deliver"}</a>
  </nav>
  <section className="mobi-live02-forms">
   <form id="mobi-repair-intake" onSubmit={event=>{
    event.preventDefault();
    void send({action:"intake",customerName,customerPhone,deviceDescription,imei,condition,reportedIssue,accessories:[]});
   }}>
    <h2>{t.new}</h2>
    {([
      [t.name,customerName,setCustomerName],[t.phone,customerPhone,setCustomerPhone],
      [t.device,deviceDescription,setDeviceDescription],[t.imei,imei,setImei],
      [t.condition,condition,setCondition],[t.issue,reportedIssue,setReportedIssue],
    ] as const).map(([label,value,update])=><label key={label}>{label}<input required
     inputMode={label===t.imei?"numeric":undefined}
     pattern={label===t.imei?"[0-9]{15}":undefined}
     maxLength={label===t.imei?15:200}
     value={value} onChange={e=>update(e.target.value)}/></label>)}
    <button className="primary" type="submit" disabled={busy}>{t.receive}</button>
   </form>
   <form id="mobi-repair-diagnosis" onSubmit={event=>{
    event.preventDefault();
    if(!selected)return;
    void send({action:"estimate",repairId:selected.id,diagnosis,estimateAmount:Number(estimate)});
   }}>
    <h2>{t.diagnosis}</h2>
    <label>{t.select}
     <select required value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
      <option value="">{t.selectPlaceholder}</option>
      {pending.map(o=><option key={o.id} value={o.id}>{o.number} · {o.customerName} · {o.device}</option>)}
     </select>
    </label>
    <label>{t.diagnosis}<input required minLength={2} value={diagnosis} onChange={e=>setDiagnosis(e.target.value)}/></label>
    <label>{t.estimate}<input required min={1} step="0.01" type="number" value={estimate} onChange={e=>setEstimate(e.target.value)}/></label>
    <button className="primary" type="submit" disabled={busy||!selected}>{t.saveEstimate}</button>
   </form>
  </section>
  {!loading&&<details id="mobi-repair-cash" className="mobi-live02-cash">
   <summary><span className="mobi-live02-cash-marker">●</span>{cashOpen?t.cashOpen:t.cashClosed}</summary>
   {!cashOpen&&<form onSubmit={event=>{event.preventDefault();
    if(!window.confirm(locale==="ar"?"هل تريد فتح صندوق الفرع بالقيم المدخلة؟":"Open this branch's cash drawer with these balances?"))return;
    void send({action:"openCash",openingUsd:Number(openingUsd),openingLbp:Number(openingLbp),
      openingExchangeRate:Number(exchangeRate)});
   }}>
    <label>{t.openingUsd}<input required type="number" min="0" step="0.01" value={openingUsd}
      onChange={e=>setOpeningUsd(e.target.value)}/></label>
    <label>{t.openingLbp}<input required type="number" min="0" step="1" value={openingLbp}
      onChange={e=>setOpeningLbp(e.target.value)}/></label>
    <label>{t.exchangeRate}<input required type="number" min="1" step="0.01" value={exchangeRate}
      onChange={e=>setExchangeRate(e.target.value)}/></label>
    <button className="primary" type="submit" disabled={busy||!exchangeRate}>{t.openTill}</button>
   </form>}
  </details>}
  <section id="mobi-repair-orders" className="activity-card"><div className="section-head"><h2>{t.orders}</h2></div>
   {loading?<p className="module-sub">{locale==="ar"?"جارٍ تحميل الطلبات...":"Loading orders..."}</p>:null}
   <div className="table-wrap"><table><thead><tr><th>{t.select}</th><th>{t.customer}</th><th>{t.device}</th><th>{t.status}</th><th>{t.estimate}</th><th>{t.action}</th></tr></thead>
    <tbody>
     {orders.map(o=><tr key={o.id}>
      <td><bdi dir="ltr">{o.number}</bdi></td><td>{o.customerName}</td><td>{o.device}</td>
      <td><span className={"pill "+(o.status==="READY"?"done":"pending")}>{statusLabel(o.status)}</span></td>
      <td>{o.estimate===null?"—":o.estimate.toFixed(2)+" USD"}</td>
      <td>
       {o.status==="ESTIMATE_PENDING"?<button type="button" disabled={busy}
        onClick={()=>void send({action:"approve",repairId:o.id})}>{t.approve}</button>:null}
       {o.status==="APPROVED"?<button type="button" disabled={busy}
        onClick={()=>void send({action:"start",repairId:o.id})}>{t.start}</button>:null}
       {o.status==="IN_PROGRESS"?<details className="mobi-live02-ready" open={readyId===o.id} onToggle={e=>{
         if(e.currentTarget.open){
          setReadyId(o.id);setFinalPrice("");setLabor("0");setDirect("0");
         }else if(readyId===o.id){setReadyId(null);}
        }}>
        <summary>{t.ready}</summary>
        <form onSubmit={event=>{event.preventDefault();
         if(readyId!==o.id || !finalPrice.trim())return;
         if(!window.confirm(locale==="ar"?"تأكيد السعر النهائي وحالة الجهاز جاهز للاستلام؟":"Confirm the final amount and mark this repair ready?"))return;
         void send({action:"ready",repairId:o.id,
         finalPrice:Number(finalPrice),laborCost:Number(labor),directCost:Number(direct)});
        }}>
         <label>{t.finalPrice}<input type="number" min="1" step="0.01" required
          placeholder={o.estimate?.toFixed(2)??""} value={finalPrice} onChange={e=>setFinalPrice(e.target.value)}/></label>
         <label>{t.labor}<input type="number" min="0" step="0.01" required
          value={labor} onChange={e=>setLabor(e.target.value)}/></label>
         <label>{t.direct}<input type="number" min="0" step="0.01" required
          value={direct} onChange={e=>setDirect(e.target.value)}/></label>
         <button type="submit" disabled={busy||readyId!==o.id||!finalPrice.trim()}>{t.submitReady}</button>
        </form>
       </details>:null}
       {(o.status==="READY"||o.status==="DELIVERED")&&<RepairSettlementControls
        order={o} locale={locale} t={t} cashOpen={cashOpen} busy={busy} send={send}/>}
      </td></tr>)}
     {!loading&&orders.length===0?<tr><td colSpan={6}>{t.empty}</td></tr>:null}
    </tbody></table></div>
  </section>
 </main>;
}


function RepairSettlementControls({order,locale,t,cashOpen,busy,send}:{
 order:Order;locale:"ar"|"en";t:typeof dict["ar"]|typeof dict["en"];cashOpen:boolean;busy:boolean;
 send:(payload:Record<string,unknown>)=>Promise<boolean>;
}){
 const [amount,setAmount]=useState("");
 const retry=useRef<{amount:string;key:string}|null>(null);
 const [warrantyDays,setWarrantyDays]=useState("30");
 const [warrantyTerms,setWarrantyTerms]=useState("");
 const [pickedUp,setPickedUp]=useState(false);
 if(order.status==="DELIVERED")return <div className="mobi-live02-settlement">
   <strong>{t.paid}: {order.paidTotal.toFixed(2)} USD</strong>
   {order.warranty&&<p>{t.warranty}: <bdi dir="ltr">{order.warranty.number}</bdi>
    {" · "}{t.until} {new Date(order.warranty.expiresAt).toLocaleDateString(locale==="ar"?"ar-LB":"en-US")}</p>}
  </div>;
 if(order.status!=="READY")return null;
 async function pay(){
  const value=Number(amount);
  if(!cashOpen||!Number.isFinite(value)||value<=0||value>order.balanceDue)return;
  if(!window.confirm(locale==="ar"?"هل استلمت هذا المبلغ نقدًا فعلًا؟":"Have you physically received this cash amount?"))return;
  if(!retry.current||retry.current.amount!==amount){
    retry.current={amount,key:crypto.randomUUID()};
  }
  const done=await send({action:"pay",repairId:order.id,amount:value,
    idempotencyKey:retry.current.key});
  if(done){retry.current=null;setAmount("");}
 }
 async function deliver(){
  if(!pickedUp||order.balanceDue>0||!warrantyTerms.trim())return;
  if(!window.confirm(locale==="ar"?"تأكيد تسليم الجهاز وإصدار الضمان؟":"Confirm device pickup and issue warranty?"))return;
  await send({action:"deliver",repairId:order.id,confirmedPickup:true,
    warrantyDays:Number(warrantyDays),warrantyTerms});
 }
 return <div className="mobi-live02-settlement">
  <p><strong>{t.paid}: {order.paidTotal.toFixed(2)} USD</strong>
   {" · "}{t.balance}: {order.balanceDue.toFixed(2)} USD</p>
  {order.balanceDue>0?<form onSubmit={event=>{event.preventDefault();void pay();}}>
    <label>{t.amount}<input required type="number" min="0.01"
      max={order.balanceDue} step="0.01" value={amount} onChange={event=>setAmount(event.target.value)}/></label>
    <button type="submit" disabled={busy||!cashOpen||!amount}>{t.takePayment}</button>
    {!cashOpen&&<small>{t.cashClosed}</small>}
   </form>:<form onSubmit={event=>{event.preventDefault();void deliver();}}>
    <strong>{t.settled}</strong>
    <label>{t.warrantyDays}<input type="number" min="1" max="365" step="1" required
      value={warrantyDays} onChange={event=>setWarrantyDays(event.target.value)}/></label>
    <label>{t.warrantyTerms}<input required minLength={5} maxLength={1000}
      value={warrantyTerms} onChange={event=>setWarrantyTerms(event.target.value)}/></label>
    <label className="mobi-live02-pickup"><input type="checkbox" required
      checked={pickedUp} onChange={event=>setPickedUp(event.target.checked)}/>{t.pickup}</label>
    <button type="submit" disabled={busy||!pickedUp||!warrantyTerms.trim()}>{t.confirmDelivery}</button>
   </form>}
 </div>;
}
