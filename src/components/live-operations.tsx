"use client";
import Link from "next/link";
import { classifyScan } from "@/modules/pilot/scanner";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type P = { id:string; sku:string; nameAr:string; nameEn:string; isSerialized:boolean; price:number };
type V = { id:string; model:string; name:string };
type D = { id:string; productId:string; productName:string; productNameEn?:string; imei:string|null; status:string };

export function liveOperationStatus(value:string,locale:"ar"|"en") {
 const labels:Record<string,{ar:string;en:string}>={
  IN_STOCK:{ar:"متوفر",en:"Available"},
  SOLD:{ar:"تم البيع",en:"Sold"},
  COMPLETED:{ar:"مكتملة",en:"Completed"},
  CANCELLED:{ar:"ملغاة",en:"Cancelled"},
  RETURNED:{ar:"مرتجع",en:"Returned"},
 };
 return labels[value]?.[locale]??value;
}
type State = { products:P[]; variants:V[]; locations:{id:string;name:string}[];
  devices:D[]; sales:{id:string;invoiceNumber:string;total:number;status:string}[];
  counts:{products:number;availableDevices:number;sales:number} };
const labels = {
 ar: { title:"البيع والمخزون", intro:"إنشاء المنتجات واستلام الأجهزة وبيعها عبر السجلات المحفوظة.",
   create:"1. إنشاء منتج", receive:"2. استلام جهاز", sell:"3. البيع والفاتورة", reload:"تحديث البيانات",
   nameAr:"اسم عربي", nameEn:"اسم إنجليزي", brand:"العلامة (EN)", model:"الطراز", variant:"النسخة",
   sku:"SKU", unitCost:"التكلفة USD", price:"سعر البيع USD", product:"المنتج", location:"المخزن",
   imei:"IMEI (15 رقمًا)", device:"الجهاز", save:"حفظ المنتج", stock:"أجهزة متاحة", products:"منتجات", sales:"فواتير",
   received:"تسجيل الاستلام", checkout:"تأكيد البيع النقدي", list:"الأجهزة المسجلة", receipts:"الفواتير المسجلة",
   needProduct:"أضف منتجًا أولًا ليصبح استلام جهاز ممكنًا.",
   noneAvailable:"لا توجد أجهزة متاحة للبيع. سجّل جهازًا في المخزون أولًا.", startInventory:"فتح المخزون", invoice:"الفاتورة", total:"الإجمالي بالدولار", state:"الحالة",
   note:"بيئة اختبار محلية: تحفظ الإجراءات في بيانات تدريبية فقط. لا تستخدم بيانات عملاء حقيقيين.", back:"لوحة التحكم",
   confirm:"تأكيد إنشاء فاتورة نقدية وخصم الجهاز من مخزون قاعدة الاختبار؟", done:"تم الحفظ بنجاح", error:"خطأ"},
 en: { title:"Sales & inventory", intro:"Create products, receive devices, and sell from persistent store records.",
   create:"1. Create product", receive:"2. Receive device", sell:"3. Sell and invoice", reload:"Refresh",
   nameAr:"Arabic name", nameEn:"English name", brand:"Brand (EN)", model:"Model", variant:"Variant",
   sku:"SKU", unitCost:"Cost USD", price:"Price USD", product:"Product", location:"Location",
   imei:"IMEI (15 digits)", device:"Device", save:"Save product", stock:"Available devices", products:"Products", sales:"Invoices",
   received:"Receive device", checkout:"Confirm cash sale", list:"Registered devices", receipts:"Saved invoices",
   needProduct:"Add a product first before receiving a device.",
   noneAvailable:"No devices available for sale. Receive a device in inventory first.", startInventory:"Open inventory", invoice:"Invoice", total:"Total USD", state:"Status",
   note:"Local test environment: actions persist in test records only. Do not use actual customer data.", back:"Dashboard",
   confirm:"Confirm invoice and stock deduction in the test database?", done:"Saved successfully", error:"Error"},
} as const;
export default function LiveOperationsPage({mode="all"}:{mode?:"all"|"pos"|"inventory"}={}) {
 const {locale:raw}=useParams<{locale:string}>();
 const locale=raw==="en"?"en":"ar"; const t=labels[locale];
 const [state,setState]=useState<State|null>(null),[error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [product,setProduct]=useState({sku:"",brand:"",model:"",variant:"",nameAr:"",nameEn:"",unitCost:"300",price:"500"});
 const [stock,setStock]=useState({productId:"",variantId:"",locationId:"",imei:"",unitCost:"300"});
 const [selectedDeviceIds,setSelectedDeviceIds]=useState<string[]>([]);
 const [scanInput,setScanInput]=useState("");
 async function refresh() {
   const r=await fetch("/api/ops/live-01",{cache:"no-store"}),data=await r.json();
   if(!r.ok)throw new Error(data.error||"READ_FAILED");
   setState(data as State);
 }
 useEffect(()=>{ let mounted=true; fetch("/api/ops/live-01",{cache:"no-store"}).then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"READ_FAILED");if(mounted)setState(data as State);}).catch(e=>{if(mounted)setError(String(e.message));});return()=>{mounted=false;};},[]);
 async function send(input:Record<string,unknown>) {
   if(busy)return;setBusy(true);setError("");
   try {
     const r=await fetch("/api/ops/live-01",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(input)});
     const data=await r.json();
     if(!r.ok)throw new Error(data.error||"WRITE_FAILED");
     await refresh();
     if(input.action==="createProduct"&&typeof data.id==="string"&&typeof data.variantId==="string"&&typeof data.locationId==="string"){
       setStock(current=>({...current,productId:data.id,variantId:data.variantId,locationId:data.locationId,unitCost:String(input.unitCost??current.unitCost)}));
     }
     if(input.action==="sell"||input.action==="sellCart")setSelectedDeviceIds([]);
     if(input.action==="receive")setStock(current=>({...current,imei:""}));
     setError(t.done+(data.invoiceNumber?" · "+data.invoiceNumber:""));
   }catch(e){setError(t.error+": "+(e instanceof Error?e.message:"UNKNOWN"));}
   finally{setBusy(false);}
 }
 const available=state?.devices.filter(x=>x.status==="IN_STOCK")??[];
 const selectedDevices=available.filter(device=>selectedDeviceIds.includes(device.id));
 const cartTotal=selectedDevices.reduce((total,device)=>total+(state?.products.find(p=>p.id===device.productId)?.price??0),0);
 function toggleDevice(id:string,checked:boolean){setSelectedDeviceIds(previous=>checked?[...previous.filter(item=>item!==id),id]:previous.filter(item=>item!==id));}
 function addScannedDevice() {
   try {
     const scan=classifyScan(scanInput);
     if(scan.kind!=="IMEI") {setError(locale==="ar"?"امسح IMEI لجهاز مسجل؛ باركود المنتجات غير مدعوم هنا بعد.":"Scan a registered device IMEI; product barcodes are not supported here yet.");return;}
     const match=available.find(device=>device.imei===scan.value);
     if(!match){setError(locale==="ar"?"الجهاز غير موجود ضمن المخزون المتاح.":"Device is not in available inventory.");return;}
     setSelectedDeviceIds(previous=>previous.includes(match.id)||previous.length>=12?previous:[...previous,match.id]);
     setError("");setScanInput("");
   } catch {setError(locale==="ar"?"رمز المسح غير صالح.":"Invalid scan code.");}
 }
 return <main className={"module-page mobi-live01 mobi-live01-"+mode} lang={locale} dir={locale==="ar"?"rtl":"ltr"}>
  <header className="module-header"><div><Link href={"/"+locale} className="back-link">{t.back}</Link>
   <p className="module-kicker">A1 MOBI · {mode==="pos"?(locale==="ar"?"نقطة البيع":"POINT OF SALE"):mode==="inventory"?(locale==="ar"?"المخزون":"INVENTORY"):(locale==="ar"?"العمليات":"OPERATIONS")}</p><h1>{mode==="pos"?(locale==="ar"?"نقطة البيع":"Point of sale"):mode==="inventory"?(locale==="ar"?"المخزون والأجهزة":"Inventory & devices"):t.title}</h1><p className="module-sub">{mode==="pos"?(locale==="ar"?"بيع الأجهزة المسجلة وإصدار فواتير محفوظة.":"Sell registered devices and issue stored invoices."):mode==="inventory"?(locale==="ar"?"تسجيل المنتجات واستلام أجهزة IMEI وإدارة حالتها.":"Register products and receive IMEI devices into inventory."):t.intro}</p></div>
   <button type="button" className="soft-btn" onClick={()=>void refresh().catch(e=>setError(String(e.message)))}>{t.reload}</button></header>
  <p role="note" className="preview-notice">{t.note}</p>{error&&<p role="status" className="mobi-live-message">{error}</p>}
  {state&&<section className="mobi-live-stats">
   {(mode==="pos"?[[t.stock,state.counts.availableDevices],[t.sales,state.counts.sales]]:mode==="inventory"?[[t.products,state.counts.products],[t.stock,state.counts.availableDevices]]:[[t.products,state.counts.products],[t.stock,state.counts.availableDevices],[t.sales,state.counts.sales]]).map(([name,value])=><article key={name}><span>{name}</span><strong>{value}</strong></article>)}
  </section>}
  <div className="mobi-live-workspace"><section className="mobi-live-steps">
   {mode!=="pos"&&<form onSubmit={e=>{e.preventDefault();void send({action:"createProduct",...product,unitCost:Number(product.unitCost),price:Number(product.price)});}}>
    <h2>{mode==="inventory"?(locale==="ar"?"إضافة منتج":"Add product"):t.create}</h2>
    <div className="mobi-live-form-grid">{(["brand","model","variant","sku","nameAr","nameEn","unitCost","price"] as const).map(key=>
     <label key={key}>{t[key]}<input required type={key==="price"||key==="unitCost"?"number":"text"} min={key==="price"||key==="unitCost"?0:undefined}
      step={key==="price"||key==="unitCost"?"0.01":undefined} value={product[key]}
      onChange={e=>setProduct(old=>({...old,[key]:e.target.value}))}/></label>)}</div>
    <button type="submit" className="primary" disabled={busy}>{t.save}</button>
   </form>}
   {mode!=="pos"&&<form onSubmit={e=>{e.preventDefault();void send({action:"receive",...stock,unitCost:Number(stock.unitCost),idempotencyKey:crypto.randomUUID()});}}>
    <h2>{mode==="inventory"?(locale==="ar"?"استلام جهاز":"Receive device"):t.receive}</h2>
    <label>{t.product}<select required value={stock.productId} onChange={e=>setStock(old=>({...old,productId:e.target.value}))}>
     <option value="">—</option>{state?.products.filter(p=>p.isSerialized).map(p=><option key={p.id} value={p.id}>{locale==="ar"?p.nameAr:p.nameEn} · {p.sku}</option>)}</select></label>
    <label>{t.variant}<select required value={stock.variantId} onChange={e=>setStock(old=>({...old,variantId:e.target.value}))}>
     <option value="">—</option>{state?.variants.map(v=><option key={v.id} value={v.id}>{v.model} · {v.name}</option>)}</select></label>
    <label>{t.location}<select required value={stock.locationId} onChange={e=>setStock(old=>({...old,locationId:e.target.value}))}>
     <option value="">—</option>{state?.locations.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
    <label>{t.imei}<input required pattern="[0-9]{15}" inputMode="numeric" maxLength={15} value={stock.imei} onChange={e=>setStock(old=>({...old,imei:e.target.value}))}/></label>
    <label>{t.unitCost}<input required type="number" min={0} step="0.01" value={stock.unitCost} onChange={e=>setStock(old=>({...old,unitCost:e.target.value}))}/></label>
    {state&&state.products.length===0&&<p className="mobi-live-hint" role="status">{t.needProduct}</p>}
    <button type="submit" className="primary" disabled={busy||!state?.products.length}>{t.received}</button>
   </form>}
   {mode!=="inventory"&&<form onSubmit={e=>{e.preventDefault();if(!selectedDevices.length||!window.confirm(t.confirm))return;void send({action:"sellCart",deviceIds:selectedDevices.map(d=>d.id),idempotencyKey:crypto.randomUUID()});}}>
    <h2>{mode==="pos"?(locale==="ar"?"بيع جهاز وإصدار فاتورة":"Sell device & issue invoice"):t.sell}</h2>
    <div className="mobi-pos-imei-scanner">
      <label htmlFor="mobi-pos-imei-scan">{locale==="ar"?"مسح IMEI لجهاز متاح":"Scan available device IMEI"}</label>
      <input id="mobi-pos-imei-scan" autoComplete="off" inputMode="numeric" value={scanInput} onChange={e=>setScanInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addScannedDevice();}}} placeholder="IMEI" aria-label={locale==="ar"?"قارئ IMEI":"IMEI scanner"} />
      <button type="button" onClick={addScannedDevice} disabled={busy||!scanInput.trim()||selectedDeviceIds.length>=12}>{locale==="ar"?"إضافة الجهاز":"Add device"}</button>
    </div>
    <fieldset className="mobi-pos-device-list">
      <legend>{locale==="ar"?"اختر الأجهزة للفاتورة":"Select devices for this invoice"}</legend>
      {available.map(device=>{
        const price=state?.products.find(p=>p.id===device.productId)?.price??0;
        const checked=selectedDeviceIds.includes(device.id);
        return <label className={"mobi-pos-device-option"+(checked?" is-selected":"")} key={device.id}>
          <input type="checkbox" checked={checked} disabled={busy||(!checked&&selectedDeviceIds.length>=12)} onChange={event=>toggleDevice(device.id,event.target.checked)}/>
          <span className="mobi-pos-device-copy"><strong>{locale==="en"?(device.productNameEn||device.productName):device.productName}</strong><small dir="ltr">{device.imei}</small></span>
          <bdi dir="ltr">{"$"+price.toFixed(2)}</bdi>
        </label>;
      })}
    </fieldset>
    <p className="mobi-live-hint">{locale==="ar"?"حتى 12 جهازًا في الفاتورة الواحدة":"Up to 12 devices per invoice"}</p>
    <div className="mobi-pos-cart-summary" aria-live="polite">
      <span>{locale==="ar"?"الأجهزة المختارة":"Selected devices"}: <strong>{selectedDevices.length}</strong></span>
      <span>{t.total}: <strong dir="ltr">{"$"+cartTotal.toFixed(2)}</strong></span>
    </div>
    {state&&available.length===0&&<p className="mobi-live-hint" role="status">{t.noneAvailable} <Link href={"/"+locale+"/inventory"}>{t.startInventory}</Link></p>}
    <p className="mobi-live-hint">{locale==="ar"?"الدفع النقدي بالدولار — تحقق الأجهزة وفاتورة محفوظة":"USD cash — verified device and persisted invoice"}</p>
    <button type="submit" className="primary" disabled={busy||!selectedDevices.length}>{t.checkout}</button>
   </form>}
  </section>
  <section className="mobi-live-details">
   {mode!=="pos"&&<article><h2>{t.list}</h2><div className="table-wrap"><table><thead><tr><th>IMEI</th><th>{t.product}</th><th>{t.state}</th></tr></thead>
   <tbody>{state?.devices.map(d=><tr key={d.id}><td><bdi dir="ltr">{d.imei}</bdi></td><td>{locale==="en"?(d.productNameEn||d.productName):d.productName}</td><td>{liveOperationStatus(d.status,locale)}</td></tr>)}</tbody></table></div></article>}
   {mode!=="inventory"&&<article><h2>{t.receipts}</h2><div className="table-wrap"><table><thead><tr><th>{t.invoice}</th><th>{t.total}</th><th>{t.state}</th></tr></thead>
   <tbody>{state?.sales.map(s=><tr key={s.id}><td><bdi dir="ltr">{s.invoiceNumber}</bdi></td><td><bdi dir="ltr">{"$"+s.total.toFixed(2)}</bdi></td><td>{liveOperationStatus(s.status,locale)}</td></tr>)}</tbody></table></div></article>}
  </section></div>
 </main>;
}
