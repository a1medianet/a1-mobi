"use client";
import {useState,type FormEvent} from "react";

type Stock={id:string;status:string;product:{sku:string;nameAr:string;nameEn:string};stockLocation:{name:string}|null};
type CustomerDevice={id:string;description:string;customer:{id:string;name:string;phone:string}};
type Incident={id:string;status:string;imeiLast4:string;reportedAt:string;closedAt:string|null};
type Result={searched:true;imeiLast4:string;inventory:Stock[];customers:CustomerDevice[];reports:Incident[];externalRegistryChecked:false};

export default function ImeiStorePanel({locale}:{locale:"ar"|"en"}){
 const ar=locale==="ar";
 const [imei,setImei]=useState(""),[data,setData]=useState<Result|null>(null);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(""),[failed,setFailed]=useState(false);
 async function send(payload:unknown){
   const result=await fetch("/api/ops/imei",{
     method:"POST",headers:{"content-type":"application/json"},
     credentials:"same-origin",cache:"no-store",body:JSON.stringify(payload),
   });
   const body=await result.json();
   if(!result.ok)throw Error(String(body.error??result.status));
   return body;
 }
 async function lookup(event?:FormEvent){
   event?.preventDefault();
   setBusy(true);setMessage("");setFailed(false);
   try{
     const result=await send({action:"lookup",imei:imei.trim()}) as Result;
     setData(result);
   }catch(error){
     setData(null);setFailed(true);
     setMessage((ar?"تعذّر إجراء البحث: ":"Lookup failed: ")+(error instanceof Error?error.message:""));
   }finally{setBusy(false);}
 }
 async function report(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(busy)return;
   const fields=new FormData(event.currentTarget);
   setBusy(true);setFailed(false);setMessage("");
   try{
     await send({action:"reportLoss",imei:imei.trim(),customerPhone:String(fields.get("phone")??""),
       evidenceReference:String(fields.get("proof")??""),kind:String(fields.get("kind")??"LOST"),
       confirmed:true});
     setMessage(ar?"تم إنشاء بلاغ داخلي قيد مراجعة الملكية؛ لم يُنشر كجهاز مسروق.":"An internal report is awaiting ownership review; no public stolen-device claim was made.");
     const result=await send({action:"lookup",imei:imei.trim()}) as Result;
     setData(result);
   }catch(error){
     setFailed(true);
     const code=error instanceof Error?error.message:"";
     setMessage(code==="CUSTOMER_NOT_FOUND_IN_BRANCH"
       ?(ar?"العميل غير مسجل في هذا الفرع. سجّله من صفحة العملاء أولًا.":"Register this customer in the branch first.")
       :(ar?"لم يُنشأ البلاغ: "+code:"Report was not created: "+code));
   }finally{setBusy(false);}
 }
 async function close(reportId:string){
   const reason=ar?"تم العثور على الجهاز، وإغلاق البلاغ بناء على مراجعة موظف المتجر":"Device located; incident closed after staff review";
   setBusy(true);setFailed(false);setMessage("");
   try{
     await send({action:"closeReport",reportId,reason,confirmed:true});
     setMessage(ar?"أُغلق البلاغ وسُجل في سجل التدقيق.":"Report closed and audited.");
     const result=await send({action:"lookup",imei:imei.trim()}) as Result;
     setData(result);
   }catch(error){
     setFailed(true);setMessage((ar?"تعذّر إغلاق البلاغ: ":"Could not close report: ")+(error instanceof Error?error.message:""));
   }finally{setBusy(false);}
 }
 return <section className="activity-card" style={{marginBlock:"16px"}} dir={ar?"rtl":"ltr"}>
   <h2 style={{fontSize:"1.15rem",marginBlock:"0 8px"}}>{ar?"البحث عن جهاز في المتجر وبلاغات الفقدان":"Store device lookup & missing-device reports"}</h2>
   <p style={{marginBlock:"0 12px",fontSize:".85rem",color:"#526174"}}>
     {ar?"البحث داخل مخزون الفرع والأجهزة المرتبطة بعملائه فقط. لا يُجرى فحص لقواعد الشرطة أو الشركات المصنعة.":"Search this branch's stock and registered customer devices only. No police or manufacturer registry is checked."}
   </p>
   <form onSubmit={event=>void lookup(event)}>
     <label htmlFor="mobi-stock-imei">{ar?"رقم IMEI":"IMEI"}</label>
     <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:5}}>
       <input id="mobi-stock-imei" inputMode="numeric" value={imei}
          onChange={event=>{setImei(event.target.value);setData(null);setMessage("");}}
          placeholder="15 digits" dir="ltr" required style={{flex:"1 1 220px"}}/>
       <button className="primary" type="submit" disabled={busy||imei.trim().length<15}>
         {ar?"بحث في المخزون":"Find in stock"}</button>
     </div>
   </form>
   {message&&<p role={failed?"alert":"status"} style={{marginTop:10}}>{message}</p>}
   {data&&<div aria-live="polite" style={{marginTop:16}}>
     <p><strong>{ar?"النتائج الداخلية":"Internal results"}</strong> — {ar?"آخر 4 أرقام":"Last 4 digits"} <bdi dir="ltr">{data.imeiLast4}</bdi></p>
     <p>{ar?"المخزون: ":"Stock: "}<strong>{data.inventory.length}</strong> · {ar?"أجهزة العملاء: ":"Customer devices: "}<strong>{data.customers.length}</strong></p>
     {data.inventory.map(device=><p key={device.id}>
       {ar?device.product.nameAr:device.product.nameEn} — <bdi dir="ltr">{device.product.sku}</bdi> — {device.status}
       {device.stockLocation?.name?" · "+device.stockLocation.name:""}
     </p>)}
     {data.customers.map(link=><p key={link.id}>
       {ar?"ملف العميل: ":"Customer: "}<strong>{link.customer.name}</strong>
       {" · "}<bdi dir="ltr">{link.customer.phone}</bdi> — {link.description}
     </p>)}
     {!data.inventory.length&&!data.customers.length&&<p>{ar?"لا يوجد هذا الجهاز في سجلات هذا الفرع. عدم وجوده لا يعني سلامته أو عدم سرقته.":"Not in this branch's records. This is not proof a device is clear or not stolen."}</p>}
     {data.reports.map(report=><p key={report.id}>
       {ar?"بلاغ داخلي: ":"Internal report: "}<strong>{report.status}</strong>
       {report.status!=="CLOSED"&&report.status!=="RETURNED"&&<button type="button" disabled={busy}
         className="soft-btn" style={{marginInlineStart:10}}
         onClick={()=>void close(report.id)}>{ar?"إغلاق بعد العثور عليه":"Close after recovery"}</button>}
     </p>)}
   </div>}
   <details style={{marginTop:18}}>
     <summary style={{cursor:"pointer",fontWeight:700}}>
       {ar?"تسجيل جهاز مفقود / مسروق للمراجعة":"Submit missing / stolen-device report for review"}</summary>
     <p style={{fontSize:".85rem",marginBlock:10}}>
       {ar?"لا يُدرج البلاغ في أي قائمة سوداء عامة. يجب تسجيل العميل أولًا وتقديم مرجع يثبت ملكيته.":"No public blacklist entry is created. Register the customer first and supply a document reference."}
     </p>
     <form onSubmit={event=>void report(event)}>
       <label>{ar?"نوع البلاغ":"Report type"}
         <select name="kind" required defaultValue="LOST"><option value="LOST">{ar?"مفقود":"Lost"}</option>
           <option value="STOLEN">{ar?"اشتباه بالسرقة":"Suspected stolen"}</option></select>
       </label>
       <label style={{display:"block",marginBlock:"10px"}}>
         {ar?"هاتف العميل المسجل في الفرع":"Registered customer phone"}
         <input name="phone" type="tel" dir="ltr" minLength={7} maxLength={32} required/>
       </label>
       <label style={{display:"block",marginBlock:"10px"}}>
         {ar?"مرجع إثبات الملكية (فاتورة أو محضر)":"Proof reference (invoice or report)"}
         <input name="proof" minLength={6} maxLength={180} required/>
       </label>
       <button type="submit" className="primary" disabled={busy||imei.trim().length<15}>
         {ar?"تسجيل بلاغ قيد التحقق":"Submit for verification"}</button>
     </form>
   </details>
 </section>;
}
