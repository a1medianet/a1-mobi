"use client";
import { useRef, useState } from "react";
type Lookup = { saleId: string; invoiceNumber: string; locations: { id: string; name: string }[]; lines: { id: string; nameAr: string; nameEn: string; remaining: number; unitPrice: number }[] };
type Payload = { saleId: string; invoiceNumber: string; reason: string; idempotencyKey: string; lines: { originalSaleLineId: string; stockLocationId: string; quantity: number }[] };
export function SaleReturnPanel({ locale }: { locale: "ar" | "en" }) {
 const ar = locale === "ar";
 const [invoice,setInvoice]=useState(""); const [data,setData]=useState<Lookup|null>(null); const [quantities,setQuantities]=useState<Record<string,number>>({});
 const [location,setLocation]=useState(""); const [reason,setReason]=useState(""); const [busy,setBusy]=useState(false); const [locked,setLocked]=useState(false); const [message,setMessage]=useState("");
 const pending=useRef<Payload|null>(null); const inFlight=useRef(false);
 async function lookup(){
  if(inFlight.current)return; inFlight.current=true;setBusy(true);setData(null);setMessage("");setQuantities({});
  try{const response=await fetch("/api/ops/returns?invoice="+encodeURIComponent(invoice.trim()));const result=await response.json();if(!response.ok)throw new Error();setData(result);setLocation("");}
  catch{setMessage(ar?"تعذر تحميل الفاتورة؛ تحقق من الرقم والصلاحية.":"Could not load invoice; check number and permission.");}
  finally{inFlight.current=false;setBusy(false);}
 }
 async function submit(){
  if(inFlight.current||!data)return;
  const lines=data.lines.filter(line=>quantities[line.id]>0).map(line=>({originalSaleLineId:line.id,stockLocationId:location,quantity:quantities[line.id]}));
  if(!pending.current&&(!lines.length||!location||!reason.trim()||!window.confirm(ar?"تأكيد المرتجع وإعادة المخزون؟":"Confirm return and restore stock?")))return;
  pending.current??={saleId:data.saleId,invoiceNumber:data.invoiceNumber,reason:reason.trim(),lines,idempotencyKey:crypto.randomUUID()};
  inFlight.current=true;setBusy(true);setLocked(true);setMessage("");
  try{const response=await fetch("/api/ops/returns",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(pending.current)});const result=await response.json();
   if(!response.ok){if(response.status<500&&!["RETRY_SAME_REQUEST","RETURN_IDEMPOTENCY_CONFLICT"].includes(result.error)){pending.current=null;setLocked(false);}throw new Error();}
   pending.current=null;setLocked(false);setData(null);setReason("");setQuantities({});setMessage((ar?"تم حفظ المرتجع: ":"Return saved: ")+result.number+" · "+result.refundBase);
  }catch{setMessage(ar?"تعذر التأكيد. أعد المحاولة بنفس الطلب قبل بدء مرتجع آخر.":"Could not confirm. Retry the same request before starting another return.");}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <section className="mobi-purchase-scan-preview"><h2>{ar?"مرتجع أصناف غير تسلسلية":"Return nonserialized items"}</h2>
  <p>{ar?"تسجيل قيمة المرتجع وإعادة المخزون. صرف النقد وتسوية الدفع إجراء منفصل.":"Records return value and restores stock. Cash payout and payment settlement are separate."}</p>
  <label>{ar?"رقم الفاتورة":"Invoice number"}<input value={invoice} disabled={busy||locked} onChange={e=>{setInvoice(e.target.value);setData(null);}}/></label>
  <button type="button" disabled={busy||locked||!invoice.trim()} onClick={()=>void lookup()}>{ar?"تحميل الفاتورة":"Load invoice"}</button>
  {data&&<><p>{data.invoiceNumber}</p><label>{ar?"مخزن الإرجاع":"Return location"}<select value={location} disabled={busy||locked} onChange={e=>setLocation(e.target.value)}><option value="">—</option>{data.locations.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
  {data.lines.map(line=><label key={line.id}>{ar?line.nameAr:line.nameEn} · {ar?"المتبقي":"Remaining"}: {line.remaining} · {line.unitPrice}<input type="number" min={0} max={line.remaining} step={1} disabled={busy||locked||line.remaining<=0} value={quantities[line.id]??0} onChange={e=>setQuantities({...quantities,[line.id]:Number(e.target.value)})}/></label>)}
  {!data.lines.some(line=>line.remaining>0)&&<p>{ar?"لا توجد أصناف متاحة هنا. الأجهزة تتطلب مسار التحقق.":"No items available here. Devices require the trust-check workflow."}</p>}
  <label>{ar?"سبب المرتجع":"Return reason"}<textarea maxLength={500} value={reason} disabled={busy||locked} onChange={e=>setReason(e.target.value)}/></label>
  <p>{ar?"قيمة المرتجع":"Return value"}: {data.lines.reduce((sum,line)=>sum+(quantities[line.id]||0)*line.unitPrice,0).toFixed(2)}</p>
  <button type="button" className="primary" disabled={busy||(!locked&&(!location||!reason.trim()||!data.lines.some(line=>quantities[line.id]>0)))} onClick={()=>void submit()}>{ar?"تأكيد / إعادة المحاولة":"Confirm / retry"}</button></>}
  {message&&<p role="status">{message}</p>}
 </section>;
}
