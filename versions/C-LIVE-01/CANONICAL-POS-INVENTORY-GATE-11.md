# A1 Mobi — C-LIVE-01 / CANONICAL-POS-INVENTORY-GATE-11

Date: 2026-10-18
Execution: Thaghr only — `C:\A1Hub\a1-mobi`
GitHub: `a1medianet/a1-mobi` | Branch `feat/mobi-abc-continue-20261013` | PR #12 Draft
Method: A1 First / NAWA Way / One-Click Stage Gate / Evidence First

## Closed scope — canonical navigation and reuse

Problem: the standard authenticated POS and Inventory pages were demo-only, while the already-tested, tenant/branch-scoped IMEI/Invoice source of truth ran under an extra `/{locale}/live-01` UAT page.

Implementation:
- In the already-authenticated `/{ar|en}/pos` route, when `A1_MOBI_C_LIVE_01_ENABLED=1`, mount the **existing** `LiveOperationsPage` component in `pos` mode. POS shows available serialized devices, cash sale and stored invoices; product intake/editing forms are not duplicated on the POS screen.
- In the canonical `/{ar|en}/inventory` route, with the same gate ON, mount that same component in `inventory` mode. Inventory shows product registration, IMEI receipt and persisted device inventory; no separate cash sale form appears.
- Original POS pilot content was moved intact to `src/components/demo-pos.tsx` and remains rendered with the feature gate OFF. The original demo inventory is likewise retained.
- Legacy `/{ar|en}/live-01` remains available for isolated UAT only, using the shared component's unchanged `all` mode.
- Account/tenant/branch authorization and state transitions remain controlled by the existing `/api/ops/live-01` backend. No changes to service, Prisma migrations, payment rules or audit events.
- Simplified consumer-facing UAT headings: no internal stage names or database labels on the standard screens; kept an explicit training-only notice.
- When POS has no devices available, direct the owner to canonical Inventory rather than suggesting an impossible sale.

## Locally verified UI proof (authenticated synthetic UAT)

- Chrome desktop 1440 × 900: `/ar/pos` displays only one sale form, `/ar/inventory` displays exactly two product + stock forms; both show 2 source-backed metric cards; active owner navigation and no horizontal overflow.
- Chrome mobile 390 × 844: `/en/pos` and `/en/inventory` show the correct localized headlines, forms and metric cards without horizontal overflow.
- Authenticated backend GET `/api/ops/live-01` returned HTTP 200 on all four route checks. The logged-in synthetic store has 0 currently available devices/invoices, so the empty-state metrics show real zeroes, not fabricated sample sales.
- Local browser gate script `c-pos-inventory-canonical-11-browser.mjs` reuses the established private local Chrome/login framework; it performs **read-only** navigation and no write operations.
- Evidence captures saved in `versions/C-LIVE-01/`:
  - `c-canonical-11-ar-pos-1440.png`
  - `c-canonical-11-ar-inventory-1440.png`
  - `c-canonical-11-en-pos-390.png`
  - `c-canonical-11-en-inventory-390.png`
- Initial DOM timing check needed to wait for asynchronous source-backed metrics (static forms render first); after correcting the browser test wait, all 4 canonical route gates passed. No app financial logic was changed for this test correction.

## Test suite and release controls

- `tests/c-pos-inventory-canonical.test.ts`: 5 focused cases covering AR/EN, mode selection, gate OFF fallback, invalid locales.
- The first focused route run had **5 PASS, 2 DB tests SKIPPED** because `DATABASE_URL` was not loaded in the shell. This is explicitly **not counted** as a DB validation. A later full rerun uses a guard to require loopback PostgreSQL `127.0.0.1:5438/mobi_uat`.
- Full explicitly guarded local PostgreSQL UAT suite: **147/147 tests PASS, 53/53 files PASS**, 0 failures, 0 skipped. Re-run included both previously skipped Live-01 DB tests, which passed; commands exited 0.
- TypeScript `npx tsc --noEmit`, focused ESLint, and `git diff --check`: **PASS**, exit 0 on Thaghr after the last code change.
- New GitHub CI/visual checks require independent confirmation on the final pushed commit.

## Still open (no false product completion)

- This is real serialized-device intake and USD cash checkout on the existing UAT service. The richer multi-item POS UI and un-serialized product flows are not yet integrated; inventory reporting, returns and warranty claims remain open.
- Customer, cash, dashboard, reports, storefront B and A customer journey must be converged and visually signed off; independent Claude review and A1 Foundation/Pre-Launch, real HTTPS SMTP delivery and rollback/restore remain open.
- Production Hostinger domain `mobi.a1medianet.com` is unchanged; GitHub PR #12 remains Draft. **No merge, no auto-deployment, no production release**.
