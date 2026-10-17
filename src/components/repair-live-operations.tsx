"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Order={
 id:string;number:string;customerName:string;device:string;issue:string;imeiLast4:string|null;
 status:string;estimate:number|null;finalPrice:number;paidTotal:number;balanceDue:number;
 timeline:{status:string;at:string}[];
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
 },
} as const;

export default function RepairLivePage(){
 const {locale:raw}=useParams<{locale:string}>();const locale=raw==="en"?"en":"ar";const t=dict[locale];
 const [orders,setOrders]=useState<Order[]>([]),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[loading,setLoading]=useState(true);
 const [customerName,setCustomerName]=useState(""),[customerPhone,setCustomerPhone]=useState("");
 const [deviceDescription,setDeviceDescription]=useState(""),[imei,setImei]=useState("");
 const [condition,setCondition]=useState(""),[reportedIssue,setReportedIssue]=useState("");
 const [selectedId,setSelectedId]=useState(""),[diagnosis,setDiagnosis]=useState("");
 const [estimate,setEstimate]=useState("120"),[labor,setLabor]=useState("0"),[direct,setDirect]=useState("0");
 const [finalPrice,setFinalPrice]=useState("120");
 const pending=orders.filter(o=>o.status==="INTAKE"||o.status==="DIAGNOSIS");
 const selected=pending.find(o=>o.id===selectedId);
 async function reload(){
  const res=await fetch("/api/ops/live-02",{cache:"no-store"});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"READ_FAILED");
  setOrders(data.orders as Order[]);
 }
 useEffect(()=>{
  let active=true;
  fetch("/api/ops/live-02",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"READ_FAILED");
   if(active)setOrders(data.orders as Order[]);
  }).catch(e=>{if(active)setMessage(String(e.message));})
  .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);
 async function send(payload:Record<string,unknown>){
  if(busy)return;
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
  }catch(e){setMessage(t.error+": "+(e instanceof Error?e.message:"UNKNOWN"));}
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
  <section className="mobi-live02-forms">
   <form onSubmit={event=>{
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
   <form onSubmit={event=>{
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
  <section className="activity-card"><div className="section-head"><h2>{t.orders}</h2></div>
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
       {o.status==="IN_PROGRESS"?<details className="mobi-live02-ready">
        <summary>{t.ready}</summary>
        <form onSubmit={event=>{event.preventDefault();void send({action:"ready",repairId:o.id,
         finalPrice:Number(finalPrice),laborCost:Number(labor),directCost:Number(direct)});}}>
         <label>{t.finalPrice}<input type="number" min="1" step="0.01" required
          value={finalPrice} onChange={e=>setFinalPrice(e.target.value)}/></label>
         <label>{t.labor}<input type="number" min="0" step="0.01" required
          value={labor} onChange={e=>setLabor(e.target.value)}/></label>
         <label>{t.direct}<input type="number" min="0" step="0.01" required
          value={direct} onChange={e=>setDirect(e.target.value)}/></label>
         <button type="submit" disabled={busy}>{t.submitReady}</button>
        </form>
       </details>:null}
       {o.status==="READY"?<span>{t.balance}: {o.balanceDue.toFixed(2)} USD</span>:null}
      </td></tr>)}
     {!loading&&orders.length===0?<tr><td colSpan={6}>{t.empty}</td></tr>:null}
    </tbody></table></div>
  </section>
 </main>;
}
