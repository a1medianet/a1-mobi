"use client";
import {useState} from "react";
import TopupOwnerLive from "@/components/topup-owner-live";
import RechargeG5Sandbox from "@/components/recharge-g5-sandbox";

type Method="manual"|"recharge";

/**
 * Navigation only: the legacy manual top-up component and API are unchanged.
 * Keep both panels mounted when the sandbox is enabled, so an unresolved
 * synthetic order is not lost merely by switching methods.
 */
export default function TopupMethodWorkspace({
 locale,integrationSandboxEnabled,reviewAllowed=false,cashAllowed=false,costAllowed=false,
}:{locale:"ar"|"en";integrationSandboxEnabled:boolean;
  reviewAllowed?:boolean;cashAllowed?:boolean;costAllowed?:boolean}){
 const ar=locale==="ar";
 const [method,setMethod]=useState<Method>("manual");
 if(!integrationSandboxEnabled)return <TopupOwnerLive locale={locale} integrationSandboxEnabled={false}/>;
 return <div lang={locale} dir={ar?"rtl":"ltr"}>
  <nav className="activity-card" aria-label={ar?"اختيار طريقة التعبئة":"Select top-up method"}
   style={{margin:"16px auto",maxWidth:1180}}>
   <div role="tablist" aria-label={ar?"مسارا التعبئة":"Top-up methods"}
    style={{display:"flex",flexWrap:"wrap",gap:12}}>
    <button type="button" role="tab" id="topup-manual-tab"
     aria-selected={method==="manual"} aria-controls="topup-manual-panel"
     className={method==="manual"?"primary":""} onClick={()=>setMethod("manual")}>
     {ar?"التعبئة اليدوية":"Manual top-up"}
    </button>
    <button type="button" role="tab" id="topup-recharge-tab"
     aria-selected={method==="recharge"} aria-controls="topup-recharge-panel"
     className={method==="recharge"?"primary":""} onClick={()=>setMethod("recharge")}>
     A1 Recharge · {ar?"تجريبي":"Sandbox"}
    </button>
   </div>
   <p className="module-sub" style={{marginTop:12}}>{method==="manual"
    ?(ar?"تسجيل تعبئة منفذة فعليًا خارج Mobi. هذه العمليات لا تستخدم محرك Recharge.":"Record only externally fulfilled top-ups; this manual path never calls Recharge.")
    :(ar?"اختبار منفصل بلا شحن حقيقي. يمكن تسجيل فواتير وحركات صندوق وهمية في قاعدة G5 المعزولة بعد تأكيد صريح.":"Isolated test without carrier fulfillment. Explicitly confirmed synthetic invoices and cash entries may be written only to G5.")}</p>
  </nav>
  <div id="topup-manual-panel" role="tabpanel" aria-labelledby="topup-manual-tab"
   style={{display:method==="manual"?"block":"none"}}>
   <TopupOwnerLive locale={locale} integrationSandboxEnabled/>
  </div>
  <div id="topup-recharge-panel" role="tabpanel" aria-labelledby="topup-recharge-tab"
   style={{display:method==="recharge"?"block":"none"}}>
   <main className="module-page mobi-topup-live" dir={ar?"rtl":"ltr"}>
    <header className="module-header">
     <div>
      <p className="module-kicker">A1 MOBI · A1 RECHARGE · G5</p>
      <h1>{ar?"التعبئة عبر A1 Recharge — الاختبار المعزول":"A1 Recharge — Isolated top-up sandbox"}</h1>
      <p className="module-sub">{ar?
       "عمليات تجريبية فقط، دون تنفيذ فعلي لدى Alfa أو touch، ومع فصل كامل عن سجل التعبئة اليدوية.":
       "Synthetic orders only. No Alfa/touch fulfillment and no changes to the manual top-up ledger."}</p>
     </div>
    </header>
    <RechargeG5Sandbox locale={locale} reviewAllowed={reviewAllowed}
     cashAllowed={cashAllowed} costAllowed={costAllowed}/>
   </main>
  </div>
 </div>;
}
