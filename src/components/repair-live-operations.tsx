"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { filterRepairs, summarizeRepairs, type RepairListFilter } from "@/modules/repairs/repair-owner-view";

type Order={
 id:string;number:string;customerName:string;device:string;issue:string;imeiLast4:string|null;
 intakeAt:string;
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
   search:"بحث برقم الطلب أو العميل أو الجهاز أو آخر 4 أرقام IMEI",
   all:"جميع الطلبات",active:"قيد المعالجة",awaiting:"بانتظار الموافقة",readyFilter:"جاهزة",
   deliveredFilter:"تم تسليمها",noMatch:"لا توجد طلبات تطابق البحث أو التصفية.",
   total:"الطلبات المعروضة",moreRows:"نعرض أحدث 75 طلبًا فقط. للبحث في الطلبات الأقدم نحتاج إلى تصفح جميع السجلات.",activeTotal:"قيد المعالجة",readyTotal:"جاهزة للتسليم",
   dueTotal:"مستحقات الصيانة الجاهزة",intakeDate:"تاريخ الاستلام",ticket:"رقم الطلب",
   issueLabel:"العطل",deviceLabel:"الجهاز",ticketState:"حالة الطلب",notPriced:"لم تُحدد بعد",
   openTicket:"فتح الطلب",caseDetails:"تفاصيل طلب الصيانة",closeTicket:"إغلاق التفاصيل",
   nextAction:"الإجراء التالي",noAction:"لا توجد إجراءات متاحة لهذه الحالة",
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
   search:"Search ticket, customer, device or last 4 IMEI digits",
   all:"All repairs",active:"In progress",awaiting:"Awaiting approval",readyFilter:"Ready",
   deliveredFilter:"Delivered",noMatch:"No repairs match the search or filter.",
   total:"Listed tickets",moreRows:"Showing the latest 75 repairs only. Older records require full-history search.",activeTotal:"In progress",readyTotal:"Ready for pickup",
   dueTotal:"Ready repairs due",intakeDate:"Received",ticket:"Ticket",
   issueLabel:"Issue",deviceLabel:"Device",ticketState:"Status",notPriced:"Not yet priced",
   openTicket:"Open ticket",caseDetails:"Repair ticket details",closeTicket:"Close details",
   nextAction:"Next action",noAction:"No further action for this status",
 },
} as const;

export default function RepairLivePage(){
 const {locale:raw}=useParams<{locale:string}>();const locale=raw==="en"?"en":"ar";const t=dict[locale];
 const [orders,setOrders]=useState<Order[]>([]),[busy,setBusy]=useState(false);
 const [message,setMessage]=useState(""),[loading,setLoading]=useState(true);
 const [cashOpen,setCashOpen]=useState(false);
 const [totalOrders,setTotalOrders]=useState(0);
 const [openingUsd,setOpeningUsd]=useState("0"),[openingLbp,setOpeningLbp]=useState("0");
 const [exchangeRate,setExchangeRate]=useState("");
 const [customerName,setCustomerName]=useState(""),[customerPhone,setCustomerPhone]=useState("");
 const [deviceDescription,setDeviceDescription]=useState(""),[imei,setImei]=useState("");
 const [condition,setCondition]=useState(""),[reportedIssue,setReportedIssue]=useState("");
 const [selectedId,setSelectedId]=useState(""),[diagnosis,setDiagnosis]=useState("");
 const [estimate,setEstimate]=useState(""),[labor,setLabor]=useState("0"),[direct,setDirect]=useState("0");
 const [finalPrice,setFinalPrice]=useState("");
 const [readyId,setReadyId]=useState<string|null>(null);
 const [search,setSearch]=useState("");
 const [statusFilter,setStatusFilter]=useState<RepairListFilter>("ALL");
 const [selectedOrderId,setSelectedOrderId]=useState<string|null>(null);
 const overview=summarizeRepairs(orders);
 const visibleOrders=filterRepairs(orders,search,statusFilter);
 const pending=orders.filter(o=>o.status==="INTAKE"||o.status==="DIAGNOSIS");
 const selected=pending.find(o=>o.id===selectedId);
 const selectedOrder=orders.find(o=>o.id===selectedOrderId);
 useEffect(()=>{
  if(!selectedOrderId)return;
  document.getElementById("mobi-repair-selected")?.scrollIntoView({behavior:"smooth",block:"start"});
 },[selectedOrderId]);
 async function reload(){
  const res=await fetch("/api/ops/live-02",{cache:"no-store"});
  const data=await res.json();
  if(!res.ok)throw new Error(data.error||"READ_FAILED");
  setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));setTotalOrders(Number(data.totalOrders??data.orders.length));
 }
 useEffect(()=>{
  let active=true;
  fetch("/api/ops/live-02",{cache:"no-store"}).then(async response=>{
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"READ_FAILED");
   if(active){setOrders(data.orders as Order[]);setCashOpen(Boolean(data.cashOpen));setTotalOrders(Number(data.totalOrders??data.orders.length));}
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
  <section className="mobi-live02-stats" aria-label={t.orders}>
   <article><span>{t.total}</span><strong>{overview.total}</strong></article>
   <article><span>{t.activeTotal}</span><strong>{overview.active}</strong></article>
   <article><span>{t.readyTotal}</span><strong>{overview.ready}</strong></article>
   <article><span>{t.dueTotal}</span><strong dir="ltr">{overview.balanceDue.toFixed(2)} <small>USD</small></strong></article>
  </section>
  <section id="mobi-repair-orders" className="activity-card mobi-live02-orders">
   <div className="mobi-live02-orders-head">
    <div><h2>{t.orders}</h2><p>{visibleOrders.length} / {totalOrders}</p></div>
    <div className="mobi-live02-filters">
     <label><span className="visually-hidden">{t.search}</span><input
       type="search" aria-label={t.search} value={search} placeholder={t.search}
       onChange={e=>setSearch(e.target.value)}/></label>
     <label><span className="visually-hidden">{t.ticketState}</span>
      <select aria-label={t.ticketState} value={statusFilter}
        onChange={e=>setStatusFilter(e.target.value as RepairListFilter)}>
       <option value="ALL">{t.all}</option><option value="ACTIVE">{t.active}</option>
       <option value="AWAITING">{t.awaiting}</option><option value="READY">{t.readyFilter}</option>
       <option value="DELIVERED">{t.deliveredFilter}</option>
      </select>
     </label>
    </div>
   </div>
   {totalOrders>orders.length?<p role="note" className="module-sub">{t.moreRows}</p>:null}
   {loading?<p className="module-sub">{locale==="ar"?"جارٍ تحميل الطلبات...":"Loading orders..."}</p>:null}
   <div className="table-wrap"><table><thead><tr>
    <th>{t.ticket}</th><th>{t.customer} / {t.deviceLabel}</th><th>{t.ticketState}</th>
    <th>{t.estimate} / {t.balance}</th><th>{t.action}</th></tr></thead>
    <tbody>
     {visibleOrders.map(o=><tr key={o.id}>
      <td className="mobi-live02-ticket">
       <strong><bdi dir="ltr">{o.number}</bdi></strong>
       <small>{new Date(o.intakeAt).toLocaleDateString(locale==="ar"?"ar-LB":"en-GB")}</small>
      </td>
      <td className="mobi-live02-customer">
       <strong>{o.customerName}</strong><span>{o.device}</span><small>{t.issueLabel}: {o.issue}</small>
       {o.imeiLast4&&<small dir="ltr">IMEI ••••{o.imeiLast4}</small>}
      </td>
      <td><span className={"mobi-live02-status mobi-live02-status-"+o.status.toLowerCase()}>{statusLabel(o.status)}</span></td>
      <td className="mobi-live02-price">
       <strong>{o.estimate===null?t.notPriced:o.estimate.toFixed(2)+" USD"}</strong>
       {(o.status==="READY"||o.status==="DELIVERED")&&<small>{t.balance}: {o.balanceDue.toFixed(2)} USD</small>}
      </td>
      <td className="mobi-live02-actions"><button type="button" className="mobi-live02-open"
       aria-expanded={selectedOrderId===o.id} aria-controls="mobi-repair-selected"
       onClick={()=>{setSelectedOrderId(o.id);if(selectedOrderId===o.id)document.getElementById("mobi-repair-selected")?.scrollIntoView({behavior:"smooth",block:"start"});}}>
       {t.openTicket}</button>      </td></tr>)}
     {!loading&&visibleOrders.length===0?<tr><td colSpan={5} className="mobi-live02-noorders">
      {orders.length===0?t.empty:t.noMatch}
     </td></tr>:null}
    </tbody></table></div>
   {selectedOrder&&<section id="mobi-repair-selected" className="mobi-live02-case-detail"
     aria-label={t.caseDetails}>
    <header className="mobi-live02-case-head">
     <div><span>{t.caseDetails}</span>
      <h3><bdi dir="ltr">{selectedOrder.number}</bdi> · {selectedOrder.customerName}</h3>
      <p>{selectedOrder.device} · {t.issueLabel}: {selectedOrder.issue}</p>
     </div>
     <button type="button" className="mobi-live02-close"
      onClick={()=>setSelectedOrderId(null)}>{t.closeTicket}</button>
    </header>
    <div className="mobi-live02-case-content">
     <div className="mobi-live02-case-data">
      <div><span>{t.ticketState}</span><strong className={"mobi-live02-status mobi-live02-status-"+selectedOrder.status.toLowerCase()}>{statusLabel(selectedOrder.status)}</strong></div>
      <div><span>{t.intakeDate}</span><strong>{new Date(selectedOrder.intakeAt).toLocaleDateString(locale==="ar"?"ar-LB":"en-GB")}</strong></div>
      <div><span>{t.estimate}</span><strong>{selectedOrder.estimate===null?t.notPriced:selectedOrder.estimate.toFixed(2)+" USD"}</strong></div>
      <div><span>{t.balance}</span><strong>{selectedOrder.balanceDue.toFixed(2)} USD</strong></div>
      {selectedOrder.imeiLast4&&<div><span>IMEI</span><strong dir="ltr">••••{selectedOrder.imeiLast4}</strong></div>}
     </div>
     <div className="mobi-live02-panel-actions">
      <h4>{t.nextAction}</h4>

       {selectedOrder.status==="ESTIMATE_PENDING"?<button type="button" disabled={busy}
        onClick={()=>void send({action:"approve",repairId:selectedOrder.id})}>{t.approve}</button>:null}
       {selectedOrder.status==="APPROVED"?<button type="button" disabled={busy}
        onClick={()=>void send({action:"start",repairId:selectedOrder.id})}>{t.start}</button>:null}
       {selectedOrder.status==="IN_PROGRESS"?<details className="mobi-live02-ready" open={readyId===selectedOrder.id} onToggle={e=>{
         if(e.currentTarget.open){
          setReadyId(selectedOrder.id);setFinalPrice("");setLabor("0");setDirect("0");
         }else if(readyId===selectedOrder.id){setReadyId(null);}
        }}>
        <summary>{t.ready}</summary>
        <form onSubmit={event=>{event.preventDefault();
         if(readyId!==selectedOrder.id || !finalPrice.trim())return;
         if(!window.confirm(locale==="ar"?"تأكيد السعر النهائي وحالة الجهاز جاهز للاستلام؟":"Confirm the final amount and mark this repair ready?"))return;
         void send({action:"ready",repairId:selectedOrder.id,
         finalPrice:Number(finalPrice),laborCost:Number(labor),directCost:Number(direct)});
        }}>
         <label>{t.finalPrice}<input type="number" min="1" step="0.01" required
          placeholder={selectedOrder.estimate?.toFixed(2)??""} value={finalPrice} onChange={e=>setFinalPrice(e.target.value)}/></label>
         <label>{t.labor}<input type="number" min="0" step="0.01" required
          value={labor} onChange={e=>setLabor(e.target.value)}/></label>
         <label>{t.direct}<input type="number" min="0" step="0.01" required
          value={direct} onChange={e=>setDirect(e.target.value)}/></label>
         <button type="submit" disabled={busy||readyId!==selectedOrder.id||!finalPrice.trim()}>{t.submitReady}</button>
        </form>
       </details>:null}
       {(selectedOrder.status==="READY"||selectedOrder.status==="DELIVERED")&&<RepairSettlementControls
        order={selectedOrder} locale={locale} t={t} cashOpen={cashOpen} busy={busy} send={send}/>}
     {["INTAKE","DIAGNOSIS","DELIVERED","CANCELLED"].includes(selectedOrder.status)&&
       <p className="module-sub">{t.noAction}</p>}
     </div>
    </div>
   </section>}
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
