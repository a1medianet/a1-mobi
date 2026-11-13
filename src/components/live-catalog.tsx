"use client";
import Link from "next/link";
import { OperationalJourney } from "@/components/operational-journey";
import { PartCompatibilityPanel } from "@/components/part-compatibility-panel";
import { useEffect,useState } from "react";
type Product={id:string;sku:string;nameAr:string;nameEn:string;price:number;type:string;isActive:boolean};
const empty={sku:"",nameAr:"",nameEn:"",price:"",type:""};
export function LiveCatalog({locale}:{locale:"ar"|"en"}){
 const ar=locale==="ar";
 const [products,setProducts]=useState<Product[]>([]),[form,setForm]=useState(empty),[editing,setEditing]=useState("");
 const [query,setQuery]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[loaded,setLoaded]=useState(false);
 const [importFile,setImportFile]=useState<File|null>(null),[importResult,setImportResult]=useState("");
 async function load(){const res=await fetch("/api/ops/catalog",{cache:"no-store"});if(!res.ok)throw new Error();setProducts((await res.json()).products);setLoaded(true);}
 useEffect(()=>{
  const controller=new AbortController();
  void fetch("/api/ops/catalog",{cache:"no-store",signal:controller.signal})
   .then(async res=>{if(!res.ok)throw new Error();return res.json();})
   .then(data=>{if(!controller.signal.aborted){setProducts(data.products);setLoaded(true);}})
   .catch(()=>{if(!controller.signal.aborted)setError(ar?"تعذّر تحميل المنتجات":"Could not load products");});
  return ()=>controller.abort();
 },[ar]);
 async function send(body:unknown){
  setBusy(true);setError("");
  try{const res=await fetch("/api/ops/catalog",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   if(!res.ok){const body=await res.json().catch(()=>({error:"SAVE_FAILED"})) as {error?:string};throw new Error(body.error||"SAVE_FAILED");}
   await load();setEditing("");setForm(empty);
  }catch(e){const code=e instanceof Error?e.message:"";
   if(code==="SKU_EXISTS")setError(ar?"رمز SKU مستخدم لمنتج آخر.":"SKU is already assigned to another product.");
   else if(code==="INVALID_REQUEST")setError(ar?"تحقق من رمز SKU والأسماء والسعر قبل الحفظ.":"Check SKU characters, names and price.");
   else setError(ar?"تعذّر الحفظ. تحقق من الصلاحيات ورمز المنتج والبيانات.":"Could not save. Check permissions, SKU and details.");}finally{setBusy(false);}
 }
 async function uploadImport(){
  if(!importFile)return;
  if(importFile.size>1_000_000){setError(ar?"الملف أكبر من الحد المسموح (1 ميغابايت).":"File exceeds the 1 MB import limit.");return;}
  if(!window.confirm(ar?"سيتم تحديث المنتجات التي تحمل SKU مطابقًا في هذا المتجر. هل تريد المتابعة؟":"Products with matching SKUs will be updated in this store. Continue?"))return;
  setBusy(true);setError("");setImportResult("");
  try{
   const body=new FormData();body.set("file",importFile);
   const res=await fetch("/api/ops/catalog/import",{method:"POST",body});
   if(!res.ok)throw new Error();
   const result=await res.json() as {created:number;updated:number};
   setImportResult(ar?`تمت إضافة ${result.created} وتحديث ${result.updated} منتج.`:`Imported ${result.created} new and updated ${result.updated} products.`);
   setImportFile(null);await load();
  }catch{setError(ar?"تعذّر استيراد الملف. تحقّق من الأعمدة والباركود والصلاحيات.":"Import failed. Check columns, barcodes and permissions.");}
  finally{setBusy(false);}
 }
 return <main className="module-page">
  <header className="module-header"><div><h1>{ar?"إدارة المنتجات":"Product management"}</h1><p>{ar?"منتجات متجرك. تظهر المنتجات النشطة ذات المخزون المتوفر في رابط المتجر.":"Your store catalog. Active products with available stock appear in your storefront."}</p></div>
   <Link className="soft-btn" href={"/"+locale+"/orders"}>{ar?"رابط المتجر والطلبات":"Store link & requests"}</Link>
   <Link className="soft-btn" href={"/"+locale+"/inventory"}>{ar?"استلام المخزون":"Receive inventory"}</Link></header>
  <OperationalJourney locale={locale} active="products"/>
  {!loaded&&!error&&<p role="status" className="mobi-catalog-loading">{ar?"جارٍ تحميل المنتجات...":"Loading store products..."}</p>}
  {error&&<p role="alert" className="mobi-catalog-feedback">{error}</p>}
  <section className="catalog-panel"><form className="mobi-catalog-form" onSubmit={e=>{e.preventDefault();void send(editing?{action:"update",id:editing,sku:form.sku,nameAr:form.nameAr,nameEn:form.nameEn,price:Number(form.price)}:{action:"create",...form,price:Number(form.price)});}}>
   <h2>{editing?(ar?"تعديل المنتج":"Edit product"):(ar?"إضافة منتج":"Add product")}</h2>
   {([['sku','SKU'],['nameAr',ar?'الاسم بالعربية':'Arabic name'],['nameEn',ar?'الاسم بالإنجليزية':'English name'],['price',ar?'السعر USD':'Price USD']] as const).map(([key,label])=><label key={key}>{label}<input required maxLength={key==='price'?undefined:key==='sku'?90:160} pattern={key==='sku'?"[A-Za-z0-9._-]+":undefined} minLength={key==='price'?undefined:2} type={key==='price'?'number':'text'} min={key==='price'?'0.01':undefined} step={key==='price'?'0.01':undefined} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
   {!editing&&<label>{ar?"النوع":"Type"}<select required value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value="">{ar?"اختر نوع المنتج":"Choose product type"}</option><option value="DEVICE">{ar?"جهاز تسلسلي":"Serialized device"}</option><option value="ACCESSORY">{ar?"إكسسوار":"Accessory"}</option><option value="PART">{ar?"قطعة صيانة":"Repair part"}</option></select></label>}
   <button className="primary" disabled={busy||!form.sku.trim()||!form.price||(!editing&&!form.type)}>{ar?"حفظ":"Save"}</button>{editing&&<button type="button" onClick={()=>{setEditing("");setForm(empty);}}>{ar?"إلغاء":"Cancel"}</button>}
  </form></section>
  <section className="catalog-panel catalog-import-panel" aria-label={ar?"استيراد المنتجات":"Product import"}>
   <h2>{ar?"استيراد المنتجات من Excel أو CSV":"Import products from Excel or CSV"}</h2>
   <p>{ar?"نزّل النموذج وأدخل المنتجات. يمكن تحديث منتج موجود برمز SKU نفسه. يجب أن يكون الباركود فريدًا.":"Download the template and enter your products. Matching SKUs are updated; each barcode must be unique."}</p>
   <div className="mobi-import-actions"><a className="soft-btn" href="/templates/mobi-products-template.csv" download>{ar?"تنزيل نموذج الاستيراد":"Download import template"}</a>
   <label>{ar?"ملف المنتجات":"Product file"}<input type="file" accept=".csv,.xlsx" disabled={busy} onChange={e=>setImportFile(e.target.files?.[0]??null)}/></label>
   <button className="primary" type="button" disabled={busy||!importFile} onClick={()=>void uploadImport()}>{ar?"استيراد المنتجات":"Import products"}</button>
   </div>{importResult&&<p role="status">{importResult}</p>}
  </section>
  <section className="catalog-panel catalog-list-panel"><label>{ar?"بحث":"Search"}<input value={query} onChange={e=>setQuery(e.target.value)}/></label>
   <div className="catalog-grid">{products.filter(p=>[p.sku,p.nameAr,p.nameEn].join(' ').toLowerCase().includes(query.trim().toLowerCase())).map(p=><article className="catalog-card" key={p.id}><div className="catalog-card-body">
    <h2>{ar?p.nameAr:p.nameEn}</h2><p dir="ltr">{p.sku} · ${p.price.toFixed(2)}</p><p>{p.isActive?(ar?"نشط":"Active"):(ar?"مؤرشف":"Archived")}</p>
    <button disabled={busy} onClick={()=>{setEditing(p.id);setForm({sku:p.sku,nameAr:p.nameAr,nameEn:p.nameEn,price:String(p.price),type:p.type});}}>{ar?"تعديل":"Edit"}</button>{' '}
    <button disabled={busy} onClick={()=>{if(p.isActive&&!window.confirm(ar?"أرشفة المنتج ستخفيه من المتجر. هل تريد المتابعة؟":"Archiving hides this product from the store. Continue?"))return;void send({action:"setActive",id:p.id,isActive:!p.isActive});}}>{p.isActive?(ar?"أرشفة":"Archive"):(ar?"استعادة":"Restore")}</button>
   </div></article>)}</div>
   {loaded&&!products.length&&<p>{ar?"أضف أول منتج ثم استلم مخزونه.":"Add your first product, then receive its stock."}</p>}
  </section>
  <PartCompatibilityPanel locale={locale} products={products}/>
 </main>;
}
