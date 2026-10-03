"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { isValidImei, normalizeImei } from "@/modules/devices/imei";

const copy = {
  ar: {
    back:"لوحة التحكم", title:"فحص موثوقية الجهاز", subtitle:"فحص الجهاز جزء من البيع والاستلام والصيانة والتعبئة",
    status:"معاينة · سجل البلاغات غير متصل", enter:"أدخل رقم IMEI",
    intro:"هذه الواجهة تتحقق من صيغة الرقم فقط. فحص سجل البلاغات وحالة الجهاز غير متاحين هنا بعد.",
    hint:"استخدم رقمًا من 15 خانة. الأرقام العربية مدعومة.",
    invalid:"صيغة الرقم غير صحيحة؛ تحقق من الخانات ورقم التحقق.",
    check:"تحقق من صيغة الرقم", result:"حالة الجهاز غير معروفة",
    resultHint:"الصيغة صحيحة، لكن سجل البلاغات لم يُفحص. هذه النتيجة لا تسمح بمتابعة خدمة الجهاز.",
    rule:"قاعدة الفحص الإلزامي", required:"الخدمة الفعلية تتطلب فحص الثقة من الخادم قبل المتابعة.",
    rules:["البيع والاستبدال","استلام المخزون","استلام الصيانة","التعبئة عند حضور الجهاز"],
    pos:"الانتقال إلى نقطة البيع",
  },
  en: {
    back:"Dashboard", title:"Device trust check", subtitle:"Device checks belong in sales, intake, repairs and top-ups",
    status:"Preview · incident registry disconnected", enter:"Enter the IMEI",
    intro:"This interface checks number format only. Incident lookup and device status are not available here yet.",
    hint:"Use a 15-digit number. Arabic numerals are supported.",
    invalid:"Invalid number format; check the digits and checksum.",
    check:"Check number format", result:"Device status is unknown",
    resultHint:"The format is valid, but the incident registry was not checked. This result does not authorize device service.",
    rule:"Mandatory trust check", required:"Real service requires a server-side trust check before proceeding.",
    rules:["Sales and exchanges","Stock intake","Repair intake","Top-up with device present"],
    pos:"Go to point of sale",
  },
};
export default function DeviceTrustPage() {
  const { locale: raw } = useParams<{ locale: string }>();
  const locale = raw === "en" ? "en" : "ar", t = copy[locale];
  const [imei,setImei] = useState("");
  const [checked,setChecked] = useState(false);
  const valid = isValidImei(imei);
  return <main lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className="trust-page">
    <header className="module-header"><div>
      <Link href={`/${locale}`} className="back-link">{t.back}</Link>
      <p className="module-kicker">A1 MOBI · DEVICE TRUST</p><h1>{t.title}</h1><p className="module-sub">{t.subtitle}</p>
    </div><span className="trust-status">{t.status}</span></header>
    <section className="trust-layout">
      <form className="trust-hero" onSubmit={e => { e.preventDefault(); if (valid) setChecked(true); }}>
        <div className="trust-orb" aria-hidden="true">⌕</div><h2>{t.enter}</h2><p>{t.intro}</p>
        <label className="imei-field"><span>IMEI</span>
          <input inputMode="numeric" dir="ltr" autoComplete="off" maxLength={32} value={imei}
            aria-label="IMEI" aria-describedby="imei-hint imei-error"
            aria-invalid={imei.length >= 15 && !valid}
            onChange={e => { setImei(normalizeImei(e.target.value)); setChecked(false); }}
            placeholder="352099001761481" />
          <small><bdi dir="ltr">{imei.length}/15</bdi></small>
        </label>
        <p id="imei-hint" className="field-hint">{t.hint}</p>
        <p id="imei-error" className="field-error">{imei.length >= 15 && !valid ? t.invalid : ""}</p>
        <button className="trust-check-btn" type="submit" disabled={!valid}>{t.check}</button>
        {checked && <div className="trust-result unverified" role="status">
          <span aria-hidden="true">i</span><div><b>{t.result}</b><small>{t.resultHint}</small></div>
        </div>}
      </form>
      <aside className="trust-side"><h3>{t.rule}</h3><p>{t.required}</p>
        <div className="trust-rules">{t.rules.map((rule,index) =>
          <div key={rule}><span aria-hidden="true">{String(index+1).padStart(2,"0")}</span><b>{rule}</b></div>)}</div>
        <Link href={`/${locale}/pos`} className="soft-btn trust-pos-link">{t.pos}</Link>
      </aside>
    </section>
  </main>;
}
