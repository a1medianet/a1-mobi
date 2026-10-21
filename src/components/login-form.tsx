"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { authRequest, SESSION_TIMEOUT_MS, LOGIN_TIMEOUT_MS } from "@/core/auth/client-request";

const copy = {
  ar: {
    title: "تسجيل الدخول إلى إدارة المتجر",
    intro: "أدخل معرّف متجرك والبريد الإلكتروني وكلمة المرور للمتابعة إلى لوحة الإدارة.",
    tenant: "معرّف المتجر",
    tenantHint: "تجده عند إنشاء الحساب، أو تحصل عليه من مسؤول المتجر.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    showPassword: "إظهار كلمة المرور",
    hidePassword: "إخفاء كلمة المرور",
    factor: "رمز التحقق أو رمز الاستعادة",
    factorHint: "أدخل الرمز فقط إذا كانت المصادقة الثنائية مفعّلة.",
    factorRequired: "الحساب محمي بالمصادقة الثنائية. أدخل رمز تطبيق المصادقة أو رمز استعادة.",
    factorInvalid: "رمز التحقق غير صحيح أو سبق استخدامه.",
    submit: "تسجيل الدخول",
    busy: "جارٍ التحقق…",
    invalid: "تعذر الدخول. تحقق من البيانات وحالة حسابك.",
    limit: "محاولات كثيرة. حاول مجددًا بعد 15 دقيقة.",
    unavailable: "الخدمة غير متاحة الآن. حاول لاحقًا.",
    timeout: "استغرق الاتصال وقتًا طويلًا. تحقق من اتصالك وحاول تسجيل الدخول مجددًا.",
    active: "جلسة المتجر متصلة",
    logout: "تسجيل الخروج",
    preview: "فتح معاينة التطبيق",
    security: "أمان الحساب",
    recover: "نسيت كلمة المرور؟",
    note: "ليس لديك حساب بعد؟ أنشئ حسابًا لتبدأ إدارة متجرك.",
  },
  en: {
    title: "Sign in to store management",
    intro: "Use your store code and registered email to open a work session.",
    tenant: "Store ID",
    tenantHint: "Your Store ID is provided during signup or by your store administrator.",
    email: "Email",
    password: "Password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    factor: "Authenticator or recovery code",
    factorHint: "Only enter this when multi-factor authentication is enabled.",
    factorRequired: "This account uses multi-factor authentication. Enter an authenticator or recovery code.",
    factorInvalid: "The verification code is invalid or has already been used.",
    submit: "Sign in",
    busy: "Checking…",
    invalid: "Unable to sign in. Check your details and account status.",
    limit: "Too many attempts. Try again in 15 minutes.",
    unavailable: "Service unavailable. Try again later.",
    timeout: "The connection took too long. Check your connection and try signing in again.",
    active: "Store session connected",
    logout: "Sign out",
    preview: "Open app preview",
    security: "Account security",
    recover: "Forgot password?",
    note: "New here? Create an account to get started with your store.",
  },
} as const;

export function LoginForm({ locale, initialTenant = "", initialEmail = "", returnTo }: {
  locale: "ar" | "en"; initialTenant?: string; initialEmail?: string; returnTo: string;
}) {
  const t = copy[locale];
  const [active, setActive] = useState(false);
  const lifetime = useRef<AbortController | null>(null);
  const sessionCheck = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsFactor, setNeedsFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const session = new AbortController();
    lifetime.current = controller;
    sessionCheck.current = session;
    authRequest("/api/auth/session", { cache: "no-store" }, SESSION_TIMEOUT_MS, session.signal)
      .then(response => { if (!session.signal.aborted) setActive(response.ok); })
      .catch(() => { /* Keep the form available; never infer authorization from failure. */ });
    return () => { controller.abort(); session.abort(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted) return;
    sessionCheck.current?.abort();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");

    try {
      const response = await authRequest("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: fields.get("tenant"),
          email: fields.get("email"),
          password: fields.get("password"),
          ...(fields.get("secondFactor")
            ? { secondFactor: fields.get("secondFactor") }
            : {}),
        }),
      }, LOGIN_TIMEOUT_MS, signal);
      if (signal.aborted) return;

      if (!response.ok) {
        const body = response.body;
        if (body.error === "MFA_REQUIRED") {
          setNeedsFactor(true);
          setError(t.factorRequired);
        } else if (body.error === "INVALID_MFA") {
          setNeedsFactor(true);
          setError(t.factorInvalid);
        } else {
          setError(response.status === 429
            ? t.limit
            : response.status === 503
              ? t.unavailable
              : t.invalid);
        }
      } else {
        form.reset();
        setShowPassword(false);
        setNeedsFactor(false);
        setActive(true);
        // Session cookie is set by the API; the protected page is rechecked by proxy.
        window.location.assign(returnTo);
      }
    } catch (cause) {
      if (!signal.aborted) setError(cause instanceof Error && cause.message === "TIMEOUT" ? t.timeout : t.unavailable);
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }

  async function logout() {
    const signal = lifetime.current?.signal;
    if (!signal || signal.aborted) return;
    setBusy(true);
    setError("");
    try {
      const response = await authRequest("/api/auth/logout", { method: "POST" }, LOGIN_TIMEOUT_MS, signal);
      if (signal.aborted) return;
      if (response.ok) setActive(false);
      else setError(t.unavailable);
    } catch {
      if (!signal.aborted) setError(t.unavailable);
    } finally {
      if (!signal.aborted) setBusy(false);
    }
  }

  const inputStyle = {
    width: "100%",
    minHeight: 48,
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    marginTop: 6,
    fontSize: 16,
  } as const;

  return <main className="mobi-login-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
    <aside className="mobi-login-showcase" aria-label="A1 Mobi">
      <Link href={"/product/" + locale} className="mobi-login-brand"><Image src="/brand/a1-mobi-logo-white.svg" alt="A1 Mobi" width={50} height={50} /><span>A1 Mobi</span></Link>
      <div className="mobi-login-art" aria-hidden="true"><div className="mobi-login-art-glow"/><div className="mobi-login-device"><div className="mobi-login-device-top"/><div className="mobi-login-device-body"><span/><span/><span/></div><div className="mobi-login-device-bottom"/></div><div className="mobi-login-art-chip mobi-login-art-chip-one">OK</div><div className="mobi-login-art-chip mobi-login-art-chip-two">A1</div></div>
      <div className="mobi-login-showcase-copy"><span className="mobi-login-eyebrow">A1 MOBI | PILOT</span><h2>{locale === "ar" ? "\u0645\u062a\u062c\u0631\u0643\u060c \u0643\u0644\u0651\u0647 \u0628\u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f." : "Your entire store. One smart workspace."}</h2><p>{locale === "ar" ? "\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a \u0648\u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0648\u0627\u0644\u0635\u064a\u0627\u0646\u0629 \u0648\u0627\u0644\u0641\u0648\u0627\u062a\u064a\u0631 \u0628\u0628\u0633\u0627\u0637\u0629." : "Sales, inventory, repairs and invoices in one workspace."}</p><div className="mobi-login-capabilities"><span>{locale === "ar" ? "\u0627\u0644\u0645\u0628\u064a\u0639\u0627\u062a" : "Sales"}</span><span>{locale === "ar" ? "\u0627\u0644\u0635\u064a\u0627\u0646\u0629" : "Repairs"}</span><span>{locale === "ar" ? "\u0627\u0644\u0645\u062e\u0632\u0648\u0646" : "Inventory"}</span></div></div>
    </aside>
    <div className="mobi-login-panel"><div className="mobi-login-top"><Link href={"/product/" + locale} className="mobi-login-small-brand">A1 <strong>Mobi</strong></Link><Link href={locale === "ar" ? "/en/login" : "/ar/login"} className="mobi-login-lang" hrefLang={locale === "ar" ? "en" : "ar"}>{locale === "ar" ? "English" : "\u0627\u0644\u0639\u0631\u0628\u064a\u0629"}</Link></div><section className="auth-card" style={{
    maxWidth: 560,
    margin: "32px auto",
    padding: 28,
    background: "white",
    border: "1px solid #e8edf3",
    borderRadius: 16,
  }}>
    <h1 style={{ fontSize: 28, marginBottom: 12 }}>{t.title}</h1>
    <p style={{ marginBottom: 24 }}>{t.intro}</p>

    {active ? <div>
      <p role="status" style={{ marginBottom: 16 }}>{t.active}</p>
      <button className="primary" onClick={logout} disabled={busy}>
        {busy ? t.busy : t.logout}
      </button>
      <p style={{ marginTop: 20 }}>
        <Link href={returnTo}>{t.preview}</Link>
        {" · "}
        <Link href={"/" + locale + "/settings/security"}>{t.security}</Link>
      </p>
    </div> : <form onSubmit={submit} style={{ display: "grid", gap: 20 }}>
      <label>{t.tenant}
        <input name="tenant" defaultValue={initialTenant} autoComplete="organization" required maxLength={80}
          pattern="[a-zA-Z0-9-]+" aria-describedby="tenant-hint" dir="ltr" style={inputStyle} />
        <small id="tenant-hint" className="mobi-field-hint">{t.tenantHint}</small>
      </label>
      <label>{t.email}
        <input name="email" defaultValue={initialEmail} type="email" autoComplete="username" required
          maxLength={254} dir="ltr" style={inputStyle} />
      </label>
      <div>
        <label htmlFor="login-password">{t.password}</label>
        <div className="mobi-password-field">
        <input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password"
          required maxLength={256} dir="ltr" style={inputStyle} />
        <button type="button" aria-controls="login-password" aria-pressed={showPassword}
          onClick={() => setShowPassword(value => !value)}>
          {showPassword ? t.hidePassword : t.showPassword}
        </button>
        </div>
      </div>
      {needsFactor && <label>{t.factor}
        <input name="secondFactor" autoComplete="one-time-code" required
          minLength={6} maxLength={32} dir="ltr" style={inputStyle} />
        <small className="mobi-field-hint">
          {t.factorHint}
        </small>
      </label>}
      <button className="primary" disabled={busy}>{busy ? t.busy : t.submit}</button>
      <Link href={"/" + locale + "/recover"}>{t.recover}</Link>
    </form>}

    {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 20 }}>{error}</p>}
    <p style={{ marginTop: 24, fontSize: 16, color: "#475569" }}>{t.note}</p>
  </section></div></main>;
}
