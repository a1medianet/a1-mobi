"use client";
import { useState } from "react";
type Item={productId:string;quantity:number};
type Product={id:string;sku:string;nameAr:string;nameEn:string;price:number;available:number};
export function CustomerOrderForm({slug,branchName,products}:{slug:string;branchName:string;products:Product[]}){
 const [language,setLanguage]=useState<"ar"|"en">("ar");
 const [basket,setBasket]=useState<Record<string,number>>({});
 const [name,setName]=useState("");const [phone,setPhone]=useState("");const [note,setNote]=useState("");
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 const [reference,setReference]=useState("");const [requestKey,setRequestKey]=useState("");
 const ar=language==="ar";
 const items:Item[]=products.filter(p=>basket[p.id]>0).map(p=>({productId:p.id,quantity:basket[p.id]}));
 const units=items.reduce((n,i)=>n+i.quantity,0);
 const total=items.reduce((n,i)=>n+i.quantity*(products.find(p=>p.id===i.productId)?.price??0),0);
 function change(id:string,step:number,available:number){
  setBasket(old=>({...old,[id]:Math.max(0,Math.min(available,(old[id]??0)+step,12-units+(old[id]??0)))}));
  setMessage("");
 }
 async function submit(event:React.FormEvent){
  event.preventDefault();if(!items.length||busy||reference)return;
  setBusy(true);setMessage("");
  const key=requestKey||crypto.randomUUID();setRequestKey(key);
  try{
   const res=await fetch("/api/shop/"+slug+"/orders",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({name,phone,note,items,idempotencyKey:key})});
   const body=await res.json();
   if(!res.ok){setMessage(ar?"تعذّر إرسال الطلب. راجع التوفر والبيانات ثم حاول مجددًا.":"Request could not be sent. Check availability and details.");return;}
   setReference(body.reference);
  }catch{setMessage(ar?"تعذّر الاتصال. حاول مجددًا.":"Connection failed. Please retry.");}
  finally{setBusy(false);}
 }
 return <main className="mobi-order-shop" lang={language} dir={ar?"rtl":"ltr"}>
  <header><strong>A1 <span>Mobi</span></strong><span>{branchName}</span>
   <button type="button" onClick={()=>setLanguage(ar?"en":"ar")}>{ar?"EN":"العربية"}</button>
  </header>
  <section className="mobi-order-shop-hero">
   <span>{ar?"متجر يعمل بنظام A1 Mobi":"Powered by A1 Mobi"}</span>
   <h1>{ar?"تسوق منتجات المتجر":"Shop the store catalog"}</h1>
   <p>{ar?"اختر المنتجات، أرسل طلبك، ثم انتظر تأكيد المتجر قبل الدفع أو الاستلام.":"Choose products and send a request. The store will confirm before payment or collection."}</p>
  </section>
  {reference?<section className="mobi-order-success" role="status">
   <h2>{ar?"تم استلام طلبك":"Request received"}</h2><strong dir="ltr">{reference}</strong>
   <p>{ar?"الطلب قيد مراجعة المتجر. لم يتم تحصيل دفعة أو حجز المخزون. احتفظ بالرقم للمتابعة.":"The store will review this request. No payment or stock reservation was made. Keep your reference."}</p>
  </section>:<>
   {!products.length&&<p role="status">{ar?"لا توجد منتجات متوفرة حاليًا. يرجى العودة لاحقًا.":"No products are available right now. Please check back later."}</p>}
   <section className="mobi-order-products" aria-label={ar?"المنتجات":"Products"}>
    {products.map(p=><article key={p.id}>
      <div className="mobi-order-phone-icon" aria-hidden="true">▣</div>
      <h2>{ar?p.nameAr:p.nameEn}</h2><small dir="ltr">{p.sku}</small>
      <p>{ar?"المتوفر: ":"Available: "}{p.available}</p><strong dir="ltr">{"$"+p.price.toFixed(2)}</strong>
      <div className="mobi-order-qty">
       <button type="button" disabled={busy||!(basket[p.id]>0)} aria-label={ar?"إنقاص":"Remove"} onClick={()=>change(p.id,-1,p.available)}>−</button>
       <output>{basket[p.id]??0}</output>
       <button type="button" aria-label={ar?"إضافة":"Add"} disabled={busy||units>=12||(basket[p.id]??0)>=p.available} onClick={()=>change(p.id,1,p.available)}>+</button>
      </div>
     </article>)}
   </section>
   <form className="mobi-order-checkout" onSubmit={e=>void submit(e)}>
    <h2>{ar?"إرسال طلب للمتجر":"Send a request to the store"}</h2>
    <p>{ar?"اختر منتجًا واحدًا على الأقل. الأسعار للتأكيد النهائي من المتجر.":"Choose at least one product. Prices and availability are subject to store confirmation."}</p>
    <div className="mobi-order-total">{ar?"المنتجات":"Items"}: {units} · {ar?"المجموع":"Total"}: <strong dir="ltr">{"$"+total.toFixed(2)}</strong></div>
    <label>{ar?"اسمك":"Your name"}<input required minLength={2} maxLength={90} value={name} onChange={e=>setName(e.target.value)} autoComplete="name"/></label>
    <label>{ar?"رقم الهاتف":"Phone number"}<input required minLength={7} maxLength={25} type="tel" dir="ltr" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel"/></label>
    <label>{ar?"ملاحظة (اختيارية)":"Note (optional)"}<textarea maxLength={500} rows={2} value={note} onChange={e=>setNote(e.target.value)}/></label>
    <button type="submit" disabled={busy||!units}>{busy?(ar?"جارٍ الإرسال…":"Sending…"):(ar?"إرسال الطلب":"Send request")}</button>
    {message&&<p role="alert">{message}</p>}
    <small>{ar?"هذه ليست عملية دفع ولا فاتورة. سيتواصل معك المتجر لتأكيد التوفر.":"This is not a payment or invoice. The store will confirm availability."}</small>
   </form>
  </>}
 </main>;
}
