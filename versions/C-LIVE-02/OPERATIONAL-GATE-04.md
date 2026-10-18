# A1 Mobi — C-LIVE-02 / OPERATIONAL-GATE-04

Date: 2026-10-18 | Execution: Thaghr only | Canonical folder: C:\A1Hub\a1-mobi
Repository: a1medianet/a1-mobi | Branch: feat/mobi-abc-continue-20261013 | PR #12 DRAFT

## Decision
Close two open UAT gates without replacing existing A/B pages, production deployment, or prior VP03 evidence: financial payment/pickup browser flow after VP03 selected-case UI; and complete tenant/branch-scoped repair history search with pagination.

## Financial browser E2E — PASS on 127.0.0.1:3198, synthetic PostgreSQL mobi_uat only
- Feature explicitly authorized for local UAT, with database guarded for host 127.0.0.1 and database /mobi_uat.
- New synthetic ticket [UAT-FIN-03], full live browser flow with selected-case panel.
- READY ticket, real Open ticket action, cash open, partial USD 30, remainder USD 60, zero outstanding, confirmed pickup, single persisted written warranty.
- Reload proved delivered state and warranty; visual case details retained, no inline forms in ticket table.
- Script c-live-02-vp03-financial-e2e.mjs, console marker C_LIVE_02_VP03_FINANCIAL_BROWSER_E2E_PASS.
- Screenshots: c-live-02-vp03-financial-partial-payment.png, c-live-02-vp03-financial-paid-in-full.png, c-live-02-vp03-financial-delivered-warranty.png.
- No real customer/merchant payment was entered.

## Full-history owner search & pagination — scoped implementation
- GET /api/ops/live-02 accepts validated q (<=80 chars), page 0..1000, status ALL/ACTIVE/AWAITING/READY/DELIVERED.
- Indexed/stable ordered pagination with 75 items/page (intakeAt desc and id desc); skip/take enforced server-side.
- Prisma query always includes authenticated tenantId and branchId; filter is applied to count and data retrieval.
- Responds with totalOrders, matchedCount, page, pageSize, hasMore, orders and cashOpen; cash permission/mutation endpoints unchanged.
- Owner UI search and status switch query server, changes reset page 0, previous/next control visible when needed.
- Do not claim branch-global KPI totals: quick status overview summarizes only currently fetched page.
- PostgreSQL tests: 8/8 PASS across 2 files. New test temporarily creates 77 synthetic scoped repair rows, verifies page 2, no overlaps, old-ticket search, status, invalid query rejection and cross-tenant isolation, and cleans up those temporary rows.
- First DB test attempt could not connect to 127.0.0.1:5438 during heavy concurrent local processes. Docker pg_isready and TCP check later PASS, retry completed 8/8 with exit 0.

## Browser visual and navigation UAT
- Authenticated live browser GET API 200; 6 persisted synthetic tickets.
- Direct server search UAT-FIN-03: HTTP 200, exactly one result.
- Search Customer B and READY status filter PASS after actual async fetch (debounced), no false immediate-search expectations.
- READY selected-case action, desktop 1440px scrollWidth 1425px, mobile 390px scrollWidth 375px, no horizontal overflow, no forms inside list rows.
- Script c-live-02-vp04-browser.mjs, exit 0, markers VP04_SERVER_SEARCH_UI_PASS, VP04_CASE_PANEL_PASS, VP04_REAL_DATA_VISUAL_PASS.
- Screenshots: c-live-02-vp04-compact-desktop.png, c-live-02-vp04-table-desktop.png, c-live-02-vp04-desktop-opened-case.png, c-live-02-vp04-compact-mobile.png, c-live-02-vp04-table-mobile.png, c-live-02-vp04-mobile-opened-case.png.
- React effect dependency lint warning corrected, focused ESLint subsequently exit 0. Earlier full TypeScript check exit 0 before final small state effect changes; GitHub CI verification required at new commit.

## Still OPEN (NOT production cleared)
- Global KPI/report reconciliation for all pages, concurrency under large-scale updating, expired warranty/claims, recovery email health, business account settings, A/B/C final reference signoff, Foundation v1.0 and Pre-Launch review.
- Default feature flag OFF. PR stays Draft and unmerged; no public deployment.
