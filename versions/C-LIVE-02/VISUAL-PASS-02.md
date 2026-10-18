# A1 Mobi — C-LIVE-02 / VISUAL-PASS-02

Date: 2026-10-18
Canonical device: Thaghr
Local root: C:\A1Hub\a1-mobi
GitHub: a1medianet/a1-mobi / PR #12 (Draft)
Stage status: Owner repairs visual UAT candidate — not production release

## Scope completed
- Render only server-authorized repair tickets (tenant/branch-scoped existing API); no fake frontend records, no new parallel database.
- Owner tickets list: ticket number, date, customer, device, issue, IMEI last 4, real status, estimate, due amount (when READY), and context-specific actions.
- Search by ticket number / customer / device / issue / last 4 of IMEI. Status filters: all, active, awaiting, ready, delivered.
- Live status cards derived from the API list (first 75), rather than invented numbers: total, in process, ready, collectible due for READY items. This latter KPI excludes provisional estimates and other non-collectible amounts.
- Desktop table; small screens present each row as a readable card, with details and next action visible without horizontal document overflow.
- Existing status transition, inventory, cash payment, warranty and permissions logic unchanged.

## Synthetic isolated UAT fixture
- Proven database hostname 127.0.0.1, DB /mobi_uat and local-only preview 3198.
- Four synthetic tickets created via authenticated /api/ops/live-02; named [UAT-VISUAL-02] Customer A/B/C/D.
- Persisted statuses: INTAKE, ESTIMATE_PENDING, IN_PROGRESS, READY.
- Seed script refuses any non-127.0.0.1 or non-mobi_uat database and requires opt-in A1_MOBI_UAT_SEED_ALLOWED=1. Can be run repeatedly without duplicate tickets.
- Credentials remain in gitignored .local/techzone-owner-login.txt, never in scripts, logs or GitHub.

## Evidence already produced
- Scoped functions (tests/repair-owner-view.test.ts) and C-LIVE-02 PostgreSQL route tests: 7/7 PASS, 0 skipped.
- TypeScript + ESLint at pre-final KPI patch: PASS.
- Browser Chrome UAT with actual stored data on 1440x900 and 390x844: 4 real records visible, search PASS, READY filter PASS, no document horizontal overflow, mobile cards verified.
- Screenshots in this version folder: c-live-02-owner-repair-table-desktop.png, c-live-02-owner-repair-table-mobile.png, c-live-02-owner-search.png, c-live-02-owner-ready-filter.png, c-live-02-owner-real-table-desktop.png, c-live-02-owner-real-table-mobile.png.
- Final regression: 50/50 files, 129/129 tests PASS with 0 skips and 0 failures (exit 0). ESLint and TypeScript PASS (exit 0). Final browser UAT PASS, desktop 1440x900 and mobile 390x844, 4 persisted records, real data search and READY filter pass; due KPI correctly reads 120.00 USD (excludes provisional estimates).

## Open gates
- Full financial action browser E2E remains not certified; delivery/payment database tests are separate evidence.
- General production health remains degraded by recovery email configuration; do not soften health gate.
- A1-STD-APPLICATION-FOUNDATION@1.0.0, visual A/B/C final signoff and Pre-Launch gate OPEN.
- No merge, no production deployment, no real customer records.

## Large-shop count correction (2026-10-18)
- API now returns totalOrders with tenant/branch-scoped COUNT alongside the latest 75 repair rows.
- Owner table states filtered visible / total branch order count, and explicitly warns when older records are not searchable in the current recent-window list.
- Dashboard KPI remains scoped to only the returned recent rows; do not claim global branch totals for 75+ tickets. Server-side pagination and history-search remains OPEN.
- Route test added totalOrders >= returned row count. No financial service changes.
