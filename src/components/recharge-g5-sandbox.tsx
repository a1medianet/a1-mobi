"use client";
import {useEffect,useState,type FormEvent} from "react";

type CatalogItem={sku:string;operator:string;country:string;catalogVersionId:string;currency:string;
 priceMinor:number;feeMinor:number;taxMinor:number;costMinor?:number};
type Quote={quoteId:string;catalogVersionId:string;currency:string;priceMinor:number;
 feeMinor:number;taxMinor:number;totalMinor:number;expiresAt:number};
type Order={rechargeOrderId:string;state:string;version:number;requiresReconciliation?:boolean};
type SourceReview={rechargeOrderId:string;state:string;version:number;providerEvidence:string;
 transport:{allDelivered:boolean;needsOperatorReview:boolean;fulfillmentConfirmedByCarrier:boolean};
 events:Array<{eventId:string;state:string;version:number;deliveryState?:string;lastError?:string}>;
 supplierEntries:Array<{kind:string;currency:string;amountMinor:number}>};
type DeadLetters={immutableUntilReviewed:boolean;mayReplay:false;mayAcknowledge:false;
 mayPostFinance:false;items:Array<{eventId:string;rechargeOrderId:string;version:number;lastError?:string}>};
type ScanReport={status:string;pagesScanned:number;sourceEventsScanned:number;
 missingEventIds:string[];conflictingEventIds:string[];
 versionGapOrderIds:string[];conflictingVersionOrderIds:string[];sourceExhausted:boolean};
const money=(minor:number,currency:string)=>new Intl.NumberFormat("en-US",{
 style:"currency",currency,maximumFractionDigits:currency==="LBP"?0:2,
}).format(minor/(currency==="LBP"?1:100));
async function jsonRequest(url:string,init?:RequestInit){
 const response=await fetch(url,{...init,cache:"no-store"});
 const body=await response.json() as Record<string,unknown>;
 if(!response.ok)throw new Error(String(body.error??"REQUEST_FAILED"));
 return body;
}
export default function RechargeG5Sandbox({
 locale,reviewAllowed=false,cashAllowed=false,costAllowed=false,
}:{locale:"ar"|"en";reviewAllowed?:boolean;cashAllowed?:boolean;costAllowed?:boolean}){
 const ar=locale==="ar";
 const [operator,setOperator]=useState("alfa"),[family,setFamily]=useState("ALL");
 const [items,setItems]=useState<CatalogItem[]>([]),[sku,setSku]=useState("");
 const [quote,setQuote]=useState<Quote|null>(null),[recipient,setRecipient]=useState("");
 const [order,setOrder]=useState<Order|null>(null),[busy,setBusy]=useState(false);
 const [syntheticConfirmed,setSyntheticConfirmed]=useState(false);
 const [refundConfirmed,setRefundConfirmed]=useState(false);
 const [refundMfaCode,setRefundMfaCode]=useState("");
 const [refundResult,setRefundResult]=useState<{refundId:string;amountMinor:number;currency:string;replayed:boolean}|null>(null);
 const [receipt,setReceipt]=useState<{invoiceId:string;receiptId:string;amountMinor:number;currency:string;replayed:boolean}|null>(null);
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [intentChecked,setIntentChecked]=useState(false);
 const [intentId,setIntentId]=useState("");
 const [orderKey,setOrderKey]=useState(""),[externalRef,setExternalRef]=useState("");
 const [cursor,setCursor]=useState("0"),[events,setEvents]=useState<Array<{eventId:string;state:string;version:number}>>([]);
 const [sourceReview,setSourceReview]=useState<SourceReview|null>(null);
 const [deadLetters,setDeadLetters]=useState<DeadLetters|null>(null);
 const [scanReport,setScanReport]=useState<ScanReport|null>(null);
 const api="/api/ops/recharge-bridge";
 useEffect(()=>{
  let alive=true;
  void jsonRequest(api+"?view=outstanding-intent").then(async result=>{
   if(!alive)return;
   const intent=result.intent as {intentId:string;externalRef:string;idempotencyKey:string}|null;
   if(intent){setUncertain(true);setIntentId(intent.intentId);
    setExternalRef(intent.externalRef);setOrderKey(intent.idempotencyKey);return;}
   const recent=await jsonRequest(api+"?view=recent-intent");
   if(!alive)return;
   const previous=recent.intent as {intentId:string;rechargeOrderId:string|null;status:string}|null;
   if(previous?.status==="ACKNOWLEDGED"&&previous.rechargeOrderId){
    const saved=await jsonRequest(api+"?view=order&id="+encodeURIComponent(previous.rechargeOrderId));
    if(alive){setIntentId(previous.intentId);setOrder(saved as unknown as Order);}
   }
  }).catch(()=>{if(alive){setError("INTENT_RECOVERY_UNAVAILABLE");setUncertain(true);}})
   .finally(()=>{if(alive)setIntentChecked(true);});
  return ()=>{alive=false;};
 },[]);
 async function checkOriginalIntent(){
  if(!intentId)return;
  setBusy(true);setError("");
  try{
   const result=await jsonRequest(api+"?view=refresh-intent&id="+encodeURIComponent(intentId));
   if(result.sourceLookupAvailable&&result.order){setOrder(result.order as Order);setUncertain(false);}
   else setNotice(ar?"لم يتوفر بعد بحث Recharge بالمرجع الأصلي. الطلب معلّق بأمان.":"Source lookup by original reference is not available yet; this request remains safely held.");
  }catch(e){setError(e instanceof Error?e.message:"INTENT_RECONCILIATION_FAILED");}
  finally{setBusy(false);}
 }
 async function loadCatalog(){
  if(uncertain)return;
  setOrderKey("");setExternalRef("");setSourceReview(null);setScanReport(null);
  setBusy(true);setError("");setNotice("");setQuote(null);setOrder(null);setSku("");setUncertain(false);setReceipt(null);setSyntheticConfirmed(false);setRefundConfirmed(false);setRefundMfaCode("");setRefundResult(null);
  try{
   const body=await jsonRequest(api+"?view=catalog&country=LB&operator="+encodeURIComponent(operator));
   setItems((body.items as CatalogItem[]??[]).filter(x=>x.country==="LB"&&x.operator===operator));
  }catch(e){setError(e instanceof Error?e.message:"CATALOG_ERROR");}finally{setBusy(false);}
 }
 async function requestQuote(){
  if(!sku||uncertain)return;
  setOrderKey("");setExternalRef("");setSourceReview(null);
  setBusy(true);setError("");setNotice("");setOrder(null);setReceipt(null);setSyntheticConfirmed(false);setRefundConfirmed(false);setRefundMfaCode("");setRefundResult(null);
  try{
   const body=await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"quote",country:"LB",operator,sku,quantity:1,idempotencyKey:crypto.randomUUID()})});
   setQuote(body as unknown as Quote);
  }catch(e){setQuote(null);setError(e instanceof Error?e.message:"QUOTE_ERROR");}
  finally{setBusy(false);}
 }
 async function placeOrder(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!quote||Date.now()>=quote.expiresAt||!recipient.trim()||uncertain||!intentChecked)return;
  setBusy(true);setError("");setNotice("");
  const key=orderKey||crypto.randomUUID(),reference=externalRef||"mobi-g5-test-ref-"+crypto.randomUUID();
  setOrderKey(key);setExternalRef(reference);
  try{
   const body=await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"order",quoteId:quote.quoteId,recipient,externalRef:reference,idempotencyKey:key})});
   const result=body as {intent:{intentId:string;status:string;rechargeOrderId:string|null};order:Order|null;replayed:boolean};
   setIntentId(result.intent.intentId);
   if(result.order){setOrder(result.order);setUncertain(false);}
   else if(result.intent.rechargeOrderId){
    setOrder(await jsonRequest(api+"?view=order&id="+encodeURIComponent(result.intent.rechargeOrderId)) as unknown as Order);
    setUncertain(false);
   }else setUncertain(true);
   setNotice(result.order?(ar?"تم إنشاء طلب تجريبي بانتظار التنفيذ فقط.":"Synthetic order created; awaiting fulfillment."):
    (ar?"المحاولة الأصلية محفوظة ولا يمكن تكرارها.":"Original attempt retained; duplicate dispatch blocked."));
  }catch(e){const message=e instanceof Error?e.message:"ORDER_ERROR";setError(message);
   // A failed order POST may still have reached Recharge: always hold.
   {
    setUncertain(true);
    try{const pending=await jsonRequest(api+"?view=outstanding-intent");
     const i=pending.intent as {intentId:string;externalRef:string;idempotencyKey:string}|null;
     if(i){setIntentId(i.intentId);setExternalRef(i.externalRef);setOrderKey(i.idempotencyKey);}
    }catch{/* fail closed until recovery endpoint is available */}
   }
  }finally{setBusy(false);}
 }
 async function refreshOrder(){
  if(!order)return;setBusy(true);setError("");setSourceReview(null);
  try{setOrder(await jsonRequest(api+"?view=order&id="+encodeURIComponent(order.rechargeOrderId)) as unknown as Order);}
  catch(e){setError(e instanceof Error?e.message:"ORDER_READ_ERROR");}finally{setBusy(false);}
 }
 async function cancelOrder(){
  if(!order||order.state!=="PENDING")return;setBusy(true);setError("");
  try{setOrder(await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({action:"cancel",rechargeOrderId:order.rechargeOrderId,
    idempotencyKey:"cancel-"+order.rechargeOrderId})}) as unknown as Order);}
  catch(e){setError(e instanceof Error?e.message:"CANCEL_FAILED");}finally{setBusy(false);}
 }
 async function collectSynthetic(){
  if(!order||!syntheticConfirmed||["CANCELLED","FAILED"].includes(order.state))return;
  setBusy(true);setError("");
  try{
   const value=await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"collect",rechargeOrderId:order.rechargeOrderId})});
   setReceipt(value as unknown as {invoiceId:string;receiptId:string;amountMinor:number;currency:string;replayed:boolean});
   setNotice(ar?"تم تسجيل فاتورة وإيصال وتحصيل وهميين داخل Mobi فقط.":"Synthetic Mobi invoice, receipt and cash entry recorded.");
  }catch(e){setError(e instanceof Error?e.message:"COLLECTION_ERROR");}finally{setBusy(false);}
 }
 async function requestSyntheticRefund(){
  if(!order||!receipt||!["FAILED","CANCELLED"].includes(order.state)||
     !refundConfirmed||refundMfaCode.trim().length<6||refundResult)return;
  setBusy(true);setError("");setNotice("");
  try{
   const result=await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"refund",rechargeOrderId:order.rechargeOrderId,
     acknowledgeSandbox:true,mfaCode:refundMfaCode.trim()})});
   setRefundResult(result as unknown as {refundId:string;amountMinor:number;currency:string;replayed:boolean});
   setNotice(ar?"أُثبت استرداد تجريبي واحد بعد التحقق من الصلاحيات والعامل الثاني.":"Single synthetic refund recorded after authorization and MFA step-up.");
  }catch(e){setError(e instanceof Error?e.message:"REFUND_FAILED");}
  finally{setRefundMfaCode("");setBusy(false);}
 }
 async function inspectSourceOrder(){
  if(!reviewAllowed||!order)return;
  setBusy(true);setError("");
  try{
   setSourceReview(await jsonRequest(api+"?view=source-order&id="+encodeURIComponent(order.rechargeOrderId)) as unknown as SourceReview);
  }catch(e){setError(e instanceof Error?e.message:"SOURCE_REVIEW_FAILED");}
  finally{setBusy(false);}
 }
 async function inspectDeadLetters(){
  if(!reviewAllowed)return;
  setBusy(true);setError("");
  try{setDeadLetters(await jsonRequest(api+"?view=dead-letters&limit=50") as unknown as DeadLetters);}
  catch(e){setError(e instanceof Error?e.message:"DLQ_REVIEW_FAILED");}
  finally{setBusy(false);}
 }
 async function inspectAllEvents(){
  if(!reviewAllowed)return;
  setBusy(true);setError("");
  try{setScanReport(await jsonRequest(api+"?view=reconcile") as unknown as ScanReport);}
  catch(e){setError(e instanceof Error?e.message:"RECONCILIATION_FAILED");}
  finally{setBusy(false);}
 }
 async function replay(){
  if(!reviewAllowed)return;
  setBusy(true);setError("");
  try{
   const body=await jsonRequest(api+"?view=events&cursor="+encodeURIComponent(cursor));
   setEvents((body.items as typeof events)??[]);setCursor(String(body.nextCursor??cursor));
  }catch(e){setError(e instanceof Error?e.message:"REPLAY_FAILED");}finally{setBusy(false);}
 }
 const filtered=items.filter(x=>family==="ALL"||x.sku.toUpperCase().includes(family));
 const selected=items.find(x=>x.sku===sku);
 return <section className="activity-card" aria-label={ar?"التعبئة التجريبية عبر Recharge":"Recharge sandbox integration"}
  dir={ar?"rtl":"ltr"}>
  <h2>{ar?"A1 Recharge — تجربة الربط":"A1 Recharge — integration sandbox"}</h2>
  <p className="module-sub">{ar?
   "بيئة تجريبية فقط: لا يحدث شحن حقيقي. اختبار تحصيل افتراضي داخل قاعدة Mobi المعزولة يتطلب تأكيدًا يدويًا منفصلًا.":
   "Sandbox only: no carrier fulfillment. Synthetic Mobi cash acceptance requires separate explicit confirmation."}</p>
  <div className="mobi-topup-two">
   <label>{ar?"المشغّل":"Operator"}
    <select value={operator} disabled={uncertain} onChange={e=>{setOperator(e.target.value);setItems([]);setQuote(null);setOrder(null);setOrderKey("");setExternalRef("");}}> 
     <option value="alfa">alfa</option><option value="touch">touch</option>
    </select>
   </label>
   <label>{ar?"الفئة":"Service family"}
    <select value={family} disabled={uncertain} onChange={e=>{setFamily(e.target.value);setSku("");setQuote(null);setOrderKey("");setExternalRef("");}}> 
     {["ALL","DAYS","DOLLARS","CARD","USHARE","INTERNET"].map(x=><option key={x} value={x}>{x}</option>)}
    </select>
   </label>
  </div>
  <button type="button" className="primary" onClick={()=>void loadCatalog()} disabled={busy||uncertain||!intentChecked}>
   {ar?"قراءة الخدمات المتاحة":"Load available services"}
  </button>
  <label>{ar?"الباقة المعتمدة":"Verified package"}
   <select value={sku} disabled={uncertain} onChange={e=>{setSku(e.target.value);setQuote(null);setOrder(null);setOrderKey("");setExternalRef("");}}> 
    <option value="">{ar?"اختر باقة":"Choose package"}</option>
    {filtered.map(x=><option key={x.sku} value={x.sku}>{x.sku} · {money(x.priceMinor,x.currency)}</option>)}
   </select>
  </label>
  {selected&&<p className="module-sub">{ar?"الإصدار":"Catalog version"}: {selected.catalogVersionId}
   {" · "}{ar?"السعر":"Price"}: {money(selected.priceMinor,selected.currency)}
   {costAllowed&&typeof selected.costMinor==="number"&&<> · {ar?"تكلفة المورّد":"Supplier cost"}: {money(selected.costMinor,selected.currency)}</>}</p>}
  <button type="button" className="primary" onClick={()=>void requestQuote()} disabled={busy||!sku||uncertain}>
   {ar?"طلب عرض سعر ثابت":"Request immutable quote"}
  </button>
  {quote&&<div className="module-banner">
   <p>{ar?"عرض السعر":"Quote"}: {quote.quoteId}</p>
   <p>{ar?"السعر":"Price"}: {money(quote.priceMinor,quote.currency)} ·
    {ar?" الرسوم":" Fees"}: {money(quote.feeMinor,quote.currency)} ·
    {ar?" الضريبة":" Tax"}: {money(quote.taxMinor,quote.currency)}</p>
   <strong>{ar?"الإجمالي":"Total"}: {money(quote.totalMinor,quote.currency)}</strong>
   <p>{ar?"صالح حتى":"Expires"}: {new Date(quote.expiresAt).toLocaleString(ar?"ar-LB":"en-US")}</p>
  </div>}
  {quote&&!order&&<form onSubmit={e=>void placeOrder(e)}>
   <label>{ar?"مستفيد تجريبي فقط":"Synthetic test recipient"}
    <input value={recipient} onChange={e=>setRecipient(e.target.value)} required minLength={3} maxLength={80}
      placeholder="test-number-001" autoComplete="off"/>
   </label>
   <button className="primary" type="submit" disabled={busy||uncertain}>
    {ar?"تأكيد طلب تجريبي بانتظار التنفيذ":"Confirm synthetic pending order"}
   </button>
  </form>}
  {order&&<div className="module-banner" role="status">
   <p>{ar?"رقم الطلب":"Order ID"}: <span dir="ltr">{order.rechargeOrderId}</span></p>
   <p>{ar?"الحالة":"State"}: {order.state} · {ar?"الإصدار":"Version"}: {order.version}</p>
   <button type="button" onClick={()=>void refreshOrder()} disabled={busy}>{ar?"فحص الحالة":"Check status"}</button>
   {reviewAllowed&&order.state==="PENDING"&&<button type="button" onClick={()=>void cancelOrder()} disabled={busy}>
    {ar?"طلب إلغاء — للمشرف فقط":"Cancel pending — supervisor only"}</button>}
  </div>}
  {cashAllowed&&order&&!["CANCELLED","FAILED"].includes(order.state)&&<div className="activity-card">
    <label className="mobi-topup-check"><input type="checkbox" checked={syntheticConfirmed}
      onChange={e=>setSyntheticConfirmed(e.target.checked)}/>
      {ar?"أؤكد أن هذا اختبار تحصيل وهمي داخل قاعدة G5، وليس قبضًا حقيقيًا.":"I confirm this is an isolated G5 synthetic cash test, not a real customer payment."}
    </label>
    <button type="button" className="primary" disabled={busy||!syntheticConfirmed}
      onClick={()=>void collectSynthetic()}>
      {ar?"تسجيل فاتورة وإيصال تجريبيين في Mobi":"Create synthetic Mobi invoice and receipt"}
    </button>
  </div>}
  {receipt&&<div className="module-banner" role="status">
   <strong>{ar?"فاتورة وايصال تجريبيان في Mobi فقط":"Mobi synthetic invoice and receipt only"}</strong>
   <p>{ar?"رقم الفاتورة":"Invoice ID"}: <span dir="ltr">{receipt.invoiceId}</span></p>
   <p>{ar?"رقم الإيصال":"Receipt ID"}: <span dir="ltr">{receipt.receiptId}</span></p>
   <p>{ar?"القيمة":"Amount"}: {money(receipt.amountMinor,receipt.currency)} · {receipt.replayed?(ar?"استرجاع دون تكرار":"Replayed without duplicate"):(ar?"قُيّدت مرة واحدة":"Posted once")}</p>
  </div>}
  {reviewAllowed&&cashAllowed&&receipt&&order&&["FAILED","CANCELLED"].includes(order.state)&&!refundResult&&
   <div className="activity-card" aria-label={ar?"استرداد تجريبي بإذن المدير":"Manager-authorized sandbox refund"}>
    <p className="module-sub">{ar?
     "استرداد تجريبي فقط لحالة FAILED أو CANCELLED بعد إثبات التحصيل السابق. يتطلب مديرًا مخولًا بالصندوق وMFA مُفعّلًا. لا تسترد نقدًا حقيقيًا.":"Synthetic FAILED/CANCELLED reversal of an already-collected test order. Requires manager, cashier permission and enrolled MFA. No real customer funds."}</p>
    <label className="mobi-topup-check"><input type="checkbox" checked={refundConfirmed}
      onChange={e=>setRefundConfirmed(e.target.checked)}/>
      {ar?"أؤكد أن الاسترداد وهمي وعلى طلب الاختبار هذا فقط.":"I confirm this is a test-only reversal for this exact order."}
    </label>
    <label>{ar?"رمز التحقق الثنائي أو رمز الاسترداد الأحادي":"One-time MFA or recovery code"}
      <input type="password" value={refundMfaCode} autoComplete="one-time-code"
       onChange={e=>setRefundMfaCode(e.target.value)} minLength={6} maxLength={64}/>
    </label>
    <button type="button" className="primary" disabled={busy||!refundConfirmed||refundMfaCode.trim().length<6}
      onClick={()=>void requestSyntheticRefund()}>{ar?"تنفيذ استرداد تجريبي مصرح":"Authorize synthetic refund"}</button>
   </div>}
  {refundResult&&<div className="module-banner" role="status">
    <strong>{ar?"الاسترداد التجريبي مسجّل":"Synthetic reversal recorded"}</strong>
    <p>{ar?"معرّف الاسترداد":"Refund ID"}: <span dir="ltr">{refundResult.refundId}</span></p>
    <p>{ar?"القيمة":"Amount"}: {money(refundResult.amountMinor,refundResult.currency)}</p>
    <p>{refundResult.replayed?(ar?"إعادة دون تكرار":"Idempotent replay"):(ar?"قيد عكسي واحد":"One reversal entry")}</p>
   </div>}
  {uncertain&&<p role="alert">{ar?
   "نتيجة الطلب غير مؤكدة. لا تُنشئ طلبًا آخر أو مفتاحًا جديدًا؛ اطلب المصالحة برقم المرجع الأصلي.":
   "Outcome unknown. Do not create a new order or idempotency key; reconcile with the original reference."}
   {" "}<span dir="ltr">{externalRef}</span>
   {intentId&&<button type="button" disabled={busy} onClick={()=>void checkOriginalIntent()}>
    {ar?"فحص المحاولة الأصلية":"Recheck original attempt"}</button>}
  </p>}
  {reviewAllowed&&<section className="activity-card" aria-label={ar?"مراجعة مصدر Recharge":"Recharge source review"}>
   <h3>{ar?"المصالحة والمراجعة — للمدير":"Reconciliation & review — manager"}</h3>
   <p className="module-sub">{ar?
    "قراءة فقط من Recharge ومن صندوق الوارد في Mobi. لا تعيد إرسال Webhooks ولا تعدّل الأموال أو أحداث DEAD.":
    "Read-only Recharge and Mobi inbox review. Never retries webhooks, acknowledges DEAD, or posts funds."}</p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
    <button type="button" disabled={busy||!order} onClick={()=>void inspectSourceOrder()}>
     {ar?"فحص دليل الطلب من Recharge":"Inspect source order evidence"}</button>
    <button type="button" disabled={busy} onClick={()=>void inspectAllEvents()}>
     {ar?"مطابقة كل الصفحات":"Reconcile all source pages"}</button>
    <button type="button" disabled={busy} onClick={()=>void inspectDeadLetters()}>
     {ar?"عرض الأحداث المعلّقة DEAD":"Inspect held DEAD events"}</button>
    <button type="button" disabled={busy} onClick={()=>void replay()}>
     {ar?"قراءة صفحة الأحداث":"Read an event page"}</button>
   </div>
   {sourceReview&&<div className="module-banner" role="status">
    <p>{ar?"الطلب":"Order"}: <span dir="ltr">{sourceReview.rechargeOrderId}</span> · {sourceReview.state} · v{sourceReview.version}</p>
    <p>{ar?"الأحداث":"Events"}: {sourceReview.events.length} ·
     {ar?"الأحداث مسلّمة للنظام":"Transport delivered"}: {String(sourceReview.transport.allDelivered)}</p>
    <p>{ar?"مراجعة تشغيلية مطلوبة":"Needs operator review"}: {String(sourceReview.transport.needsOperatorReview)} ·
     {ar?"إثبات تنفيذ مشغّل حقيقي":"Real carrier confirmation"}: {String(sourceReview.transport.fulfillmentConfirmedByCarrier)}</p>
    <p>{ar?"دليل المزوّد":"Provider evidence"}: {sourceReview.providerEvidence}</p>
    {costAllowed&&sourceReview.supplierEntries.length>0&&<p>{ar?"قيود مورّد تجريبية لدى Recharge":"Recharge sandbox supplier entries"}:
     {" "}{sourceReview.supplierEntries.map(x=>x.kind+" "+money(x.amountMinor,x.currency)).join(" · ")}</p>}
   </div>}
   {scanReport&&<div className="module-banner" role="status">
    <p>{ar?"نتيجة المطابقة":"Reconciliation status"}: {scanReport.status}</p>
    <p>{ar?"الصفحات":"Pages"}: {scanReport.pagesScanned} · {ar?"الأحداث":"Events"}: {scanReport.sourceEventsScanned}</p>
    <p>{ar?"أحداث مفقودة":"Missing"}: {scanReport.missingEventIds.length} ·
     {ar?"تعارضات":"Conflicts"}: {scanReport.conflictingEventIds.length+scanReport.conflictingVersionOrderIds.length} ·
     {ar?"فجوات الإصدارات":"Version gaps"}: {scanReport.versionGapOrderIds.length}</p>
    {!scanReport.sourceExhausted&&<p role="alert">{ar?"لم تنتهِ قراءة جميع الأحداث؛ لا تعتمد اكتمال المطابقة.":"Not all source pages were read; do not declare complete reconciliation."}</p>}
   </div>}
   {deadLetters&&<div className="module-banner" role="status">
    <p>{ar?"أحداث DEAD محفوظة للمراجعة":"Held DEAD events"}: {deadLetters.items.length}</p>
    <p>{ar?"الحالة الرقابية: لا إعادة إرسال ولا إقرار ولا قيود مالية.":"Review hold: no replay, no ACK and no financial posting."}</p>
    <ul>{deadLetters.items.map(x=><li key={x.eventId}>
     <span dir="ltr">{x.eventId}</span> · v{x.version} · {x.lastError??"DEAD"}
    </li>)}</ul>
   </div>}
   {events.length>0&&<ul>{events.map(x=><li key={x.eventId}>{x.eventId} · {x.state} · v{x.version}</li>)}</ul>}
  </section>}
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert" className="preview-notice">{error}</p>}
 </section>;
}
