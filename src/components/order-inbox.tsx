"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
type WebOrder={id:string;number:string;customerName:string;customerPhone:string;customerNote:string|null;status:string;items:unknown;totalAmount:number;currency:string;createdAt:string};
type ResponseData={branchName:string;slug:string|null;enabled:boolean;orders:WebOrder[]};
export function OrderInbox({locale}:{locale:"ar"|"en"}){
 const ar=locale==="ar";
 const [data,setData]=useState<ResponseData|null>(null);
 const [error,setError]=useState("");
 const [busy,setBusy]=useState("");
 const [copied,setCopied]=useState(false);
 async function load(){
  try{
   const res=await fetch("/api/ops/store-orders",{cache:"no-store"});
   if(!res.ok)throw new Error("UNAVAILABLE");
   setData(await res.json());setError("");
  }catch{setError(ar?"خدمة الطلبات غير مفعلة لهذه التجربة.":"Order inbox is not available for this pilot.");}
 }
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/ops/store-orders",{cache:"no-store",signal:controller.signal})
   .then(async res=>{if(!res.ok)throw new Error("UNAVAILABLE");return res.json();})
   .then(result=>{if(!controller.signal.aborted){setData(result);setError("");}})
   .catch(()=>{if(!controller.signal.aborted)setError(ar?"خدمة الطلبات غير مفعلة لهذه التجربة.":"Order inbox is not available for this pilot.");});
  return ()=>controller.abort();
 },[ar]);
 async function action(body:unknown,key:string){
  setBusy(key);setError("");
  try{
   const res=await fetch("/api/ops/store-orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   if(!res.ok)throw new Error("FAILED");
   await load();
  }catch{setError(ar?"لم تكتمل العملية. حاول مجددًا بعد تحديث الصفحة.":"Action not completed. Refresh and retry.");}
  finally{setBusy("");}
 }
 const url=data?.slug?(typeof window!=="undefined"?window.location.origin:"")+"/shop/"+data.slug:"";
 const statusLabel=(status:string)=>({NEW:ar?"جديد":"New",CONFIRMED:ar?"تم التأكيد":"Confirmed",
  DECLINED:ar?"مرفوض":"Declined",CLOSED:ar?"تمت المعالجة":"Handled"}[status]??status);
 return <section className="mobi-order-inbox" lang={locale} dir={ar?"rtl":"ltr"}>
  <header><span>{ar?"طلبات زبائن المتجر":"Customer requests"}</span>
   <h1>{ar?"كل طلب يصل إلى هنا":"Every customer request in one place"}</h1>
   <p>{ar?"تأكيد الطلب لا ينفّذ بيعًا أو يحجز مخزونًا. سجّل البيع عند الاستلام من نقطة البيع.":"Confirming a request does not create a sale or reserve inventory. Complete sales in POS."}</p>
  </header>
  {error&&<p role="alert" className="mobi-order-alert">{error}</p>}
  {!data?<p>{ar?"جارٍ تحميل الطلبات…":"Loading requests…"}</p>:<>
   <div className="mobi-order-inbox-config">
    <div><strong>{data.branchName}</strong>
     <p>{data.enabled?(ar?"المتجر يستقبل طلبات جديدة":"Accepting requests"):(ar?"استقبال الطلبات متوقف":"Requests paused")}</p>
     {url&&<p className="mobi-order-link" dir="ltr">{url}</p>}
    </div>
    <div className="mobi-order-inbox-actions">
     <button type="button" disabled={!!busy} onClick={()=>void action({action:data.enabled?"disable":"activate"},"toggle")}>
      {data.enabled?(ar?"إيقاف استقبال الطلبات":"Pause requests"):(ar?"تفعيل رابط طلبات المتجر":"Enable store link")}
     </button>
     {url&&<button type="button" onClick={()=>{void navigator.clipboard.writeText(url).then(()=>setCopied(true)).catch(()=>setError(ar?"تعذّر نسخ الرابط":"Could not copy link"));}}>
      {copied?(ar?"تم نسخ الرابط":"Copied"):(ar?"نسخ رابط المتجر":"Copy store link")}
     </button>}
    </div>
   </div>
   <div className="mobi-order-inbox-tools"><strong>{ar?"الطلبات المستلمة":"Received requests"} ({data.orders.length})</strong>
    <button type="button" onClick={()=>void load()}>{ar?"تحديث":"Refresh"}</button>
   </div>
   {!data.orders.length?<p className="mobi-order-empty">{ar?"لا توجد طلبات حتى الآن. عند إرسال الزبون طلبًا من رابط المتجر سيظهر هنا.":"No requests yet. Customer requests from the store link will appear here."}</p>:
   <div className="mobi-order-cards">{data.orders.map(order=><article key={order.id}>
    <div className="mobi-order-card-title"><strong dir="ltr">{order.number}</strong><span>{statusLabel(order.status)}</span></div>
    <p><strong>{order.customerName}</strong> · <a href={"tel:"+order.customerPhone} dir="ltr">{order.customerPhone}</a></p>
    <small>{new Date(order.createdAt).toLocaleString(ar?"ar-LB":"en-US")}</small>
    <ul>{Array.isArray(order.items)&&order.items.map((item,index)=>{
     const line=item as {nameAr?:string;nameEn?:string;quantity?:number;lineTotal?:number};
     return <li key={index}>{ar?line.nameAr:line.nameEn} × {line.quantity} <b dir="ltr">{"$"+Number(line.lineTotal||0).toFixed(2)}</b></li>;
    })}</ul>
    {order.customerNote&&<p className="mobi-order-customer-note">{order.customerNote}</p>}
    <p>{ar?"المجموع المطلوب":"Requested total"}: <strong dir="ltr">{"$"+order.totalAmount.toFixed(2)}</strong></p>
    <div className="mobi-order-inbox-actions">
     {order.status==="NEW"&&<><button disabled={!!busy} onClick={()=>void action({action:"setStatus",id:order.id,status:"CONFIRMED"},order.id)}>{ar?"تأكيد مع الزبون":"Confirm with customer"}</button>
      <button disabled={!!busy} className="secondary" onClick={()=>void action({action:"setStatus",id:order.id,status:"DECLINED"},order.id)}>{ar?"اعتذار عن الطلب":"Decline request"}</button></>}
     {order.status==="CONFIRMED"&&<>
      <Link className="mobi-order-pos-link" href={"/"+locale+"/pos"}>{ar?"فتح نقطة البيع لإتمام المعاملة":"Open POS to complete sale"}</Link>
      <button disabled={!!busy} onClick={()=>void action({action:"setStatus",id:order.id,status:"CLOSED"},order.id)}>{ar?"تمت المعالجة خارج الطلب":"Mark handled"}</button>
     </>}
    </div>
   </article>)}</div>}
  </>}
 </section>;
}
