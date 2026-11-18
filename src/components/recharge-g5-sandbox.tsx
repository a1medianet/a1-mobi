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
 const [error,setError]=useState(""),[notice,setNotice]=useState("");
 const [uncertain,setUncertain]=useState(false);
 const [orderKey,setOrderKey]=useState(""),[externalRef,setExternalRef]=useState("");
 const [cursor,setCursor]=useState("0"),[events,setEvents]=useState<Array<{eventId:string;state:string;version:number}>>([]);
 const api="/api/ops/recharge-bridge";
 async function loadCatalog(){
  setBusy(true);setError("");setNotice("");setQuote(null);setOrder(null);setSku("");setUncertain(false);
  try{
   const body=await jsonRequest(api+"?view=catalog&country=LB&operator="+encodeURIComponent(operator));
   setItems((body.items as CatalogItem[]??[]).filter(x=>x.country==="LB"&&x.operator===operator));
  }catch(e){setError(e instanceof Error?e.message:"CATALOG_ERROR");}finally{setBusy(false);}
 }
 async function requestQuote(){
  if(!sku)return;setBusy(true);setError("");setNotice("");setOrder(null);
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
  const key=orderKey||crypto.randomUUID(),reference=externalRef||"mobi-sandbox-"+crypto.randomUUID();
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
   "بيئة تجريبية فقط: هذه الطلبات لا تنفّذ شحنًا حقيقيًا ولا تحصّل مالًا ولا تنشئ إيصالًا في الصندوق.":
   "Sandbox only: no carrier fulfillment, payment collection, cashier entry or receipt is created."}</p>
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
   <button className="primary" type="submit" disabled={busy||uncertain||Date.now()>=quote.expiresAt}>
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
