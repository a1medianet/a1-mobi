# A1 Mobi — Autonomous browser QA update (Thaghr, 2026-10-21)

## Owner responsibility / methodology
This is independent assistant-and-Codex QA before asking the owner for acceptance, not an owner-executed bug hunt. Authorized host: Thaghr, C:\A1Hub\a1-mobi, draft feature branch. Stable preview from commit 0017812 was on port 3225, and updated CSS production build on isolated port 3226. Neither server was deployed to Hostinger or merged.

## Findings verified with actual browser actions
- B (TechZone customer-facing storefront): **11/11 PASS** on existing 3225 and separately **11/11 PASS** on new CSS build 3226. Chrome screenshots captured on desktop and 390px phone. Exercised product image loading/model labels, search/catalog, add-to-cart and inline confirmation, sample-inquiry preview/copy/clear, contact shortcut, AR/EN and mobile overflow.
- A/B/C browser journey against 3225 after UAT database restart: **69 PASS / 6 FAIL** (75 executed checks), plus fixture cleanup PASS included in the result. Both Arabic and English actual browser login/logout and HTTP-only session cookie passed using a newly created synthetic tenant in `mobi_uat`; admin/POS/account/inventory/repairs/cash/reports/pages were reached and captured on desktop and mobile. No real customer credentials, sales or payments.
- Four of six failures require targeted interpretation: one Arabic invalid-login request returned service-unavailable during database recovery; one team-page assertion hit before content appeared (same page passed other viewport/language checks); three products/navigation checks treated below-fold lazy images as broken. The identified image files each exist and return HTTP 200; B also independently confirmed all eight images load. They must not be counted as proven missing-product-media bugs without retesting.
- One **confirmed customer-visible bug**: switching B to English left hero/navigation/search with RTL direction. Code fix: `src/app/globals.css` applies LTR to those elements only when `.mobi-store[dir="ltr"]`. A focused browser check with that exact CSS injected passed; an optimized production build of the source fix on isolated 3226 completed with TypeScript PASS and **B 11/11 browser PASS**.
- The UAT Postgres container `a1-mobi-techzone-uat-20261017` was found stopped on port 5438 and restarted, after which Prisma successfully queried `mobi_uat` and a separate synthetic browser-form login completed. No other project database was changed.

## Remaining gate / do not claim
The full 75-case browser suite has NOT been rerun end-to-end on 3226 yet; the six failures from 3225 are preserved in evidence and remain pending formal closure. MFA and authorized production login not tested. No release/merge/Hostinger deployment. Product-image licensing gate still open. Earlier QA Chrome cleanup left a dedicated debug endpoint/profile lock unresolved; do not interfere with personal browser processes while investigating.

Source/evidence on Thaghr: `docs/reviews/2026-10-21/autonomous-qa/results.json`, `docs/reviews/2026-10-21/owner-autonomous-qa/b-customer-journey-result.json`, `docs/reviews/2026-10-21/recheck-3226/b-customer-journey-result.json`. The 3225 screenshots and 3226 screenshots remain local to avoid pushing a large unreviewed media bundle. Existing A/B auth focused Vitest 34 PASS and TS/ESLint from checkpoint 0017812. All assertions are evidence scoped, not general production acceptance.

**Stage gate**: A/B functional browser checkpoint PASS on 3226; C E2E PARTIAL/PENDING six-issue triage; production RELEASE NOT APPROVED.
