type Operation = { kind: "sale" | "repair" | "topup" };
const kinds = ["sale", "repair", "topup"] as const;
const labels = {
  ar: { sale: "بيع", repair: "صيانة", topup: "تعبئة" },
  en: { sale: "Sale", repair: "Repair", topup: "Top-up" },
} as const;

export function operationBreakdown(rows: readonly Operation[]) {
  const total = rows.length;
  const counts = kinds.map(kind => rows.filter(row => row.kind === kind).length);
  const widths = counts.map(count => total ? count / total * 100 : 0);
  // Largest remainders: readable whole percentages sum to 100 for nonempty data.
  const shares = widths.map(Math.floor);
  const order = kinds.map((_, index) => index).sort((a, b) =>
    (widths[b] - shares[b]) - (widths[a] - shares[a]) || a - b);
  const remainder = total ? 100 - shares.reduce((sum, share) => sum + share, 0) : 0;
  for (let i = 0; i < remainder; i++) shares[order[i]]++;
  return { total, categories: kinds.map((kind, i) => ({ kind, count: counts[i], width: widths[i], share: shares[i] })) };
}

export function OperationBreakdownChart({ rows, locale }: { rows: readonly Operation[]; locale: "ar" | "en" }) {
  const ar = locale === "ar";
  const { total, categories } = operationBreakdown(rows);
  return <section className="mobi-c-insight" dir={ar ? "rtl" : "ltr"} aria-labelledby="operation-breakdown-title">
    <figure className="operation-breakdown-chart" aria-describedby="operation-breakdown-caption">
      <figcaption>
        <div className="operation-breakdown-heading">
          <h2 id="operation-breakdown-title">{ar ? "توزيع العمليات" : "Operation breakdown"}</h2>
        </div>
        <p id="operation-breakdown-caption" className="sr-only">{ar
          ? `توزيع ${total} عمليات تدريبية حسب النوع، وليس تقرير مبيعات يومية.`
          : `Distribution of ${total} training operations by type, not a daily sales report.`}</p>
      </figcaption>
      {total === 0 && <p className="operation-breakdown-empty">{ar ? "لا توجد عمليات تجريبية؛ جميع الأعداد والنسب صفر." : "No demo operations; all counts and shares are zero."}</p>}
      <div className="operation-breakdown-axis" aria-hidden="true"><span>0%</span><span>50%</span><span>100%</span></div>
      <ul className="operation-breakdown-rows operation-breakdown-columns">
        {categories.map(({ kind, count, width, share }) => <li key={kind}>
          <div className="operation-breakdown-label">
            <span>{labels[locale][kind]}</span>
            <strong><bdi dir={ar ? "rtl" : "ltr"}>{ar ? `${count} من ${total}` : `${count} of ${total}`}</bdi> <bdi dir="ltr">({share}%)</bdi></strong>
          </div>
          <div className="operation-breakdown-track" aria-hidden="true">
            <span className="operation-breakdown-fill" style={{ height: `${width}%` }} />
          </div>
        </li>)}
      </ul>
    </figure>
  </section>;
}
