"use client";
import { useState } from "react";
import Link from "next/link";

function validImei(value:string){const digits=value.replace(/\D/g,"");if(digits.length!==15)return false;let sum=0;for(let i=0;i<14;i++){let n=Number(digits[i]);if(i%2===1)n*=2;if(n>9)n-=9;sum+=n}return (sum+Number(digits[14]))%10===0}
export default function DeviceTrustPage(){
 const [imei,setImei]=useState(""); const [checked,setChecked]=useState(false);
 const valid=validImei(imei);
 return <main dir="rtl" className="trust-page"><header className="module-header"><div><Link href="/ar" className="back-link">← لوحة التحكم</Link><p className="module-kicker">A1 MOBI · DEVICE TRUST NETWORK</p><h1>فحص موثوقية الجهاز</h1><p className="module-sub">افحص كل جهاز قبل البيع أو الشراء أو الصيانة أو التعبئة</p></div><div className="trust-status">معاينة الواجهة · الفحص الشبكي غير مفعّل</div></header>
 <section className="trust-layout"><div className="trust-hero"><div className="trust-orb">⌕</div><h2>أدخل رقم IMEI أو امسحه</h2><p>هذه معاينة تتحقق من صيغة IMEI فقط. لا تستعلم من سجل البلاغات ولا تُجيز أي خدمة لجهاز فعلي.</p><label className="imei-field"><span>IMEI</span><input inputMode="numeric" maxLength={15} value={imei} onChange={e=>{setImei(e.target.value.replace(/\D/g,""));setChecked(false)}} placeholder="000000000000000"/><small>{imei.length}/15</small></label><button className="trust-check-btn" disabled={!valid} onClick={()=>setChecked(true)}>التحقق من صيغة الرقم <span>←</span></button>{checked&&<div className="trust-result clear"><span>✓</span><div><b>صيغة IMEI صحيحة فقط</b><small>لم يُفحص سجل البلاغات · لا يجوز متابعة العملية بهذه النتيجة</small></div></div>}</div>
 <aside className="trust-side"><h3>قاعدة الفحص الإلزامي</h3><p>لا تُنفّذ أي خدمة لجهاز فعلي قبل إتمام فحص الثقة.</p><div className="trust-rules"><div><span>01</span><b>البيع والاستبدال</b></div><div><span>02</span><b>استلام المخزون</b></div><div><span>03</span><b>استلام الصيانة</b></div><div><span>04</span><b>Device Present Top-up</b></div></div><Link href="/ar/pos" className="soft-btn trust-pos-link">الانتقال إلى نقطة البيع ←</Link></aside></section></main>
}