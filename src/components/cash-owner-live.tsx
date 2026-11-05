import { formatUsd } from "@/core/config/number-format";
import { CashOpenPanel } from "@/components/cash-open-panel";
import Link from "next/link";
import { currentStoreContext } from "@/server/auth-http";
import { getBranchCashSnapshot } from "@/modules/cash/cash-owner-snapshot";
import CashClosePanel from "@/components/cash-close-panel";

const labels = {
  ar: {
    title: "الصندوق", back: "لوحة التحكم",
    sub: "الجلسة والحركات المالية المسجلة في فرعك",
    notice: "بيئة اختبار: البيانات من سجلات الصندوق المحفوظة وليست أرصدة مصرفية أو أرقامًا افتراضية.",
    status: "حالة الجلسة", open: "مفتوحة", closed: "مغلقة", none: "لا توجد جلسة",
    usd: "الرصيد المتوقع USD", lbp: "الرصيد المتوقع LBP",
    variance: "فرق الإغلاق بالدولار", notClosed: "يُحسب عند الإغلاق",
    movements: "آخر حركات الصندوق", type: "نوع الحركة", value: "المبلغ", at: "التاريخ",
    empty: "لا توجد جلسة صندوق مسجلة لهذا الفرع.", noMovements: "لا توجد حركات بعد.",
    denied: "ليس لديك إذن للاطلاع على الصندوق.", in: "إيداع", out: "صرف",
  },
  en: {
    title: "Cash drawer", back: "Dashboard",
    sub: "Recorded drawer session and movements for your branch",
    notice: "Test environment: these values come from saved drawer entries, not a bank balance or demo figures.",
    status: "Drawer session", open: "Open", closed: "Closed", none: "No session",
    usd: "Expected USD", lbp: "Expected LBP",
    variance: "Closing variance USD", notClosed: "Calculated on closing",
    movements: "Recent drawer movements", type: "Movement", value: "Amount", at: "Date",
    empty: "No cash session recorded for this branch.", noMovements: "No movements yet.",
    denied: "You do not have permission to view cash.", in: "In", out: "Out",
  },
} as const;

function movementName(type: string, locale: "ar" | "en") {
  const names: Record<string, [string, string]> = {
    SALE: ["مبيعات", "Sale"], REPAIR: ["صيانة", "Repair"],
    EXPENSE: ["مصروف", "Expense"], DEPOSIT: ["إيداع", "Deposit"],
    WITHDRAWAL: ["سحب", "Withdrawal"], ADJUSTMENT: ["تسوية", "Adjustment"],
    REFUND: ["استرداد", "Refund"], TOP_UP: ["تعبئة", "Top-up"],
    DEBT_COLLECTION: ["تحصيل دين", "Debt collection"],
  };
  return names[type]?.[locale === "ar" ? 0 : 1] ?? (locale === "ar" ? "حركة أخرى" : "Other movement");
}

export default async function CashOwnerLivePage({ locale }: { locale: "ar" | "en" }) {
  const t = labels[locale];
  let context;
  try { context = await currentStoreContext("cash.manage"); }
  catch (error) {
    if (error instanceof Error && error.message === "PERMISSION_DENIED")
      return <main className="module-page"><p className="preview-notice" role="alert">{t.denied}</p></main>;
    throw error;
  }
  const snapshot = await getBranchCashSnapshot({ tenantId: context.tenantId, branchId: context.branchId });

  const statusLabel = snapshot.status === "OPEN" ? t.open : snapshot.status === "CLOSED" ? t.closed : t.none;
  const money = (value: number | null, currency: string) => value === null ? "—" : currency === "USD" ? formatUsd(value) :
    new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-US", {
      numberingSystem:"latn", minimumFractionDigits: currency === "LBP" ? 0 : 2,
      maximumFractionDigits: currency === "LBP" ? 0 : 2,
    }).format(value) + " " + currency;
  const when = (time: string) => new Intl.DateTimeFormat(
    locale === "ar" ? "ar-LB" : "en-GB", { numberingSystem: "latn", dateStyle: "short", timeStyle: "short", timeZone: "Asia/Beirut" },
  ).format(new Date(time));

  return <main className="module-page">
    <header className="module-header"><div>
      <Link href={"/" + locale} className="back-link">{t.back}</Link>
      <p className="module-kicker">A1 MOBI · CASH</p>
      <h1>{t.title}</h1><p className="module-sub">{t.sub}</p>
    </div></header>
    <p className="preview-notice">{t.notice}</p>
    <section className="metrics ops-metrics" aria-label={t.title}>
      {([
        [t.status, statusLabel, "blue", "▤"],
        [t.usd, money(snapshot.expectedUsd, "USD"), "green", "$"],
        [t.lbp, money(snapshot.expectedLbp, "LBP"), "amber", "₤"],
        [t.variance, snapshot.varianceBase === null ? t.notClosed : money(snapshot.varianceBase, "USD"),
          snapshot.varianceBase === null || snapshot.varianceBase === 0 ? "green" : "rose", "="],
      ] as const).map(([title, value, tone, symbol]) =>
        <article className="metric" key={title}><div className={"metric-icon " + tone}>{symbol}</div>
          <div className="metric-body"><p>{title}</p><strong><bdi dir="auto">{value}</bdi></strong></div>
        </article>)}
    </section>
    {snapshot.status === "OPEN" && snapshot.sessionId && snapshot.openingExchangeRate
      ? <CashClosePanel locale={locale} cashSessionId={snapshot.sessionId}
        openingRate={snapshot.openingExchangeRate} /> : null}
    {snapshot.status !== "OPEN" && <CashOpenPanel locale={locale} />}
    {snapshot.status === "NONE" ?
      <section className="activity-card"><p role="status">{t.empty}</p></section> :
      <section className="activity-card">
        <div className="section-head"><div><h2>{t.movements}</h2>
          <p>{snapshot.openedAt ? when(snapshot.openedAt) : ""}</p></div></div>
        <div className="table-wrap"><table><thead><tr>
          <th>{t.type}</th><th>{t.value}</th><th>{t.at}</th>
        </tr></thead><tbody>{snapshot.movements.length === 0 ?
          <tr><td colSpan={3}>{t.noMovements}</td></tr> :
          snapshot.movements.map(m => <tr key={m.id}>
            <td>{movementName(m.type, locale)} · {m.direction === "IN" ? t.in : t.out}</td>
            <td><bdi dir="ltr">{money(m.amount, m.currency)}</bdi></td>
            <td><bdi dir="auto">{when(m.occurredAt)}</bdi></td>
          </tr>)}
        </tbody></table></div>
      </section>}
  </main>;
}
