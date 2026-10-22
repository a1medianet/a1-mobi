"use client";
import { useState } from "react";
import { addScannedReceiptProduct, type ReceiptLine } from "@/modules/inventory/purchase-receipt";
type Item={id:string;sku:string;nameAr:string;nameEn:string;isSerialized:boolean;barcodes:string[]};
export function PurchaseScanPreview({products,locale}:{products:readonly Item[];locale:"ar"|"en"}) {
 const [scan,setScan]=useState(""); const [cost,setCost]=useState("0");
 const [lines,setLines]=useState<ReceiptLine[]>([]); const [message,setMessage]=useState(""); const ar=locale==="ar";
 function add(){
  try {
   setLines(addScannedReceiptProduct(scan,products,lines,Number(cost)));
   setScan("");setMessage("");
  } catch(e) {
   const reason=e instanceof Error?e.message:"";
   const messages:Record<string,[string,string]>={
    RECEIPT_PRODUCT_NOT_FOUND:["الصنف غير معروف. عرّفه أولًا.","Unknown product. Define it first."],
    SERIALIZED_RECEIVING_REQUIRES_DEVICE:["استخدم استلام IMEI المنفصل.","Use separate IMEI receiving."],
    INVALID_UNIT_COST:["تكلفة شراء غير صالحة.","Invalid purchase cost."],
   };
   setMessage(messages[reason]?.[ar?0:1]??(ar?"رمز غير صالح.":"Invalid code."));
  }
 }
 return <section className="mobi-purchase-scan-preview" aria-label={ar?"استلام مشتريات بالمسح":"Purchase scan receiving"}>
  <h2>{ar?"استلام مشتريات بالمسح":"Purchase receiving by scan"}</h2>
  <p role="note">{ar?"مسودة غير مرحّلة: استخدم الباركود أو SKU للصنف المسجل؛ لا تغيّر المخزون قبل الحفظ المعتمد.":"Draft only: scan registered barcode or SKU. No stock changes until an authorized receipt is saved."}</p>
  <div className="mobi-live-form-grid">
   <label>{ar?"الباركود أو SKU":"SKU"}<input value={scan} autoComplete="off" onChange={e=>setScan(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();add();}}}/></label>
   <label>{ar?"تكلفة الوحدة بالدولار":"Unit cost USD"}<input value={cost} type="number" min="0" step="0.01" onChange={e=>setCost(e.target.value)}/></label>
  </div>
  <button type="button" className="primary" disabled={!scan.trim()} onClick={add}>{ar?"أضف للمسودة":"Add to draft"}</button>
  {message&&<p role="status">{message}</p>}
  {lines.length>0&&<ul>{lines.map(line=>{const item=products.find(p=>p.id===line.productId);return <li key={line.productId}>{ar?item?.nameAr:item?.nameEn} — {line.quantity} × {line.unitCost.toFixed(2)} USD</li>;})}</ul>}
  {lines.length>0&&<button type="button" onClick={()=>{setLines([]);setMessage("");}}>{ar?"إلغاء المسودة":"Clear draft"}</button>}
 </section>;
}
