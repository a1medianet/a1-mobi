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

## Production-mode browser verification — PASS

- Next.js 16.4.0 Webpack production build with isolated .next-c15 and LIVE-01 flags completed with exit code 0; TypeScript and 28/28 static page generation PASS.
- Isolated application at 127.0.0.1:3221 on Thaghr; existing application at 127.0.0.1:3185 untouched.
- Chrome browser: scripts/abc-browser-qa.mjs, authenticated isolated tenant, output A1_MOBI_ABC_BROWSER_QA_PASS, exit code 0, runtime 82.82s.
- Assertions cover A brand assets and 6 feature cards plus A-to-B route; B product filtering, illustrative basket, disabled unconfigured WhatsApp, language toggle and mobile menu; C signed-in dashboard, brand mark, navigation collapse and new POS basket; A/B/C mobile overflow constraints.
- B desktop document scroll-height 5014px at 900px viewport, passing the expanded-store browser script but conflicting with the older one-screen B specification.
- Seven screenshots saved below docs/reviews/2026-10-19/c15-abc: A and B desktop/mobile, C dashboard desktop, C POS desktop/mobile.
- C dashboard desktop screenshot remains vertically scrollable: single-screen dashboard visual acceptance remains open.
- C POS screenshots show the empty tenant and the new basket; populated two-device checkout verified at HTTP/DB level, not yet via complete browser clicks.

## Open acceptance gates

- The production build and authenticated ABC browser gate now PASS, but exact visual sign-off remains pending because B scroll behavior differs from the older approved constraint.
- Prior visual documentation describes B as single-screen at standard desktop heights; the present B commercial site and older browser gate expect a scrollable page. Reconcile this against the approved final B reference before claiming exact visual matching.
- C live operation coverage beyond the IMEI cash basket (returns, non-serialized accessories, partial payments and receipt printing) remains separate and not certified by this gate.
- Full A/B/C pilot, scan/receipt, signed store-day evidence, release security and owner sign-off remain pending. No merge or public deployment.
