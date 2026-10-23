"use client";
import { useState } from "react";
import { createPortal } from "react-dom";
import { labelQuantity, selectLabelBarcode } from "@/modules/catalog/label-barcode";
import { normalizeScan } from "@/modules/pilot/scanner";
import "./barcode-labels.css";

type Product = { id:string; sku:string; nameAr:string; nameEn:string; barcodes:string[] };
export function BarcodeLabelPanel({products,locale}:{products:Product[];locale:"ar"|"en"}) {
  const ar=locale==="ar";
  const [id,setId]=useState(""),[quantity,setQuantity]=useState("1"),[scan,setScan]=useState(""),[error,setError]=useState("");
  const product=products.find(p=>p.id===id);
  let barcode:ReturnType<typeof selectLabelBarcode>|undefined;
  try { if(product) barcode=selectLabelBarcode(product); } catch { /* Explained below. */ }
  const count=Number(quantity);
  let valid=false;
  try { labelQuantity(count); valid=Boolean(barcode); } catch { /* Disable print. */ }
  const labels=product&&barcode&&valid?<div className="barcode-label-sheet" lang={locale} dir={ar?"rtl":"ltr"}>
    {Array.from({length:count},(_,i)=><article className="barcode-label" key={i}>
      <div className="barcode-label-name">{ar?product.nameAr:product.nameEn}</div>
      <svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label={`${barcode.format}: ${barcode.value}`} data-format={barcode.format} viewBox={`0 0 ${barcode.bits.length} 60`} preserveAspectRatio="none" shapeRendering="crispEdges">
        <rect width={barcode.bits.length} height="60" fill="white"/>
        {[...barcode.bits].map((bit,x)=>bit==="1"?<rect key={x} x={x} y="0" width="1" height="60" fill="black"/>:null)}
      </svg>
      <div className="barcode-label-value" dir="ltr">{barcode.value}</div>
      <div className="barcode-label-sku" dir="ltr">SKU: {product.sku}</div>
    </article>)}
  </div>:null;
  return <section className="barcode-label-panel" aria-label={ar?"طباعة ملصقات الباركود":"Barcode label printing"}>
    <h2>{ar?"طباعة ملصقات الباركود":"Print barcode labels"}</h2>
    <p>{ar?"ملصق 80 × 40 مم. اختر الحجم الفعلي (100٪) وأوقف رؤوس وتذييلات الطباعة. تحقق من الملصق الفعلي بالماسح قبل الاستخدام.":"80 × 40 mm labels. Print at actual size (100%) with headers and footers off. Scan a physical test label before use."}</p>
    <form onSubmit={e=>{e.preventDefault();const code=normalizeScan(scan).toUpperCase();const matches=products.filter(p=>p.sku.toUpperCase()===code||p.barcodes.some(b=>b.toUpperCase()===code));if(matches.length===1){setId(matches[0].id);setError("");setScan("");}else{setId("");setError(ar?"الرمز غير موجود أو غير فريد ضمن القائمة المحملة.":"Code is missing or ambiguous in the loaded catalog.");}}}>
      <label>{ar?"مسح الباركود أو SKU ثم Enter":"Scan barcode or SKU then Enter"}<input data-testid="label-scan" value={scan} onChange={e=>setScan(e.target.value)} autoComplete="off" dir="ltr"/></label>
      <button type="submit">{ar?"اختيار":"Select"}</button>
    </form>
    <label>{ar?"المنتج (القائمة المحملة)":"Product (loaded catalog)"}<select data-testid="label-product" value={id} onChange={e=>{setId(e.target.value);setError("");}}><option value="">—</option>{products.map(p=><option key={p.id} value={p.id}>{ar?p.nameAr:p.nameEn} · {p.sku}</option>)}</select></label>
    <label>{ar?"عدد الملصقات (1–100)":"Label quantity (1–100)"}<input data-testid="label-quantity" type="number" min="1" max="100" step="1" value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
    {error&&<p role="alert">{error}</p>}
    {product&&!barcode&&<p role="alert">{ar?"لا يوجد رمز صالح للطباعة. يلزم EAN-13 صحيح أو رمز Code128/SKU مدعوم بطول 2–32 حرفًا.":"No printable identifier. A valid EAN-13 or supported Code128/SKU of 2–32 characters is required."}</p>}
    <button type="button" data-testid="label-print" disabled={!valid} onClick={()=>window.print()}>{ar?"طباعة الملصقات":"Print labels"}</button>
    <div className="barcode-label-preview">{labels}</div>
    {labels&&createPortal(<div id="barcode-label-print-root">{labels}</div>,document.body)}
  </section>;
}
