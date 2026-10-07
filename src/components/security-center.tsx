"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

type SetupPayload = {
  secret: string;
  otpauthUri: string;
  recoveryCodes: string[];
};

const copy = {
  ar: {
    title: "أمان الحساب",
    intro: "فعّل المصادقة الثنائية لحماية حساب المتجر. احفظ رموز الاستعادة خارج هذا الجهاز قبل الإكمال.",
    checking: "جارٍ التحقق من الجلسة…",
    loginRequired: "يجب تسجيل الدخول أولًا.",
    signIn: "تسجيل الدخول",
    enabled: "المصادقة الثنائية مفعّلة",
    disabled: "المصادقة الثنائية غير مفعّلة",
    currentPassword: "كلمة المرور الحالية",
    setup: "بدء إعداد MFA",
    setupBusy: "جارٍ إنشاء الإعداد…",
    secret: "مفتاح الإعداد اليدوي",
    openAuthenticator: "فتح رابط تطبيق المصادقة",
    recoveryCodes: "رموز الاستعادة",
    recoveryWarning: "احفظ هذه الرموز الآن في مكان آمن. لن نعرضها بعد مغادرة هذه الخطوة، وكل رمز للاستخدام مرة واحدة.",
    saved: "حفظت رموز الاستعادة",
    code: "رمز تطبيق المصادقة",
    enable: "تفعيل المصادقة الثنائية",
    enabling: "جارٍ التفعيل…",
    enableSuccess: "تم تفعيل المصادقة الثنائية مع إبقاء هذه الجلسة متصلة وإلغاء الجلسات الأخرى.",
    disableIntro: "لإلغاء MFA أدخل كلمة المرور الحالية ورمز المصادقة أو أحد رموز الاستعادة.",
    factor: "رمز المصادقة أو الاستعادة",
    disable: "إلغاء المصادقة الثنائية",
    disabling: "جارٍ الإلغاء…",
    disableSuccess: "تم إلغاء المصادقة الثنائية وإنهاء الجلسات. سجّل الدخول من جديد.",
    invalid: "تعذر تنفيذ العملية. تحقق من كلمة المرور أو الرمز.",
    rate: "محاولات كثيرة. حاول مجددًا بعد 15 دقيقة.",
    unavailable: "الخدمة غير متاحة الآن.",
    back: "العودة إلى حساب المتجر",
  },
  en: {
    title: "Account security",
    intro: "Enable multi-factor authentication to protect the store account. Save recovery codes away from this device before completing setup.",
    checking: "Checking session…",
    loginRequired: "Sign in first.",
    signIn: "Sign in",
    enabled: "Multi-factor authentication is enabled",
    disabled: "Multi-factor authentication is not enabled",
    currentPassword: "Current password",
    setup: "Start MFA setup",
    setupBusy: "Creating setup…",
    secret: "Manual setup key",
    openAuthenticator: "Open authenticator setup link",
    recoveryCodes: "Recovery codes",
    recoveryWarning: "Save these codes now in a secure place. They will not be shown after leaving this step, and each code is single-use.",
    saved: "I saved the recovery codes",
    code: "Authenticator code",
    enable: "Enable multi-factor authentication",
    enabling: "Enabling…",
    enableSuccess: "MFA enabled. This session stayed active and other sessions were revoked.",
    disableIntro: "To disable MFA, enter the current password and an authenticator or recovery code.",
    factor: "Authenticator or recovery code",
    disable: "Disable multi-factor authentication",
    disabling: "Disabling…",
    disableSuccess: "MFA disabled and sessions were ended. Sign in again.",
    invalid: "The operation could not be completed. Check the password or code.",
    rate: "Too many attempts. Try again in 15 minutes.",
    unavailable: "Service unavailable.",
    back: "Back to store account",
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

function errorText(status: number, t: (typeof copy)["ar"] | (typeof copy)["en"]) {
  if (status === 429) return t.rate;
  if (status === 503) return t.unavailable;
  return t.invalid;
}

export function SecurityCenter({ locale }: { locale: "ar" | "en" }) {
  const t = copy[locale];
  const [access, setAccess] = useState<"checking" | "ok" | "login">("checking");
  const [enabled, setEnabled] = useState(false);
  const [setup, setSetup] = useState<SetupPayload | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState<"setup" | "enable" | "disable" | "">("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/auth/session", {
      cache: "no-store",
      signal: controller.signal,
    }).then(async session => {
      if (!session.ok) {
        setAccess("login");
        return;
      }

      setAccess("ok");
      const response = await fetch("/api/auth/mfa", {
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) {
        const body = await response.json() as { enabled?: boolean };
        setEnabled(Boolean(body.enabled));
      }
    }).catch(() => {
      if (!controller.signal.aborted) setAccess("login");
    });

    return () => controller.abort();
  }, []);

  async function beginSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy("setup");
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: fields.get("currentPassword") }),
      });
      if (!response.ok) {
        setMessage(errorText(response.status, t));
      } else {
        const body = await response.json() as SetupPayload;
        setSetup(body);
        setSaved(false);
        form.reset();
      }
    } catch {
      setMessage(t.unavailable);
    } finally {
      setBusy("");
    }
  }

  async function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !saved) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy("enable");
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch("/api/auth/mfa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: fields.get("code") }),
      });
      if (!response.ok) {
        setMessage(errorText(response.status, t));
      } else {
        setSetup(null);
        setEnabled(true);
        setSuccess(true);
        setMessage(t.enableSuccess);
        form.reset();
      }
    } catch {
      setMessage(t.unavailable);
    } finally {
      setBusy("");
    }
  }

  async function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    setBusy("disable");
    setMessage("");
    setSuccess(false);
    try {
      const response = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: fields.get("currentPassword"),
          factor: fields.get("factor"),
        }),
      });
      if (!response.ok) {
        setMessage(errorText(response.status, t));
      } else {
        setEnabled(false);
        setSuccess(true);
        setMessage(t.disableSuccess);
        setAccess("login");
        form.reset();
      }
    } catch {
      setMessage(t.unavailable);
    } finally {
      setBusy("");
    }
  }

  if (access === "checking") {
    return <section className="module-page"><p role="status">{t.checking}</p></section>;
  }

  if (access === "login") {
    return <section className="module-page">
      <div className="module-banner">
        <strong>{t.loginRequired}</strong>
        <p style={{ marginTop: 8 }}>
          <Link href={"/" + locale + "/login"}>{t.signIn}</Link>
        </p>
      </div>
      {message && <p role="status" style={{ marginTop: 18 }}>{message}</p>}
    </section>;
  }

  return <section className="module-page">
    <header className="module-header">
      <div>
        <p className="module-kicker">A1 MOBI · ACCOUNT SECURITY</p>
        <h1>{t.title}</h1>
        <p className="module-sub">{t.intro}</p>
      </div>
    </header>

    <div style={{ maxWidth: 760, display: "grid", gap: 18 }}>
      <article className="activity-card" style={{ marginTop: 0 }}>
        <strong>{enabled ? t.enabled : t.disabled}</strong>
      </article>

      {!enabled && !setup && <form className="activity-card" style={{ marginTop: 0 }}
        onSubmit={beginSetup}>
        <label>{t.currentPassword}
          <input name="currentPassword" type="password" required maxLength={256}
            autoComplete="current-password" style={inputStyle} />
        </label>
        <button className="primary" style={{ marginTop: 16 }} disabled={Boolean(busy)}>
          {busy === "setup" ? t.setupBusy : t.setup}
        </button>
      </form>}

      {!enabled && setup && <article className="activity-card" style={{ marginTop: 0 }}>
        <h2 style={{ marginBottom: 12 }}>{t.recoveryCodes}</h2>
        <p style={{ color: "#9a3412", fontWeight: 700 }}>{t.recoveryWarning}</p>

        <p style={{ marginTop: 16 }}>
          <strong>{t.secret}: </strong>
          <code dir="ltr" style={{ userSelect: "all" }}>{setup.secret}</code>
        </p>
        <p style={{ marginTop: 10 }}>
          <a href={setup.otpauthUri}>{t.openAuthenticator}</a>
        </p>

        <div dir="ltr" style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
          gap: 8,
          marginTop: 16,
        }}>
          {setup.recoveryCodes.map(code => <code key={code} style={{
            padding: 10,
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            background: "#f8fafc",
            userSelect: "all",
          }}>{code}</code>)}
        </div>

        <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}>
          <input type="checkbox" checked={saved}
            onChange={event => setSaved(event.target.checked)} />
          <span>{t.saved}</span>
        </label>

        <form onSubmit={enable} style={{ marginTop: 18 }}>
          <label>{t.code}
            <input name="code" inputMode="numeric" autoComplete="one-time-code"
              pattern="[0-9]{6}" minLength={6} maxLength={6} required
              dir="ltr" style={inputStyle} />
          </label>
          <button className="primary" style={{ marginTop: 16 }}
            disabled={Boolean(busy) || !saved}>
            {busy === "enable" ? t.enabling : t.enable}
          </button>
        </form>
      </article>}

      {enabled && <form className="activity-card" style={{ marginTop: 0 }} onSubmit={disable}>
        <p style={{ marginBottom: 16 }}>{t.disableIntro}</p>
        <div style={{ display: "grid", gap: 16 }}>
          <label>{t.currentPassword}
            <input name="currentPassword" type="password" required maxLength={256}
              autoComplete="current-password" style={inputStyle} />
          </label>
          <label>{t.factor}
            <input name="factor" required minLength={6} maxLength={32}
              autoComplete="one-time-code" dir="ltr" style={inputStyle} />
          </label>
        </div>
        <button className="primary" style={{ marginTop: 16 }} disabled={Boolean(busy)}>
          {busy === "disable" ? t.disabling : t.disable}
        </button>
      </form>}

      {message && <div className="module-banner"
        role={success ? "status" : "alert"}>
        <strong>{message}</strong>
      </div>}

      <p>
        <Link href={"/" + locale + "/login"}>{t.back}</Link>
      </p>
    </div>
  </section>;
}
