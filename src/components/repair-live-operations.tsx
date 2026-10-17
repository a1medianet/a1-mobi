"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { useParams } from "next/navigation";
type Order={id:string;number:string;customerName:string;device:string;issue:string;imeiLast4:string|null;status:string;estimate:number|null;finalPrice:number;balanceDue:number;timeline:{status:string;at:string}[]};
const stages:Record<string,string>={INTAKE:"استلام",DIAGNOSIS:"فحص",ESTIMATE_PENDING:"بانتظار الموافقة",APPROVED:"معتمد",IN_PROGRESS:"قيد الصيانة",READY:"جاهز",DELIVERED:"سُلّم",CANCELLED:"ملغى"};
export default function RepairLivePage(){
 const {locale:raw}=useParams<{locale:string}>();const ar=raw!=="en";const [orders,setOrders]=useState<Order[]>([]);
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [customerName,setCustomerName]=useState(""),[customerPhone,setCustomerPhone]=useState("");
 const [deviceDescription,setDeviceDescription]=useState(""),[imei,setImei]=useState("");
 const [condition,setCondition]=useState(""),[reportedIssue,setReportedIssue]=useState("");
 const [diagnosis,setDiagnosis]=useState(""),[estimate,setEstimate]=useState("120");
 async function reload(){const r=await fetch("/api/ops/live-02",{cache:"no-store"});const data=await r.json();if(!r.ok)throw Error(data.error||"READ_FAILED");setOrders(data.orders);}
 useEffect(()=>{let live=true;fetch("/api/ops/live-02",{cache:"no-store"}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||"READ_FAILED");if(live)setOrders(x.orders);}).catch(e=>{if(live)setMsg(String(e.message));});return()=>{live=false};},[]);
 async function submit(data:Record<string,unknown>){if(busy)return;setBusy(true);setMsg("");
  try{const r=await fetch("/api/ops/live-02",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const x=await r.json();if(!r.ok)throw Error(x.error||"REJECTED");await reload();setMsg(ar?"تم حفظ التحديث بنجاح.":"Update saved.");}catch(e){setMsg(e instanceof Error?e.message:"ERROR");}finally{setBusy(false);}
 }
 return <main className="module-page mobi-live01" dir={ar?"rtl":"ltr"}>
  <header className="module-header"><div><Link className="back-link" href={"/"+(ar?"ar":"en")+"/repairs"}>{ar?"العودة إلى الصيانة":"Back to repairs"}</Link>
   <h1>{ar?"إدارة طلبات الصيانة":"Manage repairs"}</h1><p className="module-sub">{ar?"من استلام الجهاز إلى الموافقة والإصلاح":"From intake to approval and repair"}</p></div>
   <button className="soft-btn" onClick={()=>void reload().catch(e=>setMsg(String(e)))}>{ar?"تحديث":"Refresh"}</button></header>
  <p className="preview-notice">{ar?"بيئة تجريبية: تُحفظ الطلبات في قاعدة اختبار منفصلة.":"Test environment: changes persist in an isolated database."}</p>
  {msg&&<p role="status" className="mobi-live-message">{msg}</p>}
  <section className="mobi-live-steps"><form onSubmit={e=>{e.preventDefault();void submit({action:"intake",customerName,customerPhone,deviceDescription,imei,condition,reportedIssue,accessories:[]});}}>
   <h2>{ar?"طلب صيانة جديد":"New repair ticket"}</h2>
   {([[customerName,setCustomerName,"اسم العميل"],[customerPhone,setCustomerPhone,"هاتف العميل"],[deviceDescription,setDeviceDescription,"الجهاز"],[imei,setImei,"IMEI"],[condition,setCondition,"حالة الجهاز"],[reportedIssue,setReportedIssue,"المشكلة"]] as const).map(([v,set,label])=>
    <label key={label}>{label}<input required value={v} onChange={e=>set(e.target.value)} /></label>)}
   <button className="primary" disabled={busy}>{ar?"استلام الجهاز":"Receive device"}</button>
  </form>
  <form onSubmit={e=>{e.preventDefault();const chosen=orders.find(o=>o.status==="INTAKE"||o.status==="DIAGNOSIS");if(chosen)void submit({action:"estimate",repairId:chosen.id,diagnosis,estimateAmount:Number(estimate)});}}>
   <h2>{ar?"التشخيص والتكلفة":"Diagnosis and estimate"}</h2><p>{ar?"أول طلب بانتظار التشخيص":"First pending diagnosis"}</p>
   <label>{ar?"نتيجة الفحص":"Diagnosis"}<input required value={diagnosis} onChange={e=>setDiagnosis(e.target.value)}/></label>
   <label>{ar?"التكلفة المقدّرة":"Estimate"}<input required type="number" min="1" value={estimate} onChange={e=>setEstimate(e.target.value)}/></label>
   <button className="primary" disabled={busy||!orders.some(o=>o.status==="INTAKE"||o.status==="DIAGNOSIS")}>{ar?"إرسال التقدير":"Save estimate"}</button>
  </form></section>
  <section className="activity-card"><div className="section-head"><h2>{ar?"طلبات الصيانة":"Repair orders"}</h2></div>
   <div className="table-wrap"><table><thead><tr><th>{ar?"الطلب":"Ticket"}</th><th>{ar?"العميل":"Customer"}</th><th>{ar?"الجهاز":"Device"}</th><th>{ar?"الحالة":"Status"}</th><th>{ar?"التكلفة":"Estimate"}</th><th>{ar?"الإجراء":"Action"}</th></tr></thead>
    <tbody>{orders.map(o=><tr key={o.id}><td><bdi>{o.number}</bdi></td><td>{o.customerName}</td><td>{o.device}</td><td>{ar?stages[o.status]:o.status}</td><td>{o.estimate??"—"}</td><td>
     {o.status==="ESTIMATE_PENDING"&&<button disabled={busy} onClick={()=>void submit({action:"approve",repairId:o.id})}>{ar?"اعتماد":"Approve"}</button>}
     {o.status==="APPROVED"&&<button disabled={busy} onClick={()=>void submit({action:"start",repairId:o.id})}>{ar?"بدء الإصلاح":"Start"}</button>}
     {o.status==="IN_PROGRESS"&&<button disabled={busy} onClick={()=>void submit({action:"ready",repairId:o.id,finalPrice:o.estimate??0,laborCost:0,directCost:0})}>{ar?"جاهز للاستلام":"Mark ready"}</button>}
    </td></tr>)}</tbody></table></div>
  </section>
 </main>
}