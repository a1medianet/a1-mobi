import Link from "next/link";
import { notFound } from "next/navigation";
import { demoCatalogCounts, demoStore, demoTransactions } from "@/demo/data";

const copy = {
  ar: {
    title: "صباح العمل من مكان واحد",
    subtitle: "بيع، مخزون، صيانة، عملاء وصندوق — ضمن تجربة متجر موحدة.",
    demo: "وضع التدريب",
    demoNote: "بيانات واقعية للتجربة وليست سجلات مالية أو مخزون إنتاجي.",
    newSale: "عملية بيع جديدة",
    admin: "الإدارة",
    products: "المنتجات",
    overview: "ملخص اليوم",
    sales: "مبيعات اليوم",
    profit: "هامش تقديري",
    repairs: "صيانة مفتوحة",
    stock: "تنبيهات المخزون",
    catalog: "منتجات الكتالوج",
    serialized: "وحدات IMEI / Serial",
    quick: "ابدأ من هنا",
    quickHint: "مسارات المتجر الأساسية جاهزة للمعاينة والتجربة.",
    trust: "فحص IMEI",
    repair: "استلام صيانة",
    inventory: "المخزون والأجهزة",
    topup: "التعبئة",
    open: "فتح",
    activity: "أمثلة على حركة المتجر",
    columns: ["المرجع","العميل","الوقت","المبلغ","الحالة"],
    completed: "مكتملة",
    inRepair: "قيد الصيانة",
    ready: "جاهزة",
    store: "متجر نموذجي",
  },
  en: {
    title: "Run the day from one place",
    subtitle: "Sales, inventory, repair, customers and cash in one store experience.",
    demo: "Practice mode",
    demoNote: "Realistic demo data only — not production stock or accounting records.",
    newSale: "New sale",
    admin: "Admin",
    products: "Products",
    overview: "Today at a glance",
    sales: "Today's sales",
    profit: "Estimated margin",
    repairs: "Open repairs",
    stock: "Stock alerts",
    catalog: "Catalog products",
    serialized: "IMEI / Serial units",
    quick: "Start here",
    quickHint: "Core store journeys are ready for visual pilot testing.",
    trust: "IMEI check",
    repair: "Repair intake",
    inventory: "Inventory & devices",
    topup: "Top-up",
    open: "Open",
    activity: "Sample store activity",
    columns: ["Reference","Customer","Time","Amount","Status"],
    completed: "Completed",
    inRepair: "In repair",
    ready: "Ready",
    store: "Sample store",
  },
} as const;

export default async function Dashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "ar" && locale !== "en") notFound();
  const ar = locale === "ar";
  const t = copy[locale];
  const counts = demoCatalogCounts();
  const metrics = [
    { label:t.sales, value:"$2,284.00", delta:ar?"+ 6 عمليات":"+ 6 sales", tone:"blue", icon:"↗" },
    { label:t.profit, value:"$612.40", delta:ar?"26.8% من المبيعات":"26.8% of sales", tone:"green", icon:"⌁" },
    { label:t.repairs, value:"9", delta:ar?"3 جاهزة للتسليم":"3 ready to deliver", tone:"amber", icon:"◇" },
    { label:t.stock, value:String(counts.lowStock), delta:ar?"تحتاج متابعة":"Need attention", tone:"rose", icon:"!" },
  ];
  const quick = [
    [t.newSale,"▣","blue","pos"],[t.products,"▦","green","products"],[t.trust,"⌕","violet","device-trust"],
    [t.repair,"◇","amber","repairs"],[t.inventory,"□","green","inventory"],[t.topup,"↗","cyan","topup"],
  ] as const;
  const statusLabel = (status: string) => status === "IN_REPAIR" ? t.inRepair : status === "READY" ? t.ready : t.completed;

  return <main className="content pilot-dashboard">
    <section className="welcome pilot-welcome">
      <div>
        <div className="eyebrow-row"><p className="eyebrow">A1 MOBI</p><span className="demo-chip">{t.demo}</span></div>
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <div className="store-line"><b>{t.store}</b><span>·</span><span>{ar?demoStore.branchAr:demoStore.branchEn}</span></div>
        <p className="preview-notice" role="status">{t.demoNote}</p>
      </div>
      <div className="hero-actions">
        <Link className="soft-btn" href={"/"+locale+"/admin"}>{t.admin}</Link>
        <Link className="primary" href={"/"+locale+"/pos"}><span aria-hidden="true">＋</span>{t.newSale}</Link>
      </div>
    </section>

    <section className="section-head"><h2>{t.overview}</h2><span className="period">{t.demo}</span></section>
    <section className="metrics" aria-label={t.overview}>{metrics.map(metric =>
      <article className="metric" key={metric.label}>
        <div className={"metric-icon "+metric.tone} aria-hidden="true">{metric.icon}</div>
        <div className="metric-body"><p>{metric.label}</p><strong><bdi dir="ltr">{metric.value}</bdi></strong>
          <small className={metric.tone}>{metric.delta}</small></div>
      </article>)}
    </section>

    <section className="pilot-secondary-metrics">
      <article><span>▦</span><div><small>{t.catalog}</small><strong>{counts.total}</strong></div></article>
      <article><span>#</span><div><small>{t.serialized}</small><strong>{counts.serializedUnits}</strong></div></article>
    </section>

    <section className="quick-card">
      <div className="section-head"><div><h2>{t.quick}</h2><p>{t.quickHint}</p></div></div>
      <div className="quick-grid pilot-quick-grid">{quick.map(([label,icon,tone,module]) =>
        <Link className="quick-action" href={"/"+locale+"/"+module} key={module}>
          <span className={"quick-icon "+tone} aria-hidden="true">{icon}</span><b>{label}</b><small>{t.open}</small>
        </Link>)}</div>
    </section>

    <section className="activity-card">
      <div className="section-head"><div><h2>{t.activity}</h2><p>{t.demoNote}</p></div>
        <Link className="text-link" href={"/"+locale+"/products"}>{t.products} →</Link>
      </div>
      <div className="table-wrap"><table><caption className="sr-only">{t.activity}</caption>
        <thead><tr>{t.columns.map(column => <th scope="col" key={column}>{column}</th>)}</tr></thead>
        <tbody>{demoTransactions.map(row => <tr key={row.id}>
          <td><b className="invoice"><bdi dir="ltr">#{row.id}</bdi></b></td>
          <td>{ar?row.customerAr:row.customerEn}</td>
          <td><bdi dir="ltr">{row.time}</bdi></td>
          <td><bdi dir="ltr">{"$"+row.amount.toFixed(2)}</bdi></td>
          <td><span className={"pill "+(row.status==="COMPLETED"?"done":"pending")}>{statusLabel(row.status)}</span></td>
        </tr>)}</tbody>
      </table></div>
    </section>
    <footer><span>A1 Mobi · {t.demo}</span><span>{t.demoNote}</span></footer>
  </main>;
}
