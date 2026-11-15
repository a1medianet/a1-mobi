"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  A1_CURRENCY_CODES,A1_CURRENCY_COUNTRIES,
  type A1CurrencyPolicyConfig,
} from "@/modules/currency/currency-config";
import { currencyPreview, type ManualQuote } from "@/modules/currency/currency-preview";

type Props={
  locale:"ar"|"en";baseCurrency:string;
  policy:A1CurrencyPolicyConfig;quotes:ManualQuote[];
};
const names:Record<string,{ar:string;en:string}>={
  USD:{ar:"دولار أميركي",en:"US dollar"},LBP:{ar:"ليرة لبنانية",en:"Lebanese pound"},
  EUR:{ar:"يورو",en:"Euro"},GBP:{ar:"جنيه إسترليني",en:"Pound sterling"},
  SAR:{ar:"ريال سعودي",en:"Saudi riyal"},AED:{ar:"درهم إماراتي",en:"UAE dirham"},
  QAR:{ar:"ريال قطري",en:"Qatari riyal"},KWD:{ar:"دينار كويتي",en:"Kuwaiti dinar"},
  BHD:{ar:"دينار بحريني",en:"Bahraini dinar"},OMR:{ar:"ريال عُماني",en:"Omani rial"},
  TRY:{ar:"ليرة تركية",en:"Turkish lira"},CAD:{ar:"دولار كندي",en:"Canadian dollar"},
  AUD:{ar:"دولار أسترالي",en:"Australian dollar"},
};
export default function CashCurrencyPanel({locale,baseCurrency,policy,quotes}:Props){
  const ar=locale==="ar",router=useRouter();
  const [from,setFrom]=useState(baseCurrency);
  const [to,setTo]=useState(policy.preferredCurrency===baseCurrency
    ? policy.allowedCurrencies.find(x=>x!==baseCurrency)??baseCurrency:policy.preferredCurrency);
  const [amount,setAmount]=useState("1");
  const [draftRate,setDraftRate]=useState("");
  const [saving,setSaving]=useState(false),[notice,setNotice]=useState("");
  const [allowed,setAllowed]=useState<string[]>(policy.allowedCurrencies);
  const [preferred,setPreferred]=useState(policy.preferredCurrency);
  const [country,setCountry]=useState(policy.countryCode??"");
  const [preferredLocale,setPreferredLocale]=useState<"ar"|"en">(policy.preferredLocale);
  const currentQuote=quotes.find(q=>q.base===from&&q.quote===to);
  const effectiveQuotes=useMemo(()=>{
    if(!draftRate.trim()||from===to)return quotes;
    return [{base:from,quote:to,rate:draftRate.trim(),effectiveAt:"draft"},...quotes];
  },[quotes,from,to,draftRate]);
  const converted=useMemo(()=>{
    try{return currencyPreview({amount,from,to,baseCurrency,quotes:effectiveQuotes});}
    catch{return null;}
  },[amount,from,to,baseCurrency,effectiveQuotes]);
  const rateValid=/^(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/.test(draftRate)&&Number(draftRate)>0;
  const display=(code:string)=>code+" — "+(names[code]?.[locale]??code);
  function changePair(nextFrom:string,nextTo:string){
    setFrom(nextFrom);setTo(nextTo);setDraftRate("");setNotice("");
  }
  async function save(body:Record<string,unknown>){
    if(saving)return;
    setSaving(true);setNotice("");
    try{
      const response=await fetch("/api/ops/currency",{
        method:"POST",headers:{"content-type":"application/json"},
        credentials:"same-origin",cache:"no-store",body:JSON.stringify({...body,confirmed:true}),
      });
      const data=await response.json();
      if(!response.ok)throw Error(data.error||"SAVE_FAILED");
      setNotice(ar?"تم حفظ إعدادات العملات على مستوى الجهة أو سعر الصرف للفرع.":"Currency settings or branch rate saved.");
      if(body.action==="rate")setDraftRate("");
      router.refresh();
    }catch(error){
      setNotice((ar?"تعذّر الحفظ: ":"Save failed: ")+String(error instanceof Error?error.message:error));
    }finally{setSaving(false);}
  }
  const fixed=[baseCurrency,"USD","LBP"];
  return <section className="activity-card" dir={ar?"rtl":"ltr"} aria-label="A1 Currency"
    style={{marginBlock:"16px"}}>
    <div className="section-head"><div>
      <h2>A1 Currency · {ar?"العملات والتحويل":"Currencies & conversion"}</h2>
      <p>{ar?"حساب فوري بين العملات المعتمدة؛ العملية للعرض فقط ولا تغيّر الأرصدة أو الفواتير.":
        "Instant calculation across enabled currencies. Preview only; this does not post cash or edit invoices."}</p>
    </div></div>
    <div className="cash-close-fields">
      <label>{ar?"المبلغ":"Amount"}<input type="text" inputMode="decimal" value={amount}
        onChange={e=>setAmount(e.target.value)} aria-label={ar?"المبلغ":"Amount"}/></label>
      <label>{ar?"من عملة":"From"}<select value={from}
        onChange={e=>changePair(e.target.value,to)}>
        {policy.allowedCurrencies.map(x=><option key={x} value={x}>{display(x)}</option>)}
      </select></label>
      <label>{ar?"إلى عملة":"To"}<select value={to}
        onChange={e=>changePair(from,e.target.value)}>
        {policy.allowedCurrencies.map(x=><option key={x} value={x}>{display(x)}</option>)}
      </select></label>
    </div>
    <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",paddingBlock:12}}>
      <div><small>{ar?"نتيجة التحويل":"Converted amount"}</small>
        <div style={{fontSize:"1.45rem",fontWeight:750}} dir="ltr">{converted===null?"—":converted+" "+to}</div></div>
      <button className="soft-btn" type="button" onClick={()=>changePair(to,from)}
        disabled={from===to}>{ar?"تبديل الاتجاه ↔":"Swap ↔"}</button>
    </div>
    {converted===null&&from!==to&&<p role="status" className="module-sub">
      {ar?"أدخل مبلغًا صحيحًا وسعر صرف معتمدًا لهذا الزوج، أو لأزواج تسمح بالتحويل عبر العملة الأساسية.":
        "Enter a valid amount and a saved or provisional rate for this pair or a route via the base currency."}
    </p>}
    {from!==to&&<div className="cash-close-fields" style={{alignItems:"end"}}>
      <label>{ar?("سعر يدوي: 1 "+from+" = كم "+to+"؟"):("Manual rate: 1 "+from+" in "+to)}
        <input type="text" inputMode="decimal" value={draftRate} placeholder={currentQuote?.rate??"—"}
          onChange={e=>setDraftRate(e.target.value)}/></label>
      <button className="primary" type="button" disabled={!rateValid||saving}
        onClick={()=>void save({action:"rate",base:from,quote:to,rate:draftRate.trim()})}>
        {ar?"تثبيت سعر الصرف للفرع":"Save branch exchange rate"}</button>
    </div>}
    <p className="module-sub">{currentQuote
      ? (ar?"سعر محفوظ: ":"Saved quote: ")+currentQuote.rate+" "+to+" / "+from+" · "+
        new Date(currentQuote.effectiveAt).toLocaleString(ar?"ar-LB":"en-GB")
      : (ar?"لا يوجد سعر محفوظ مباشر لهذا الزوج.":"No saved direct quote for this pair.")}</p>
    <details style={{marginTop:12}}>
      <summary style={{cursor:"pointer",fontWeight:700}}>
        {ar?"إعدادات الجهة: العملات والدولة ولغة العرض":"Organization: currencies, country and display language"}</summary>
      <p className="module-sub">{ar?"عملة المحاسبة الأساسية: "+baseCurrency+" (تغييرها يتطلب ترحيلًا محاسبيًا آمنًا).":
        "Ledger base currency: "+baseCurrency+" (changing it requires a controlled accounting migration)."}</p>
      <div className="cash-close-fields">
        <label>{ar?"الدولة":"Country"}<select value={country} onChange={e=>setCountry(e.target.value)}>
          <option value="">{ar?"غير محددة":"Not set"}</option>
          {A1_CURRENCY_COUNTRIES.map(x=><option key={x} value={x}>{x}</option>)}
        </select></label>
        <label>{ar?"العملة المفضلة للعرض":"Preferred display currency"}
          <select value={preferred} onChange={e=>setPreferred(e.target.value)}>
            {allowed.map(x=><option key={x} value={x}>{display(x)}</option>)}
          </select></label>
        <label>{ar?"لغة العرض المفضلة":"Preferred display language"}
          <select value={preferredLocale} onChange={e=>setPreferredLocale(e.target.value as "ar"|"en")}>
            <option value="ar">العربية</option><option value="en">English</option>
          </select></label>
      </div>
      <fieldset style={{border:"1px solid var(--border,#dbe4ee)",borderRadius:10,marginBlock:12,padding:12}}>
        <legend>{ar?"العملات المسموحة لهذه الجهة":"Allowed currencies for this organization"}</legend>
        <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
          {A1_CURRENCY_CODES.map(code=><label key={code} style={{display:"flex",gap:5,alignItems:"center"}}>
            <input type="checkbox" checked={allowed.includes(code)}
              disabled={fixed.includes(code)} onChange={e=>{
                setAllowed(prev=>e.target.checked?[...prev,code]:prev.filter(x=>x!==code));
                if(!e.target.checked&&preferred===code)setPreferred(baseCurrency);
              }}/>{code}</label>)}
        </div>
      </fieldset>
      <button className="primary" type="button" disabled={saving||!allowed.includes(preferred)}
        onClick={()=>void save({action:"policy",allowedCurrencies:allowed,preferredCurrency:preferred,
          countryCode:country||null,preferredLocale})}>
        {ar?"حفظ إعدادات العملات":"Save currency settings"}</button>
      <p className="module-sub">{ar?"التحديث الآلي من مزوّد خارجي لم يُفعّل بعد؛ الأسعار المثبتة يدويًا تبقى مرجعية إلى أن تُغيّر.":
        "Automatic external provider updates are not active. Manually saved rates remain until changed."}</p>
    </details>
    {notice&&<p role="status">{notice}</p>}
  </section>;
}
