import { redirect } from "next/navigation";
import { currentPlatformAdmin } from "@/server/platform-auth";
import PlatformLogoutButton from "./platform-logout-button";
export const dynamic = "force-dynamic";
export default async function PlatformConsolePage() {
  const admin = await currentPlatformAdmin();
  if (!admin) redirect("/platform/login");
  return <main dir="rtl" className="min-h-screen p-8 bg-slate-50 text-slate-900"><section className="mx-auto max-w-4xl space-y-5"><p className="text-sm text-slate-500">A1 MOBI · PLATFORM CONTROL</p><h1 className="text-3xl font-bold">إدارة المنصة</h1><p>مرحبًا، {admin.email}</p><div className="rounded-xl border bg-white p-6"><h2 className="font-semibold">حساب المالك الأعلى</h2><p className="text-sm text-slate-600 mt-2">جلسة مستقلة عن حسابات المتاجر. إدارة العملاء والاشتراكات ستُفتح بعد اختبارات الصلاحيات.</p></div><PlatformLogoutButton /></section></main>;
}
