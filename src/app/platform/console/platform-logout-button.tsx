"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function PlatformLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      const response = await fetch("/api/platform/logout", { method: "POST" });
      if (!response.ok) throw new Error("LOGOUT_FAILED");
      router.replace("/platform/login"); router.refresh();
    } catch { setBusy(false); }
  }
  return <button type="button" disabled={busy} onClick={logout} className="rounded-lg border p-3 disabled:opacity-50">{busy ? "جارٍ الخروج…" : "تسجيل الخروج"}</button>;
}
