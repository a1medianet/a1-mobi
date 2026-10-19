# A1 Mobi — C15 ABC Journey Checkpoint

Date: 2026-10-19. Device: Thaghr only. Branch: `feat/mobi-abc-continue-20261013`. PR #12 remains Draft.

## Implemented

- C / Point of sale: choose up to 12 distinct in-stock IMEI devices with visible per-device pricing, selection count and USD basket total.
- C / POST `sellCart`: current-session RBAC `sell.create`, same-origin JSON guard, branch/tenant isolation, distinct IDs, verified IMEI trust checks, and one transactional `checkoutSale` invoice with one payment. Original one-device `sell` remains supported.
- C / English operations now show English product names when available.
- A / Product landing adds a clear route to B customer storefront preview (`/store-preview`).
- C15 uses existing brand visual language (blue/orange) and responsive checkbox cart with clear totals.
- ABC browser test script extended to capture A/B/C desktop/mobile and assert A→B link, POS cart and mobile overflow.

## Evidence actually obtained

- `tests/c-live-01-route-db.test.ts`: 3/3 PASS on UAT PostgreSQL with `--hookTimeout 90000 --testTimeout 90000`. Covers two IMEIs in a single $860.50 invoice, one payment, status change, duplicate ID rejection, cross-tenant isolation and rejection of missing devices without losing stock.
- Existing `tests/c-live-01-owner-ux.test.ts` and `tests/c-pos-inventory-canonical.test.ts`: 8/8 PASS in an earlier targeted run; database suite in that initial run timed out during setup, then passed independently after an increased timeout.
- The source changes have no known production deployment and do not alter the already-running port 3185 instance.

## Open acceptance gates

- Production-mode build and authenticated ABC screenshots/browser UI gate must be recorded **as PASS** before visual acceptance. A script extension alone is not proof of a successful browser run.
- Prior visual documentation describes B as single-screen at standard desktop heights; the present B commercial site and older browser gate expect a scrollable page. Reconcile this against the approved final B reference before claiming exact visual matching.
- C live operation coverage beyond the IMEI cash basket (returns, non-serialized accessories, partial payments and receipt printing) remains separate and not certified by this gate.
- Full A/B/C pilot, scan/receipt, signed store-day evidence, release security and owner sign-off remain pending. No merge or public deployment.
