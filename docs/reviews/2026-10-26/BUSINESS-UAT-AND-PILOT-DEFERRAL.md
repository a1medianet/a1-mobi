# Mobi Pilot closure — business flow evidence (2026-10-26)

## Decision: defer real hardware
Owner approved deferring physical barcode-scanner and physical label/receipt-printer verification to the client's Pilot UAT. This is a **deferred acceptance**, not PASS; software scanning, barcode labels, preview and print CSS are still required. Obtain client hardware models, scans, print samples and sign-off during Pilot. Do not block the Pilot handoff for unavailable physical hardware.

## Actual tests on Thaghr
- `scripts/c14-isolated-uat.ps1`: PASS. Temporary PostgreSQL 17, 14 schema migrations, rejects drawer self-approval and unauthorized approvers, permits authorized manager and checks variance/audit; database container cleaned.
- `scripts/business-isolated-uat.ps1`: PASS. Separate temporary PostgreSQL 17, 14 migrations; **5 suites / 6 database integration tests PASS**. Store bootstrap/login, IMEI stock receipt, sale/repair; dual-currency checkout/invoice/stock/audit; cash open/movements/close; owner reports and low stock; duplicate barcode transactional rollback. Temporary container cleaned.
- POS scanner input, sell pricing / price floor / overrides, bulk sell and canonical stock: **4 suites / 36 tests PASS**.
- Previously validated: native Excel import, 107 targeted software tests, 41 cash/admin/print tests, real Chrome catalog compatibility EN/AR desktop/mobile, production build exit 0. See `GATE7-EXCEL-IMPORT-VERIFICATION.md`.

## What this does not prove
- Physical scanner/real printer PASS (explicitly deferred to client).
- Owner dashboard entire screen-by-screen browser acceptance, discounts by independently logged-in roles, full refund/tender/variance test in a single browser flow, browser Excel upload and backup restore, live server deployment.
- The 7/7 Pilot stage is not signed off yet; +1 competitor comparison follows only after the remaining gates are resolved.

## Source
Repo `a1medianet/a1-mobi`, branch `feat/mobi-abc-continue-20261013`, Thaghr-only development.
