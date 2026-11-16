import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlatformAdmin } from "@/server/platform-auth";
import { readPlatformOverview } from "@/server/platform-overview";
import PlatformLogoutButton from "./platform-logout-button";

export const dynamic = "force-dynamic";

export default async function PlatformConsolePage() {
  const admin = await currentPlatformAdmin();
  if (!admin) redirect("/platform/login");
  const data = await readPlatformOverview();
  return <main dir="rtl" className="min-h-screen bg-slate-50 p-5 text-slate-900 md:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">A1 MOBI · PLATFORM CONTROL</p>
          <h1 className="mt-1 text-3xl font-bold">إدارة المنصة</h1>
          <p className="mt-2 text-sm text-slate-600" dir="ltr">{admin.email}</p>
        </div>
        <PlatformLogoutButton/>
      </header>
      <section aria-label="ملخص المنصة" className="grid gap-3 sm:grid-cols-3">
        {([
          ["المتاجر", data.tenantCount], ["الفروع", data.branchCount], ["المستخدمون", data.userCount],
        ] as const).map(([label,value]) => <article key={label} className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-600">{label}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
        </article>)}
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-semibold">جاهزية استقبال المتاجر</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg bg-slate-100 px-3 py-2">التسجيل العام: {data.trialSignupEnabled ? "مفعّل" : "مغلق"}</span>
          <span className="rounded-lg bg-slate-100 px-3 py-2">إعداد الاتصال بالفوترة: {data.billingConfigured ? "موجود، لم يُختبر هنا" : "غير مكتمل"}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">ظهور إعداد اتصال بالفوترة لا يثبت حالة الاشتراك أو إتمام تجربة العميل. لا تُنشئ هذه الصفحة متجرًا ولا تغيّر اشتراكًا.</p>
        <Link href="/product/ar/signup" className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold">معاينة تسجيل متجر</Link>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-semibold">سجل المتاجر</h2><p className="mt-1 text-sm text-slate-600">عرض للمتاجر الموجودة فقط، دون منح حساب المالك وصولًا إلى بيانات تشغيل المتجر.</p></div>
        {data.tenants.length === 0 ? <p className="p-6 text-slate-600">لا توجد متاجر مسجلة في قاعدة هذه البيئة حاليًا. حساب المالك الأعلى مستقل عن حساب المتجر.</p> :
          <div className="overflow-x-auto"><table className="w-full text-right text-sm">
            <thead className="bg-slate-50"><tr>{["المتجر","المعرّف","الفروع","المستخدمون","المنتجات","الفوترة"].map(x=><th scope="col" key={x} className="whitespace-nowrap p-3">{x}</th>)}</tr></thead>
            <tbody>{data.tenants.map(tenant=><tr key={tenant.id} className="border-t border-slate-100">
              <td className="p-3 font-semibold">{tenant.name}</td><td dir="ltr" className="p-3 text-right">{tenant.slug}</td>
              <td className="p-3 tabular-nums">{tenant._count.branches}</td><td className="p-3 tabular-nums">{tenant._count.users}</td>
              <td className="p-3 tabular-nums">{tenant._count.products}</td>
              <td className="p-3">{tenant.billingTenantKey ? "معرّف مرتبط؛ الحالة غير مؤكدة" : "غير مرتبط"}</td>
            </tr>)}</tbody>
          </table></div>}
        {data.hasMoreTenants&&<p className="border-t p-3 text-sm text-slate-600">تظهر أول 50 جهة فقط. يلزم ترقيم صفحات للعدد الأكبر.</p>}
      </section>
    </div>
  </main>;
}
