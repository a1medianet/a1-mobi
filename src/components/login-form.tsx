"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
const copy = {
  ar: { title: "الدخول إلى المتجر", intro: "استخدم رمز متجرك والبريد المسجل للوصول إلى جلسة العمل.",
    tenant: "رمز المتجر", email: "البريد الإلكتروني", password: "كلمة المرور", submit: "تسجيل الدخول",
    busy: "جارٍ التحقق…", invalid: "تعذر الدخول. تحقق من البيانات وحالة حسابك.",
    limit: "محاولات كثيرة. حاول مجددًا بعد 15 دقيقة.", unavailable: "الخدمة غير متاحة الآن. حاول لاحقًا.",
    active: "جلسة المتجر متصلة", logout: "تسجيل الخروج", preview: "فتح معاينة التطبيق",
    note: "الصفحات التشغيلية ما زالت معاينة؛ الدخول لا يجعل بياناتها التجريبية معاملات حقيقية." },
  en: { title: "Sign in to your store", intro: "Use your store code and registered email to open a work session.",
    tenant: "Store code", email: "Email", password: "Password", submit: "Sign in",
    busy: "Checking…", invalid: "Unable to sign in. Check your details and account status.",
    limit: "Too many attempts. Try again in 15 minutes.", unavailable: "Service unavailable. Try again later.",
    active: "Store session connected", logout: "Sign out", preview: "Open app preview",
    note: "Operational pages remain previews; signing in does not turn sample data into real transactions." },
};
export function LoginForm({ locale }: { locale: "ar" | "en" }) {
  const t = copy[locale];
  const [active, setActive] = useState(false), [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(r => { setActive(r.ok); setChecking(false); })
      .catch(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget, fields = new FormData(form);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant: fields.get("tenant"), email: fields.get("email"),
          password: fields.get("password") }) });
      if (!response.ok) {
        setError(response.status === 429 ? t.limit : response.status === 503 ? t.unavailable : t.invalid);
      } else { form.reset(); setActive(true); }
    } catch { setError(t.unavailable); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) setActive(false); else setError(t.unavailable);
    } catch { setError(t.unavailable); }
    finally { setBusy(false); }
  }
  const inputStyle = { width: "100%", minHeight: 48, padding: "10px 12px",
    border: "1px solid #cbd5e1", borderRadius: 10, marginTop: 6, fontSize: 16 };
  return <section className="auth-card" style={{ maxWidth: 560, margin: "32px auto", padding: 28,
    background: "white", border: "1px solid #e8edf3", borderRadius: 16 }}>
    <h1 style={{ fontSize: 28, marginBottom: 12 }}>{t.title}</h1>
    <p style={{ marginBottom: 24 }}>{t.intro}</p>
    {checking ? <p role="status">{t.busy}</p> : active ? <div>
      <p role="status" style={{ marginBottom: 16 }}>{t.active}</p>
      <button className="primary" onClick={logout} disabled={busy}>{busy ? t.busy : t.logout}</button>
      <p style={{ marginTop: 20 }}><Link href={"/" + locale}>{t.preview}</Link></p>
    </div> : <form onSubmit={submit} style={{ display: "grid", gap: 20 }}>
      <label>{t.tenant}<input name="tenant" autoComplete="organization" required maxLength={80}
        pattern="[a-zA-Z0-9-]+" dir="ltr" style={inputStyle} /></label>
      <label>{t.email}<input name="email" type="email" autoComplete="username" required
        maxLength={254} dir="ltr" style={inputStyle} /></label>
      <label>{t.password}<input name="password" type="password" autoComplete="current-password"
        required maxLength={256} dir="ltr" style={inputStyle} /></label>
      <button className="primary" disabled={busy}>{busy ? t.busy : t.submit}</button>
    </form>}
    {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 20 }}>{error}</p>}
    <p style={{ marginTop: 24, fontSize: 16, color: "#475569" }}>{t.note}</p>
  </section>;
}
