import Link from "next/link";
import { notFound } from "next/navigation";

const copy = {
  ar: {
    title: "مرحبًا في A1 Mobi", subtitle: "مساحات عمل متجر الجوالات والصيانة",
    preview: "معاينة ببيانات توضيحية — لا تعكس عمليات المتجر الفعلية",
    overview: "نظرة عامة", sample: "بيانات توضيحية", sales: "مبيعات اليوم",
    profit: "صافي الربح", repairs: "أجهزة قيد الصيانة", stock: "تنبيهات المخزون",
    quick: "إجراءات سريعة", quickHint: "اختر مساحة العمل لبدء رحلتك",
    sale: "عملية بيع جديدة", trust: "فحص جهاز", repair: "استلام صيانة",
    inventory: "المخزون والأجهزة", topup: "شحن رصيد", open: "افتح القسم",
    activity: "آخر العمليات", columns: ["العملية","العميل","الوقت","المبلغ","الحالة"],
    complete: "مكتملة", inRepair: "قيد الصيانة",
  },
  en: {
    title: "Welcome to A1 Mobi", subtitle: "Workspaces for mobile retail and repair",
    preview: "Preview with sample data — not actual store activity",
    overview: "Overview", sample: "Sample data", sales: "Today's sales",
    profit: "Net profit", repairs: "Devices in repair", stock: "Stock alerts",
    quick: "Quick actions", quickHint: "Choose a workspace to start your journey",
    sale: "New sale", trust: "Device check", repair: "Repair intake",
    inventory: "Inventory & devices", topup: "Top-up", open: "Open workspace",
    activity: "Recent activity", columns: ["Transaction","Customer","Time","Amount","Status"],
    complete: "Completed", inRepair: "In repair",
  },
};
const metrics = [
  { key: "sales", value: "$1,284.50", deltaAr: "+12.5%", deltaEn: "+12.5%", tone: "blue", icon: "↗" },
  { key: "profit", value: "$342.80", deltaAr: "+8.2%", deltaEn: "+8.2%", tone: "green", icon: "⌁" },
  { key: "repairs", value: "18", deltaAr: "5 جاهزة", deltaEn: "5 ready", tone: "amber", icon: "◇" },
  { key: "stock", value: "7", deltaAr: "تحتاج متابعة", deltaEn: "Needs attention", tone: "rose", icon: "!" },
] as const;
const rows = [
  ["#INV-2841","محمد أحمد","Mohammad Ahmad","10:42","$485.00",false],
  ["#REP-0928","سارة خالد","Sara Khaled","10:18","$75.00",true],
  ["#INV-2840","عميل نقدي","Walk-in customer","09:51","$214.50",false],
  ["#TOP-1184","كريم حسن","Karim Hassan","09:34","$20.00",false],
] as const;

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  const ar = locale === "ar", t = copy[locale];
  const quick = [[t.sale,"▣","blue","pos"],[t.trust,"⌕","violet","device-trust"],
    [t.repair,"◇","amber","repairs"],[t.inventory,"□","green","inventory"],[t.topup,"↗","cyan","topup"]];
  return <main className="content">
    <section className="welcome"><div><p className="eyebrow">A1 MOBI</p>
      <h1>{t.title}</h1><p>{t.subtitle}</p><p className="preview-notice" role="status">{t.preview}</p>
    </div><Link className="primary" href={`/${locale}/pos`}><span aria-hidden="true">＋</span>{t.sale}</Link></section>
    <section className="section-head"><h2>{t.overview}</h2><span className="period">{t.sample}</span></section>
    <section className="metrics" aria-label={t.overview}>{metrics.map(m =>
      <article className="metric" key={m.key}><div className={"metric-icon "+m.tone} aria-hidden="true">{m.icon}</div>
        <div className="metric-body"><p>{t[m.key]}</p><strong><bdi dir="ltr">{m.value}</bdi></strong>
          <small className={m.tone}>{ar ? m.deltaAr : m.deltaEn}</small></div></article>)}</section>
    <section className="quick-card"><div className="section-head"><div><h2>{t.quick}</h2><p>{t.quickHint}</p></div></div>
      <div className="quick-grid">{quick.map(([label,icon,tone,module]) =>
        <Link className="quick-action" href={`/${locale}/${module}`} key={module}>
          <span className={"quick-icon "+tone} aria-hidden="true">{icon}</span><b>{label}</b><small>{t.open}</small>
        </Link>)}</div></section>
    <section className="activity-card"><div className="section-head"><div><h2>{t.activity}</h2><p>{t.sample}</p></div></div>
      <div className="table-wrap"><table><caption className="sr-only">{t.activity} · {t.sample}</caption>
        <thead><tr>{t.columns.map(c => <th scope="col" key={c}>{c}</th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row[0]}><td><b className="invoice"><bdi dir="ltr">{row[0]}</bdi></b></td>
          <td>{ar ? row[1] : row[2]}</td><td><bdi dir="ltr">{row[3]}</bdi></td><td><bdi dir="ltr">{row[4]}</bdi></td>
          <td><span className={"pill "+(row[5] ? "pending" : "done")}>{row[5] ? t.inRepair : t.complete}</span></td>
        </tr>)}</tbody></table></div></section>
    <footer><span>A1 Mobi · Store Platform</span><span>{t.preview}</span></footer>
  </main>;
}
