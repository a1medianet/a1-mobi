# A1 Mobi — Visual Analytics Map v1.0
Authority: A1 First / NAWA Way / Evidence First. Scope: Pilot v1.0, Thaghr only.
Status: DESIGN CONTRACT APPROVED BY OWNER; implementation is per gate, not claimed complete.

## Placement and hierarchy (AR and EN)
1. Dashboard: one dominant time-series chart directly below KPI strip, with Today / Week / Month / Year, previous period comparison, and branch selector. Compact three category breakdown beneath it only if it adds information. Never crowd the hero.
2. Sales / POS: recent invoice list and checkout remain primary; below the work area place compact sales trend and payment mix. Financial dashboards must never interrupt an active sale.
3. Repairs: work queue and status transitions remain primary; then status distribution and throughput/turnaround with an explicit period.
4. Inventory: low-stock action list remains first; then stock levels by category and intake/outflow trend. Counts and monetary valuation use distinct axes/charts.
5. Cash: opening/closing reconciliation first; then cash-in vs cash-out bars by currency. USD and LBP never add together as raw amounts.
6. Customers / debt: follow-up list first; then new vs returning customers and aging/collections.
7. Reports: full comparative analysis, detail table, export and advanced filters. Advanced visualizations belong here, not on every workflow page.
8. Mobile: one chart at a time, filters in a compact disclosure, tables available for exact figures, no horizontal page overflow.

## Universal filtering contract
- Periods: day, week, month, year, custom. All windows [from,to) in selected branch's timezone; label timezone explicitly.
- Comparison: immediately preceding EQUAL-DURATION complete window, corresponding prior-year window where calendar meaning is requested, or none. Current partial periods compare with equal elapsed time; full-period forecast prohibited by default.
- Valid filters: authenticated tenant (never user-selectable), authorized branch, operation type; employee/product/status only on matching data sets.
- No data: empty state; zero denominator: comparison is N/A, never Infinity or invented growth. Negative prior amounts: show absolute delta and explain rate inapplicability.
- The chart height/width is mathematical against a labelled baseline; financial series axis starts at zero for bars. Do not apply minimum bar heights to zero.
- Percent of total = category count / filtered total * 100; percent change = (current - previous)/abs(previous) * 100 only where previous > 0 and metric meaningful. Count, revenue, margin, collections, cash are NEVER interchangeable.
- Never mix USD and LBP in a single scalar; base-USD conversions only from stored transaction exchange rate, identified as converted.
- Sales: exclude voided and net posted returns by date; show gross, refunds and net separately. Payment collection is not the same as invoiced sales.
- Repair status charts use order count in exactly one state per as-of snapshot; completion is distinct from payment collection.

## Data contract, not demo
Source existing modules/reports/branch-operating-report.ts and report-service.ts, plus scoped source ledgers. First reconcile aggregation grain, authorization, timestamp, return policy and branch isolation; do not reuse demoTransactions for live owner metrics.
Each chart requires {metric,unit,timezone,period,comparison,branch,source,asOf,rows,emptyState}. DEMO label cannot be hidden when using fixture data. No production analytics claims until reconciliation tests pass.

## Pilot stage gates
P0: clean comparative dashboard sales trend, clear period/control, repair status, low stock, cash-in/out ONLY if source-backed and testable. Preserve fast operational UX; release can use clearly marked DEMO rather than inventing figures.
P1: sales-product/employee breakdowns, turnaround SLA, debt aging, richer reporting and CSV exports.
P2: cohort analysis, forecasting, anomaly signals, multi-branch benchmarking.
A single documented reusable analytics-filter component is preferred over duplicated page-specific filter logic.

## Acceptance evidence
- Multi-tenant/RBAC isolation including URL tampering and unauthorized branch selectors.
- Boundary dates including DST, missing days, partial periods and year changes.
- Values reconciled to source invoice/return/payment/stock/cash records using deterministic synthetic UAT fixtures.
- Mobile 390px + desktop 1440px AR/EN layouts; readable legends, empty states, screen reader accessible values.
- No chart may claim PASS solely from responsive rendering while its source accounting remains unproven.
- No production/public release without Foundation Pre-Launch Gate and owner's explicit approval.
