"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

const copy = {
  ar: {
    title: "تسجيل الدخول إلى إدارة المتجر",
    intro: "أدخل معرّف متجرك والبريد الإلكتروني وكلمة المرور للمتابعة إلى لوحة الإدارة.",
    tenant: "معرّف المتجر",
    tenantHint: "تجده عند إنشاء الحساب، أو تحصل عليه من مسؤول المتجر.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    factor: "رمز التحقق أو رمز الاستعادة",
    factorHint: "أدخل الرمز فقط إذا كانت المصادقة الثنائية مفعّلة.",
    factorRequired: "الحساب محمي بالمصادقة الثنائية. أدخل رمز تطبيق المصادقة أو رمز استعادة.",
    factorInvalid: "رمز التحقق غير صحيح أو سبق استخدامه.",
    submit: "تسجيل الدخول",
    busy: "جارٍ التحقق…",
    invalid: "تعذر الدخول. تحقق من البيانات وحالة حسابك.",
    limit: "محاولات كثيرة. حاول مجددًا بعد 15 دقيقة.",
    unavailable: "الخدمة غير متاحة الآن. حاول لاحقًا.",
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
    factor: "Authenticator or recovery code",
    factorHint: "Only enter this when multi-factor authentication is enabled.",
    factorRequired: "This account uses multi-factor authentication. Enter an authenticator or recovery code.",
    factorInvalid: "The verification code is invalid or has already been used.",
    submit: "Sign in",
    busy: "Checking…",
    invalid: "Unable to sign in. Check your details and account status.",
    limit: "Too many attempts. Try again in 15 minutes.",
    unavailable: "Service unavailable. Try again later.",
    active: "Store session connected",
    logout: "Sign out",
    preview: "Open app preview",
    security: "Account security",
    recover: "Forgot password?",
    note: "New here? Create an account to get started with your store.",
  },
} as const;

export function LoginForm({ locale, initialTenant = "", initialEmail = "" }: { locale: "ar" | "en"; initialTenant?: string; initialEmail?: string }) {
  const t = copy[locale];
  const [active, setActive] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsFactor, setNeedsFactor] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/session", { cache: "no-store", signal: controller.signal })
      .then(response => {
        setActive(response.ok);
        setChecking(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
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
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
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
        setNeedsFactor(false);
        setActive(true);
      }
    } catch {
      setError(t.unavailable);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (response.ok) setActive(false);
      else setError(t.unavailable);
    } catch {
      setError(t.unavailable);
    } finally {
      setBusy(false);
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

  return <section className="auth-card" style={{
    maxWidth: 560,
    margin: "32px auto",
    padding: 28,
    background: "white",
    border: "1px solid #e8edf3",
    borderRadius: 16,
  }}>
    <h1 style={{ fontSize: 28, marginBottom: 12 }}>{t.title}</h1>
    <p style={{ marginBottom: 24 }}>{t.intro}</p>

    {checking ? <p role="status">{t.busy}</p> : active ? <div>
      <p role="status" style={{ marginBottom: 16 }}>{t.active}</p>
      <button className="primary" onClick={logout} disabled={busy}>
        {busy ? t.busy : t.logout}
      </button>
      <p style={{ marginTop: 20 }}>
        <Link href={"/" + locale}>{t.preview}</Link>
        {" · "}
        <Link href={"/" + locale + "/settings/security"}>{t.security}</Link>
      </p>
    </div> : <form onSubmit={submit} style={{ display: "grid", gap: 20 }}>
      <label>{t.tenant}
        <input name="tenant" defaultValue={initialTenant} autoComplete="organization" required maxLength={80}
          pattern="[a-zA-Z0-9-]+" dir="ltr" style={inputStyle} />
        <small className="mobi-field-hint">{t.tenantHint}</small>
      </label>
      <label>{t.email}
        <input name="email" defaultValue={initialEmail} type="email" autoComplete="username" required
          maxLength={254} dir="ltr" style={inputStyle} />
      </label>
      <label>{t.password}
        <input name="password" type="password" autoComplete="current-password"
          required maxLength={256} dir="ltr" style={inputStyle} />
      </label>
      {needsFactor && <label>{t.factor}
        <input name="secondFactor" autoComplete="one-time-code" required
          minLength={6} maxLength={32} dir="ltr" style={inputStyle} />
        <small style={{ display: "block", marginTop: 5, color: "#64748b" }}>
          {t.factorHint}
        </small>
      </label>}
      <button className="primary" disabled={busy}>{busy ? t.busy : t.submit}</button>
      <Link href={"/" + locale + "/recover"}>{t.recover}</Link>
    </form>}

    {error && <p role="alert" style={{ color: "#b91c1c", marginTop: 20 }}>{error}</p>}
    <p style={{ marginTop: 24, fontSize: 16, color: "#475569" }}>{t.note}</p>
  </section>;
}
