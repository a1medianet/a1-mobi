import Link from "next/link";
import { currentStoreContext } from "@/server/auth-http";
import { getBranchOperatingReport } from "@/modules/reports/branch-operating-report";

const copy = {
  ar: {
    back:"لوحة التحكم",title:"تقرير الفرع",sub:"مؤشرات البيع والتحصيل والحركات المعتمدة لهذا الفرع",
    notice:"بيئة اختبار: المؤشرات من سجلات الفرع خلال آخر 30 يومًا، وليست تقريرًا محاسبيًا معتمدًا.",
    gross:"المبيعات المسجلة",returns:"المرتجعات المنفذة",
    net:"المبيعات بعد المرتجعات",repair:"تحصيل الصيانة",variance:"فروق الصندوق المغلق",
    saleCount:"عدد عمليات البيع",returnCount:"عدد المرتجعات",
    active:"صيانة مفتوحة حاليًا",customers:"عملاء الفرع المسجلون",
    title2:"حدود التقرير", note:"المبيعات هنا تعني قيم عمليات البيع المسجلة، وليست بالضرورة نقدًا محصّلًا. تحصيل الصيانة من المدفوعات المنشورة فقط. لا نعرض هامش ربح أو قيمة مخزون أو دين فرع دون مطابقة مستقلة.",
    denied:"ليس لديك إذن للاطلاع على التقارير.",
  },
  en: {
    back:"Dashboard",title:"Branch report",sub:"Recorded sales, collections and operating figures for this branch",
    notice:"Test environment: metrics come from branch records over the past 30 days, not certified accounts.",
    gross:"Recorded sales",returns:"Posted returns",
    net:"Sales less returns",repair:"Repair collections",variance:"Closed drawer variances",
    saleCount:"Sales records",returnCount:"Posted returns count",
    active:"Currently open repairs",customers:"Registered branch customers",
    title2:"Reading this report",note:"Recorded sales are not necessarily cash received. Repair collections include posted payments only. Profit, stock valuation and branch debt are intentionally omitted pending independent reconciliation.",
    denied:"You do not have permission to view reports.",
  },
} as const;

export default async function BranchOwnerReport({locale}:{locale:"ar"|"en"}) {
  const t=copy[locale];
  let ctx;
  try{ctx=await currentStoreContext("reports.read");}
  catch(error){
    if(error instanceof Error&&error.message==="PERMISSION_DENIED")
      return <main className="module-page"><p className="preview-notice" role="alert">{t.denied}</p></main>;
    throw error;
  }
  const data=await getBranchOperatingReport({tenantId:ctx.tenantId,branchId:ctx.branchId});
  const money=(n:number)=>new Intl.NumberFormat(locale==="ar"?"ar-LB":"en-US",
    {minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+" USD";
  const cards=[
    [t.gross,money(data.grossRecordedSalesUsd),"blue"],
    [t.returns,money(data.postedReturnsUsd),"rose"],
    [t.net,money(data.salesAfterReturnsUsd),"green"],
    [t.repair,money(data.repairCollectedUsd),"amber"],
    [t.variance,money(data.cashClosedVarianceUsd),"blue"],
    [t.saleCount,String(data.saleCount),"green"],
    [t.returnCount,String(data.returnCount),"rose"],
    [t.active,String(data.openRepairs),"amber"],
    [t.customers,String(data.registeredCustomers),"blue"],
  ] as const;
  return <main className="module-page">
    <header className="module-header"><div>
      <Link href={"/"+locale} className="back-link">{t.back}</Link>
      <p className="module-kicker">A1 MOBI · REPORTS</p>
      <h1>{t.title}</h1><p className="module-sub">{t.sub}</p>
    </div></header>
    <p className="preview-notice">{t.notice}</p>
    <section className="report-grid" aria-label={t.title}>{cards.map(([label,value,tone])=>
      <article className="report-card" key={label}>
        <small>{label}</small><strong><bdi dir="auto">{value}</bdi></strong>
        <span className={"report-tone "+tone}/>
      </article>)}</section>
    <section className="quick-card"><div className="section-head"><div>
      <h2>{t.title2}</h2><p>{t.note}</p>
    </div></div></section>
  </main>;
}
