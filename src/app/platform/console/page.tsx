import Link from "next/link";
import { redirect } from "next/navigation";
import { currentPlatformAdmin } from "@/server/platform-auth";
import { readPlatformOverview } from "@/server/platform-overview";
import PlatformLogoutButton from "./platform-logout-button";

export const dynamic = "force-dynamic";
const tabs=[
 {id:"overview",label:"نظرة عامة"},{id:"stores",label:"المتاجر والفروع"},
 {id:"subscriptions",label:"الاشتراكات والخطط"},{id:"security",label:"A1 Login والأمان"},
 {id:"integrations",label:"الإضافات والتكامل"},{id:"operations",label:"النظام والتشغيل"},
] as const;
const tile="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
export default async function PlatformConsolePage(){
 const admin=await currentPlatformAdmin();
 if(!admin)redirect("/platform/login");
 const data=await readPlatformOverview();
 return <main dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
  <div className="mx-auto flex max-w-screen-2xl flex-col gap-6 px-4 py-6 lg:flex-row lg:gap-8 lg:px-8">
   <aside aria-label="قائمة إدارة المنصة" className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-64 lg:shrink-0">
    <div className="rounded-2xl bg-slate-900 p-5 text-white">
     <p className="text-xs tracking-wider text-cyan-200" dir="ltr">A1 MOBI · PLATFORM CONTROL</p>
     <h1 className="mt-2 text-xl font-bold">إدارة المنصة</h1>
     <p className="mt-1 break-all text-xs text-slate-300" dir="ltr">{admin.email}</p>
     <nav className="mt-6 flex flex-wrap gap-1 lg:flex-col">
      {tabs.map(t=><a key={t.id} href={"#"+t.id}
       className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-cyan-300">{t.label}</a>)}
     </nav>
     <div className="mt-5 border-t border-white/20 pt-4"><PlatformLogoutButton/></div>
    </div>
   </aside>
   <div className="min-w-0 flex-1 space-y-6">
    <header id="overview" className="space-y-2 scroll-mt-6">
     <p className="text-sm text-slate-500">لوحة المالك الأعلى · بيانات حقيقية من البيئة الحالية</p>
     <h2 className="text-2xl font-bold">مركز التحكم A1 Mobi</h2>
     <p className="text-sm text-slate-600">إدارة البنية والحسابات والاشتراكات دون الدخول تلقائيًا إلى بيانات تشغيل المتاجر.</p>
    </header>
    <section aria-label="المؤشرات" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
     {([
      ["المتاجر",data.tenantCount],["الفروع",data.branchCount],["مستخدمو المتاجر",data.userCount],
      ["جلسات إدارة المنصة",data.activeSessions],["أحداث تدقيق آخر 24 ساعة",data.recentAuditEvents],
      ["خصائص مفعّلة بالمتاجر",data.flaggedStores],
     ] as const).map(([name,n])=><div key={name} className={tile}>
       <p className="text-sm text-slate-500">{name}</p>
       <p className="mt-2 text-3xl font-bold tabular-nums">{n}</p>
      </div>)}
    </section>
    <section id="stores" className={tile+" scroll-mt-6"}>
     <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">المتاجر والفروع</h2>
       <p className="text-sm text-slate-500">سجل منصة مستقل لا يفتح بيانات مبيعات العملاء.</p></div>
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm">العدد الكلي: {data.tenantCount}</span>
     </div>
     <div className="mt-4 overflow-x-auto">
      <table className="w-full text-right text-sm"><thead className="bg-slate-100"><tr>
       {["المتجر","المعرّف","الفروع","المستخدمون","المنتجات","الفوترة"].map(v=>
        <th key={v} scope="col" className="whitespace-nowrap p-3">{v}</th>)}
      </tr></thead><tbody>
       {data.tenants.map(t=><tr key={t.id} className="border-b border-slate-100">
        <td className="p-3 font-semibold">{t.name}</td><td className="p-3" dir="ltr">{t.slug}</td>
        <td className="p-3 tabular-nums">{t._count.branches}</td>
        <td className="p-3 tabular-nums">{t._count.users}</td>
        <td className="p-3 tabular-nums">{t._count.products}</td>
        <td className="p-3">{t.billingTenantKey?"معرّف مرتبط، الحالة غير متحققة":"غير مرتبط"}</td>
       </tr>)}
      </tbody></table>
      {data.tenants.length===0&&<p className="p-4 text-sm text-slate-500">لا توجد متاجر.</p>}
     </div>
     {data.hasMoreTenants&&<p className="mt-3 text-sm text-amber-700">تظهر أول 50 جهة فقط؛ ترقيم الصفحات قيد التطوير.</p>}
     <p className="mt-3 text-xs text-slate-500">إدارة التعليق والإنشاء ستُفعَّل فقط بعد تهيئة التدقيق وقواعد الصلاحيات؛ هذه الصفحة لا تغيّر بيانات الإنتاج.</p>
    </section>
    <section id="subscriptions" className={tile+" scroll-mt-6"}>
     <h2 className="text-lg font-bold">الاشتراكات والخطط</h2>
     <div className="mt-3 flex flex-wrap gap-2 text-sm">
      <span className="rounded-lg bg-slate-100 p-2">التسجيل العام: {data.trialSignupEnabled?"مفعّل":"مغلق"}</span>
      <span className="rounded-lg bg-slate-100 p-2">اتصال A1 Billing: {data.billingConfigured?"تهيئة موجودة، لم يُثبت الاشتراك":"غير مكتمل"}</span>
     </div>
     <p className="mt-3 text-sm text-slate-600">لا تعرض هذه اللوحة اشتراكات مُحصّلة أو أسعارًا من دون استعلام موثّق من A1 Billing.</p>
     <Link href="/product/ar/signup" className="mt-3 inline-block rounded-lg border p-2 text-sm font-medium">معاينة تسجيل متجر</Link>
    </section>
    <section id="security" className={tile+" scroll-mt-6"}>
     <h2 className="text-lg font-bold">A1 Login والأمان</h2>
     <p className="mt-2 text-sm">دخول المالك مستقل عن حسابات المتاجر، مع MFA إلزامي. لا يمنح ذلك صلاحية صندوق أي متجر.</p>
     <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      تسليم رسائل استرداد كلمة المرور: {data.recoveryDeliveryConfigured?"إعدادات أولية موجودة، تحتاج اختبار وصول فعلي":"غير مهيّأ للإنتاج"}.
      البريد البديل لا يصبح معتمدًا حتى يؤكد صاحبه رابط التوثيق.
     </div>
     <Link href="/platform/security" className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">إدارة بريد استرداد المالك</Link>
    </section>
    <section id="integrations" className={tile+" scroll-mt-6"}>
     <h2 className="text-lg font-bold">الإضافات والتكامل</h2>
     <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">A1 Recharge</h3><p className="mt-1 text-sm text-slate-600">تجربة Sandbox: {data.rechargeSandboxEnabled?"مفعّلة لهذا النشر":"غير مفعّلة على الإنتاج"}.</p></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-semibold">A1 Billing</h3><p className="mt-1 text-sm text-slate-600">التكامل الفني مستقل، ولا يُعد الاشتراك نشطًا من إعداد الاتصال وحده.</p></div>
     </div>
    </section>
    <section id="operations" className={tile+" scroll-mt-6"}>
     <h2 className="text-lg font-bold">النظام والتشغيل</h2>
     <p className="mt-2 text-sm text-slate-600">حالة الخدمات، وسجل الحوادث، والاستعادة ستُربط بخدمات A1 Guard وA1 Recover مع صلاحيات وتدقيق مستقلين.</p>
     <p className="mt-2 text-xs text-slate-500">لا يتم تنفيذ أوامر الخادم أو حذف قواعد البيانات من هذه اللوحة.</p>
    </section>
   </div>
  </div>
 </main>;
}
