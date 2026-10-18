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
- Isolated Next.js 16.4 production builds: PASS with exit code 0 (first C-LIVE build and second SOLD-history fix); 25/25 static pages.
- Authenticated Chrome CDP visual gate: PASS at 1440x1000 and 390x844, without horizontal overflow.
- Full real browser action E2E: PASS (exit 0); UI created product, received IMEI, sold device, showed SOLD and persisted invoice after reload; existing A/B/C visual gate PASS.
- Screenshot proof: c-live-01-desktop.png, c-live-01-received-imei.png, c-live-01-sold-and-invoiced.png, c-live-01-mobile.png (only synthetic tenant/device data).
- GitHub CI and Visual Evidence for implementation and SOLD-history fixes: both SUCCESS on a4f3fb7.

## Pending
- Continued visual refinement of integrated native POS and customer/branch operations.
- CI verification of this final evidence-only commit remains pending until GitHub Actions finish.
- Wider native POS integration, variant relationships, other payment methods, customer/debt/cash reports.
- A1-STD-APPLICATION-FOUNDATION@1.0.0, Pre-Launch, backups, rollback, hosting: HOLD.

## Safety
No external project files or production deployment. Preserve prior versions under versions/ and GitHub.

## Sold-device history fix
- Browser creation, IMEI receipt, and persisted invoice passed. Initial browser gate showed SOLD device missing from historical inventory display because query selected only current stock-location items.
- Route GET now also includes branch saleLine history; retains SOLD devices in the operator ledger without treating them as available inventory.
- Strengthened PostgreSQL test asserts device status exactly SOLD, instead of only not IN_STOCK.
- Revised DB gate: 2/2 PASS (0 skipped), TypeScript PASS. Final production rebuild and real browser E2E both PASS (exit 0): reload retains SOLD and invoice; CDP desktop/mobile PASS.

## CANONICAL-POS-INVENTORY-GATE-11 — 2026-10-18
- Canonical authenticated owner POS and Inventory now reuse the existing persisted Live-01 operational component when the test feature flag is ON, rather than routing users to a separate live page.
- Inventory provides product registration and IMEI intake; POS provides verified-device USD cash checkout and saved invoice list. The legacy Live-01 URL remains a combined QA workflow.
- Default-off preserves the previous explicitly labelled training POS/inventory views; no schema or payment service changes, no production or Hostinger deployment.
- Four read-only authenticated Chrome gate checks on AR/EN desktop/mobile passed: canonical route, correct form count, two source-backed metric cards, UAT API 200, no horizontal overflow.
- See `CANONICAL-POS-INVENTORY-GATE-11.md` and `c-canonical-11-*.png` for evidence. Full regression / CI status must be verified separately.
