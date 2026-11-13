# A1 Mobi — C-LIVE-13 / CASH-OWNER-READ-GATE-01

Date: 2026-10-19
Device: Thaghr exclusively
Repository: `a1medianet/a1-mobi`
Branch: `feat/mobi-abc-continue-20261013`, PR #12 Draft
Method: A1 First / NAWA Way / One-Click Stage Gate / Evidence First

## Scope and decision

The canonical A1 Mobi C /ar/cash and /en/cash owner screens previously showed **synthetic fixed demo balances** even though the existing CashSession/CashMovement domain model and cash services already persisted real isolated PostgreSQL UAT entries.

C-13/01 closes **the read-only owner cash view** without duplicating a financial ledger or authorizing new writes.

- `src/modules/cash/cash-owner-snapshot.ts`: one branch+tenant-scoped source-backed snapshot, preferring open session else most recent closed. Aggregate **all** movement amounts by currency and direction in PostgreSQL, without making the balance depend on the latest-30 display limit; show only latest 30 rows. Closed variance is shown only after an actual closing event. No session => explicit empty state, never invented balances.
- `src/components/cash-owner-live.tsx`: bilingual responsive overview and recent movement list. Resolve the authenticated owner context with `currentStoreContext("cash.manage")` **before** any DB read; permission-denied view does not query the drawer. No cash mutating actions, PII, actor details or idempotency tokens rendered.
- `src/app/[locale]/cash/page.tsx`: mount the source-backed view only with existing `A1_MOBI_C_LIVE_01_ENABLED=1` pilot gate; the current demo page remains unchanged when flag OFF.
- Reuse existing `src/modules/cash/cash-service.ts` for operational writes/locking/audits; no new payment engine, migration, API path, dependencies or production environment flag.
- This is a **read-only** owner gate, **not** completion of drawer opening/closing UX, refunds, full POS/finance, customers or all reports.

## Local proof

- `tests/c-cash-owner-gate-13.test.ts`: **5/5 PASS**. Verify branch/tenant and session constraints in every aggregate and recent-movement query; full vs last-30 balance semantics; no-session no fabricated balance; closed variance; permission denial before any DB read; pilot-gate OFF fallback.
- `npx tsc --noEmit`, focused ESLint and `git diff --check`: **PASS** (exit 0).
- Authenticated Chrome with real `mobi_uat` synthetic owner, **read-only browser**: `/ar/cash` 1440x900 **PASS**, `/en/cash` 390x844 **PASS**, 4 metric cards, correct language/source-backed notice, no horizontal overflow.
- Source-backed local owner session in the visual proof: OPEN, USD expected 180.00, LBP expected 0; details come from existing UAT movements, **not a real merchant account**.
- Images: `c13-cash-owner-ar-1440.png` and `c13-cash-owner-en-390.png` in this version folder.
- Browser script: `cash-owner-13-browser.mjs`, reusing existing authenticated CDP harness and no browser writes.

## Acceptance boundaries

- Focused **real PostgreSQL UAT regression** with explicit loopback guard `127.0.0.1:5438/mobi_uat`: **11/11 tests PASS, 3/3 files, zero skipped or failed** (drawer open/move/close, concurrency/idempotency, currency rules and new owner read scope). Full repository CI and GitHub Visual Evidence on the eventual commit must be checked separately; never inherit a prior green check.
- Cash close/reconcile, refund handling, C customers and reports, multi-item POS, B storefront, A onboarding/SMTP, independent Claude acceptance, Application Foundation and Pre-Launch all remain **HOLD**.
- PR #12 stays **Draft, unmerged**. No Hostinger `mobi.a1medianet.com` deployment, no feature activation in production, no changes to Fanshine.

## Next narrow gate

**C-13/02 — Customers:** inventory existing `customer-service` and scoped customer/debt records, then converge the canonical owner customer page using read-only permission-checked queries. Do not infer customer identity from repair `customerName` free text without a verified relation.
