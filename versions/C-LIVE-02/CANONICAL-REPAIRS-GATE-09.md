# A1 Mobi — C-LIVE-02 / CANONICAL-REPAIRS-GATE-09

Date: 2026-10-18
Execution: Thaghr only, `C:\A1Hub\a1-mobi`
Repository: `a1medianet/a1-mobi` — PR #12, Draft, unmerged
Operating method: NAWA Way / One-Click Stage Gate / Evidence First

## Scope and decision

Close one verified owner navigation gap, without rewriting the working repairs service, introducing parallel records, or deploying production changes.

The authenticated canonical owner menu `/{ar|en}/repairs` previously rendered a fixed demonstration table while the actual PostgreSQL repair journey was separately available under `/{ar|en}/live-02`.

- When `A1_MOBI_C_LIVE_02_ENABLED=1`, the canonical Repairs page now directly mounts the **existing** `RepairLivePage` component and its scoped `/api/ops/live-02` backend.
- The canonical component's Back link returns to the dashboard in the selected locale, not into a same-page loop.
- The old `/live-02` UAT URL is retained as an explicitly gated backward-compatible link; its Back link continues to open `/repairs`.
- Flag off (including default deployment configuration): the pre-existing clearly marked demo view remains. The live endpoint still fails closed when the flag is off.
- No database schema, finance processing, permissions, or customer data were changed. LocaleLayout continues to require an authenticated owner session.

## Verified isolated browser UAT

Test origin: `http://127.0.0.1:3198` ONLY; synthetic PostgreSQL `mobi_uat`, Thaghr loopback `127.0.0.1:5438`. Authenticated owner Chrome DevTools tests use a private local credentials file; no secrets are committed.

Reproducible test harness `c-live-02-canonical-09-browser.mjs` reuses the previously validated VP05 browser assertions without copying the harness into a new product subsystem.

- Desktop 1440×900: `/ar/repairs` canonical route, active owner sidebar link, `/ar` Back link, persisted repair list and no stale demo table **PASS**.
- Mobile 390×844: canonical route, active mobile Repairs link, persisted cards **PASS**.
- English mobile `/en/repairs`: title "Repair orders", correct English locale/active navigation, 6 persisted records, 375px document within 390px viewport **PASS**.
- Authenticated API `/api/ops/live-02` **200**, real branch overview 6 repairs / 3 active / 1 ready / USD 120 ready receivable.
- Archived ticket search, READY filter and branch-level KPI invariants **PASS**.
- Opening READY ticket reveals settlement controls only in its details panel, not inside the table; close panel has no write side effects **PASS**.
- Horizontal overflow absent: desktop scrollWidth 1425 / viewport 1440; mobile scrollWidth 375 / viewport 390 **PASS**.
- Browser process completed exit **0**.

Evidence images (local under this version directory):
- `c-live-02-canonical-09-compact-desktop.png`
- `c-live-02-canonical-09-compact-mobile.png`
- `c-live-02-canonical-09-english-mobile.png`
- Additional selected-case, search/filter and table captures follow the same `c-live-02-canonical-09-*` naming.

## Automated tests and release conditions

- New `tests/repair-canonical-navigation.test.ts`: 5/5 PASS (AR/EN, feature on/off, unsupported locale).
- Existing A/B visual content test: 2/2 PASS.
- Focused TypeScript `npx tsc --noEmit` and ESLint on changed source/tests: PASS.
- Full local isolated PostgreSQL regression suite: **138/138 tests PASS, 51/51 files PASS**, zero failed/skipped, exit 0.
- GitHub CI/Visual Evidence: verify on the new commit separately before final signoff. Never inherit green status from earlier commits.

## Not closed — explicit HOLD

- The standard POS, products, inventory, cash, customers, dashboard and reports owner pages still require selective integration with existing real services. Do not call this an all-C or all-ABC completion.
- Real refund cash movement and accounting reconciliation, warranty expiry/claims, A/B customer journeys, Claude re-review against approved visual references, SMTP authenticated HTTPS reset, A1 Application Foundation and Pre-Launch remain open.
- Release flag remains OFF by default outside the explicitly isolated UAT. No automatic deployment, no PR merge and no production/public publishing.
