# A1 Mobi — C-LIVE-13 / BRANCH-REPORT-READ-GATE-03

Date: 2026-10-19
Execution: Thaghr only, `C:\A1Hub\a1-mobi`
Repository: `a1medianet/a1-mobi`
Branch: `feat/mobi-abc-continue-20261013` | PR #12 Draft
Method: A1 First / NAWA Way / One-Click Stage Gate / Evidence First

## Exact closed scope

The canonical AR/EN Reports screens previously displayed `demoReports` hardcoded values. An existing `buildOwnerSummary` aggregates across an entire **tenant**, which is not valid to expose as a branch-only owner report. This gate deliberately builds a small independent **branch-bound read model** reusing existing Prisma source tables, rather than modifying or copying the underlying transactional services.

- `src/modules/reports/branch-operating-report.ts`: strict tenant AND branch filters on recorded sale aggregate, posted returns, posted repair payments, closed-cash variances and current open repairs; customer counts use `createdBranchId` (tenant+branch). Thirty-day rolling period for monetary movements. No raw customer data or audit details are returned.
- Sales statuses include UNPAID, PARTIALLY_PAID, COMPLETED, PARTIALLY_RETURNED, RETURNED; draft and voided entries are not counted. Posted refunds are shown separately and deducted to calculate a labeled **sales less returns**, which is not cash received.
- Repair collection is based on **posted payment base amounts** linked to a repair order, NOT repair estimates, final prices, or fictitious collected totals. Closed drawer variance comes from persisted closed session records only.
- `src/components/branch-owner-report.tsx`: bilingual branch report with nine source-backed cards, and an explicit disclaimer: these are operational summaries, not certified accounting statements. We intentionally omit unverified profit/cost margin, inventory valuation and branch debt balances.
- `src/app/[locale]/reports/page.tsx`: mount this view only when existing isolated `A1_MOBI_C_LIVE_01_ENABLED=1`; retain original demonstration page with feature gate OFF.
- Permission `currentStoreContext("reports.read")` required BEFORE any queries; no payment modifications, data migration, new API route or dependency.

## Verified on Thaghr

- `tests/c-branch-report-gate-13.test.ts` **5/5 PASS**: exact branch scope across all six source queries, math and return handling, zero values with empty DB, required tenant/branch, invalid date, permission denied before DB reads, and demo-off fallback.
- `tests/c-branch-report-db.test.ts` **1/1 PASS** on loopback `127.0.0.1:5438/mobi_uat`: real synthetic fixtures for two branches and a different tenant, with a posted return only in branch one. Verifies no cross-branch gross or posted refund leakage.
- Existing `tests/reports-db.test.ts` **1/1 PASS**. Combined **7/7 PASS, 3/3 test files, zero skips and failures**.
- TypeScript `npx tsc --noEmit`, focused ESLint, diff checks: **PASS**.
- Authenticated read-only Chrome: `/ar/reports` desktop 1440×900 **PASS**, `/en/reports` mobile 390×844 **PASS**; 9 source-backed metric cards, localized text and disclaimers, no horizontal overflow. Initial render required retry while Next dev compiled; second bounded probe passed both languages.
- Local owner data visible during verification: 1 recorded sale for USD 240, 0 posted returns, repair collections USD 180, 4 currently open repairs, 0 registered customers in this branch; these figures are **isolated test records**, not production accounts.
- Captures: `c13-reports-ar-1440.png` and `c13-reports-en-390.png`. Reproducible browser-only test: `branch-report-13-browser.mjs`.

## Open and restricted

- General ledger reconciliation, inventory stock valuation, profit/margin, true cross-branch customer debt balances, financial audit final approval and returns workflow are **not** certified by this read-only report.
- Multi-item POS, full cash closing UX, live customer registration UX, repair warranty claims, B storefront, A signup/SMTP, independent Claude visual review and A1 Application Foundation/Pre-Launch remain OPEN.
- Final GitHub CI/Visual Evidence on the fresh commit must be checked independently.
- PR #12 **remains Draft, unmerged**; no Hostinger deploy, no production flag and no Fanshine.
