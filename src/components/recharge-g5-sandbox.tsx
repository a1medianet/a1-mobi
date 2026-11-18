"use client";
import {useState,type FormEvent} from "react";

type CatalogItem={sku:string;operator:string;country:string;catalogVersionId:string;currency:string;
 priceMinor:number;feeMinor:number;taxMinor:number;costMinor?:number};
type Quote={quoteId:string;catalogVersionId:string;currency:string;priceMinor:number;
 feeMinor:number;taxMinor:number;totalMinor:number;expiresAt:number};
type Order={rechargeOrderId:string;state:string;version:number;requiresReconciliation?:boolean};
const money=(minor:number,currency:string)=>new Intl.NumberFormat("en-US",{
 style:"currency",currency,maximumFractionDigits:currency==="LBP"?0:2,
}).format(minor/(currency==="LBP"?1:100));
async function jsonRequest(url:string,init?:RequestInit){
 const response=await fetch(url,{...init,cache:"no-store"});
 const body=await response.json() as Record<string,unknown>;
 if(!response.ok)throw new Error(String(body.error??"REQUEST_FAILED"));
 return body;
}
export default function RechargeG5Sandbox({locale}:{locale:"ar"|"en"}){
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
 const [orderKey,setOrderKey]=useState(""),[externalRef,setExternalRef]=useState("");
 const [cursor,setCursor]=useState("0"),[events,setEvents]=useState<Array<{eventId:string;state:string;version:number}>>([]);
 const api="/api/ops/recharge-bridge";
 async function loadCatalog(){
  setBusy(true);setError("");setNotice("");setQuote(null);setOrder(null);setSku("");setUncertain(false);setReceipt(null);setSyntheticConfirmed(false);setRefundConfirmed(false);setRefundMfaCode("");setRefundResult(null);
  try{
   const body=await jsonRequest(api+"?view=catalog&country=LB&operator="+encodeURIComponent(operator));
   setItems((body.items as CatalogItem[]??[]).filter(x=>x.country==="LB"&&x.operator===operator));
  }catch(e){setError(e instanceof Error?e.message:"CATALOG_ERROR");}finally{setBusy(false);}
 }
 async function requestQuote(){
  if(!sku)return;setBusy(true);setError("");setNotice("");setOrder(null);setReceipt(null);setSyntheticConfirmed(false);setRefundConfirmed(false);setRefundMfaCode("");setRefundResult(null);
  try{
   const body=await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"quote",country:"LB",operator,sku,quantity:1,idempotencyKey:crypto.randomUUID()})});
   setQuote(body as unknown as Quote);
  }catch(e){setQuote(null);setError(e instanceof Error?e.message:"QUOTE_ERROR");}
  finally{setBusy(false);}
 }
 async function placeOrder(e:FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!quote||Date.now()>=quote.expiresAt||!recipient.trim()||uncertain)return;
  setBusy(true);setError("");setNotice("");
  const key=orderKey||crypto.randomUUID(),reference=externalRef||"mobi-g5-test-ref-"+crypto.randomUUID();
  setOrderKey(key);setExternalRef(reference);
  try{
   const body=await jsonRequest(api,{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({action:"order",quoteId:quote.quoteId,recipient,externalRef:reference,idempotencyKey:key})});
   setOrder(body as unknown as Order);setNotice(ar?"تم إنشاء طلب تجريبي بانتظار التنفيذ فقط.":"Synthetic order created; awaiting fulfillment.");
  }catch(e){const message=e instanceof Error?e.message:"ORDER_ERROR";setError(message);
   if(message==="RECHARGE_OUTCOME_UNKNOWN"||message==="OUTCOME_UNKNOWN")setUncertain(true);
  }finally{setBusy(false);}
 }
 async function refreshOrder(){
  if(!order)return;setBusy(true);setError("");
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
 async function replay(){
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
    <select value={operator} onChange={e=>{setOperator(e.target.value);setItems([]);setQuote(null);setOrder(null);}}>
     <option value="alfa">alfa</option><option value="touch">touch</option>
    </select>
   </label>
   <label>{ar?"الفئة":"Service family"}
    <select value={family} onChange={e=>{setFamily(e.target.value);setSku("");setQuote(null);}}>
     {["ALL","DAYS","DOLLARS","CARD","USHARE","INTERNET"].map(x=><option key={x} value={x}>{x}</option>)}
    </select>
   </label>
  </div>
  <button type="button" className="primary" onClick={()=>void loadCatalog()} disabled={busy}>
   {ar?"قراءة الخدمات المتاحة":"Load available services"}
  </button>
  <label>{ar?"الباقة المعتمدة":"Verified package"}
   <select value={sku} onChange={e=>{setSku(e.target.value);setQuote(null);setOrder(null);}}>
    <option value="">{ar?"اختر باقة":"Choose package"}</option>
    {filtered.map(x=><option key={x.sku} value={x.sku}>{x.sku} · {money(x.priceMinor,x.currency)}</option>)}
   </select>
  </label>
  {selected&&<p className="module-sub">{ar?"الإصدار":"Catalog version"}: {selected.catalogVersionId}
   {" · "}{ar?"السعر":"Price"}: {money(selected.priceMinor,selected.currency)}</p>}
  <button type="button" className="primary" onClick={()=>void requestQuote()} disabled={busy||!sku}>
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
   {order.state==="PENDING"&&<button type="button" onClick={()=>void cancelOrder()} disabled={busy}>
    {ar?"طلب إلغاء — للمشرف فقط":"Cancel pending — supervisor only"}</button>}
  </div>}
  {order&&!["CANCELLED","FAILED"].includes(order.state)&&<div className="activity-card">
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
  {receipt&&order&&["FAILED","CANCELLED"].includes(order.state)&&!refundResult&&
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
   {" "}<span dir="ltr">{externalRef}</span></p>}
  <p className="module-sub">{ar?"مراجعة الأحداث — المدير فقط":"Reconcile events — manager only"}</p>
  <button type="button" disabled={busy} onClick={()=>void replay()}>{ar?"استرجاع الأحداث":"Replay events"}</button>
  {events.length>0&&<ul>{events.map(x=><li key={x.eventId}>{x.eventId} · {x.state} · v{x.version}</li>)}</ul>}
  {notice&&<p role="status">{notice}</p>}
  {error&&<p role="alert" className="preview-notice">{error}</p>}
 </section>;
}
