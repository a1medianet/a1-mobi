# A1 Mobi — 7/7 +1 closure evidence, 26 October 2026

## Scope and truth policy
- Device: Thaghr; repository: a1medianet/a1-mobi; branch feat/mobi-abc-continue-20261013.
- This checkpoint adds a native owner-facing CSV/XLSX catalog import workflow and protects barcode ownership.
- This is a *checkpoint*, not a declaration that all seven gates are closed. Physical scanner/printer, financial end-to-end reconciliation, and cross-screen owner acceptance need real-run evidence.

## Gate 7 — Excel/CSV import changes
- Authenticated owner endpoint POST /api/ops/catalog/import, tenant-scoped, same-origin, multipart, 1 MB file limit, 500 item limit, .csv/.xlsx only.
- Owner catalog UI: file chooser, upload feedback, downloadable CSV template.
- Excel workbook parsing uses real OOXML reader. Rejects dangerous numeric SKU/barcode/category Excel cells (leading-zero loss), malformed archives, duplicate SKU/barcode, invalid price range and missing fields.
- PostgreSQL transaction safeguards: category creation, product upsert, audit trail, rollback if existing barcode belongs to a different product.
- Deterministic genuine XLSX fixture and regression tests.

## Verified by test runs
- Native XLSX fixture parsing + CSV validation: PASS.
- Authenticated HTTP route unit tests: 5/5 PASS (CSV acceptance, permission requested, invalid format, size limit, foreign origin).
- Dedicated temporary PostgreSQL UAT: 2/2 PASS (14/14 migrations, barcode conflict rollback, repeat upsert); ephemeral DB cleaned afterward.
- Barcode/labels/scan cart/product compatibility/report focused suites: 61/61 PASS.
- TypeScript: PASS after test fixture BlobPart type correction.
- ESLint: 0 errors, one existing next/no-img-element warning in landing page.
- Production-only npm audit: 0 known vulnerabilities.
- Production build: PASS (next build --webpack, 28/28 static pages, exit 0; Windows native SWC warning used supported WASM fallback).
- Additional owner/cash/permission/chart/product/print suites: 41/41 PASS.
- Real Chrome owner catalog compatibility walkthrough: PASS, exit 0 (EN/AR link-and-unlink persisted against local PostgreSQL; desktop RTL/LTR without horizontal overflow; mobile 390px both locales). Evidence: docs/reviews/2026-10-24/catalog-ui-1792967335989/results.json and PNG captures.

## Gates still requiring explicit acceptance
1. Physical scanner and actual label/receipt printer on target equipment.
2. Role-by-role access attempts and real discount approval.
3. Owner's create-edit-products/browser operational journey with imported Excel file.
4. Settlement with tender reconciliation, refunds and drawer finalization under real transactions.
5. Figures/graphs reconciled against DB source and mobile/desktop visuals.
6. All owner/admin pages AR and EN, keyboard/menu/nav/function checks.
7. Owner imports the supplied XLSX and confirms resulting stock/catalog/UI plus backup restore.
+1. Competitor-by-competitor site research only after 7/7 is evidenced.
