# A1 Mobi — C-LIVE-01 Operational Gate

Date: 2026-10-17
Node: Thaghr only
Local repo: C:\A1Hub\a1-mobi
Remote: a1medianet/a1-mobi
Branch/PR: feat/mobi-abc-continue-20261013 / PR #12 Draft
Baseline: ad10e54d7e2917579dc41db1f814af5920c95c11
Release status: UAT ONLY — Production HOLD.

## Delivered
- New authenticated tenant and branch-scoped API: src/app/api/ops/live-01/route.ts.
- Existing service modules reused: registerProduct, receiveSerializedDevice, checkDeviceTrust, checkoutSale. No duplicate stock or sales service.
- Product register with branch stock location; serialized IMEI receipt requiring STOCK_IN trust check, stock movement and audit.
- CASH USD sale requiring SALE trust check, with persisted sale/invoice and stock deduction.
- GET: tenant products, branch stock and reports-permitted invoices (not cost for inventory readers).
- Browser UI: /ar/live-01 and /en/live-01, product create, receipt, sale and read-back after reload.
- POS and inventory entry links clearly separate persistent UAT from original non-persistent demo operations.
- Pilot API and UI return 404 by default; require A1_MOBI_C_LIVE_01_ENABLED=1 on an authorized node.
- Local UAT credentials, database and .env.local remain gitignored inside the project.
- Isolated build: A1_MOBI_DIST_DIR=.next-c-live (default unchanged .next), UAT port 3195.

## Verified
- Test file tests/c-live-01-route-db.test.ts: 2/2 PASS, 0 skipped, on isolated Thaghr PostgreSQL.
- Database creates product and family, receives valid IMEI, makes sale, saves invoice USD 500 and deducts stock.
- Cross-tenant catalog/sale isolation; prevents double sale; unauthenticated 401; missing permission 403; disabled feature 404.
- Focused ESLint and TypeScript PASS after correcting React async effect.
- Prior full DB suite: 19/19 PASS (before this code change). Re-check via GitHub CI.
- Next.js build and browser visual acceptance to be marked after actual proof; no PASS without evidence.

## Pending
- Real browser UI end-to-end and screenshot evidence, desktop 1440x900/mobile 390x844.
- GitHub CI and PR #12 branch verification.
- Wider native POS integration, variant relationships, other payment methods, customer/debt/cash reports.
- A1-STD-APPLICATION-FOUNDATION@1.0.0, Pre-Launch, backups, rollback, hosting: HOLD.

## Safety
No external project files or production deployment. Preserve prior versions under versions/ and GitHub.
