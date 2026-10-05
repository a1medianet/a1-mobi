"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const copy = {
  ar: {
    requestTitle: "استعادة حساب المتجر",
    requestIntro: "أدخل رمز المتجر والبريد المسجل. إذا كانت البيانات صحيحة سنرسل رابط استعادة إلى القناة المهيأة.",
    tenant: "رمز المتجر",
    email: "البريد الإلكتروني",
    request: "إرسال طلب الاستعادة",
    requestDone: "إذا كان الحساب موجودًا ومؤهلًا، سيصل رابط الاستعادة قريبًا.",
    resetTitle: "تعيين كلمة مرور جديدة",
    resetIntro: "استخدم رابط الاستعادة الصالح لتعيين كلمة مرور جديدة. بعد النجاح سيتم إلغاء كل الجلسات السابقة.",
    password: "كلمة المرور الجديدة",
    confirm: "تأكيد كلمة المرور",
    reset: "تعيين كلمة المرور",
    success: "تم تغيير كلمة المرور. سجّل الدخول من جديد.",
    mismatch: "كلمتا المرور غير متطابقتين.",
    invalid: "تعذر إكمال الاستعادة. قد يكون الرابط غير صالح أو منتهيًا.",
    rate: "محاولات كثيرة. حاول لاحقًا.",
    unavailable: "الخدمة غير متاحة الآن.",
    busy: "جارٍ التنفيذ…",
    login: "العودة إلى تسجيل الدخول",
  },
  en: {
    requestTitle: "Recover store account",
    requestIntro: "Enter the store code and registered email. If the account is eligible, a recovery link will be sent through the configured channel.",
    tenant: "Store code",
    email: "Email",
    request: "Send recovery request",
    requestDone: "If the account exists and is eligible, a recovery link will arrive shortly.",
    resetTitle: "Set a new password",
    resetIntro: "Use a valid recovery link to set a new password. All previous sessions will be revoked after success.",
    password: "New password",
    confirm: "Confirm password",
    reset: "Set new password",
    success: "Password changed. Sign in again.",
    mismatch: "Passwords do not match.",
    invalid: "Recovery could not be completed. The link may be invalid or expired.",
    rate: "Too many attempts. Try again later.",
    unavailable: "Service unavailable.",
    busy: "Working…",
    login: "Back to sign in",
  },
} as const;

const inputStyle = {
  width: "100%",
  minHeight: 48,
  padding: "10px 12px",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  marginTop: 6,
  fontSize: 16,
} as const;

export function RecoveryForm({
  locale,
  token,
}: {
  locale: "ar" | "en";
  token?: string;
}) {
  const t = copy[locale];
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function requestRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setSuccess(false);
    setMessage("");
    try {
      const response = await fetch("/api/auth/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenant: fields.get("tenant"),
          email: fields.get("email"),
        }),
      });
      if (response.status === 202) {
        setSuccess(true);
        setMessage(t.requestDone);
      } else {
        setMessage(response.status === 429 ? t.rate : t.unavailable);
      }
    } catch {
      setMessage(t.unavailable);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    const password = String(fields.get("password") ?? "");
    const confirm = String(fields.get("confirm") ?? "");
    if (password !== confirm) {
      setSuccess(false);
      setMessage(t.mismatch);
      return;
    }

    setBusy(true);
    setSuccess(false);
    setMessage("");
    try {
      const response = await fetch("/api/auth/recovery/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      if (response.ok) {
        form.reset();
        setSuccess(true);
        setMessage(t.success);
      } else {
        setMessage(response.status === 429 ? t.rate :
          response.status === 503 ? t.unavailable : t.invalid);
      }
    } catch {
      setMessage(t.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return <section className="auth-card" style={{
    maxWidth: 600,
    margin: "32px auto",
    padding: 28,
    background: "white",
    border: "1px solid #e8edf3",
    borderRadius: 16,
  }}>
    <h1 style={{ fontSize: 28, marginBottom: 12 }}>
      {token ? t.resetTitle : t.requestTitle}
    </h1>
    <p style={{ marginBottom: 24 }}>
      {token ? t.resetIntro : t.requestIntro}
    </p>

    {token ? <form onSubmit={resetPassword} style={{ display: "grid", gap: 18 }}>
      <label>{t.password}
        <input name="password" type="password" minLength={12} maxLength={256}
          autoComplete="new-password" required dir="ltr" style={inputStyle} />
      </label>
      <label>{t.confirm}
        <input name="confirm" type="password" minLength={12} maxLength={256}
          autoComplete="new-password" required dir="ltr" style={inputStyle} />
      </label>
      <button className="primary" disabled={busy}>
        {busy ? t.busy : t.reset}
      </button>
    </form> : <form onSubmit={requestRecovery} style={{ display: "grid", gap: 18 }}>
      <label>{t.tenant}
        <input name="tenant" required maxLength={80} pattern="[a-zA-Z0-9-]+"
          dir="ltr" style={inputStyle} />
      </label>
      <label>{t.email}
        <input name="email" type="email" required maxLength={254}
          autoComplete="username" dir="ltr" style={inputStyle} />
      </label>
      <button className="primary" disabled={busy}>
        {busy ? t.busy : t.request}
      </button>
    </form>}

    {message && <p role={success ? "status" : "alert"} style={{
      marginTop: 18,
      color: success ? "#166534" : "#b91c1c",
    }}>{message}</p>}

    <p style={{ marginTop: 22 }}>
      <Link href={"/" + locale + "/login"}>{t.login}</Link>
    </p>
  </section>;
}
