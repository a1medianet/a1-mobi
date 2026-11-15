"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export default function PlatformLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [secondFactor, setSecondFactor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/platform/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "admin@a1mobi.app", password, secondFactor }) });
      if (!response.ok) { setError(response.status === 429 ? "محاولات كثيرة. حاول لاحقًا." : "تعذر تسجيل الدخول. تحقق من البيانات."); return; }
      router.replace("/platform/console"); router.refresh();
    } catch { setError("تعذر الاتصال بالخادم. حاول مجددًا."); }
    finally { setBusy(false); setPassword(""); setSecondFactor(""); }
  }
  return <main dir="rtl" className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900"><form onSubmit={submit} className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-8 space-y-5"><p className="text-sm text-slate-500">A1 MOBI · PLATFORM</p><h1 className="text-2xl font-bold">دخول مالك المنصة</h1><p className="text-sm text-slate-600">admin@a1mobi.app</p><label className="block space-y-2"><span>كلمة المرور</span><input type="password" autoComplete="current-password" required minLength={16} maxLength={256} value={password} onChange={e=>setPassword(e.target.value)} className="w-full rounded-lg border border-slate-300 p-3" /></label><label className="block space-y-2"><span>رمز التحقق الثنائي (6 أرقام)</span><input inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6}" maxLength={6} value={secondFactor} onChange={e=>setSecondFactor(e.target.value)} className="w-full rounded-lg border border-slate-300 p-3" /></label>{error && <p role="alert" className="text-red-700">{error}</p>}<button type="submit" disabled={busy} className="w-full rounded-lg bg-slate-900 text-white p-3 disabled:opacity-50">{busy ? "جارٍ التحقق…" : "تسجيل الدخول"}</button><p className="text-xs text-slate-500">هذه الواجهة مخصصة لإدارة المنصة، وليست لحسابات المتاجر.</p></form></main>;
}
