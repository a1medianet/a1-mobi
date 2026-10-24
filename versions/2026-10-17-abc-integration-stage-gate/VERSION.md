# A1 Mobi — ABC Integration Stage Gate

**Version:** `ABC-INTEGRATION-GATE-2026-10-17`
**Machine:** Thaghr, exclusively
**Canonical local project:** `C:\A1Hub\a1-mobi`
**GitHub:** `a1medianet/a1-mobi`; PR #12 (Draft, do not merge)
**Baseline:** `b0d140dc43fb225c3d0e35c6f946240621c1c8a8`
**Authority:** NAWA Way / One-Click Stage Gate / `A1-STD-APPLICATION-FOUNDATION@1.0.0`
**Status:** **READY FOR REAL OPERATIONAL INTEGRATION & VISUAL FINALIZATION**, **NOT PRODUCTION READY**.

## Three reference surfaces

- **A Product:** `/product/ar`, `/product/en`: SaaS product/marketing, signup, pricing, real product capabilities and help. Ref: user-provided A.jpeg. Do not fabricate user counts, live reviews, conversion stats or testimonials from design-only references.
- **B Merchant Website:** `/store-preview`: independent TechZone sample, scrollable merchant site, 8 illustrative products, search, illustrative basket, services, FAQs and contact. Ref: user-provided B.jpeg. Demo orders/checkout/repairs/WhatsApp are not live services; must stay visibly disclosed/disabled until actually configured. No fabricated contact info.
- **C Owner/Admin:** `/ar`, `/ar/pos`, `/ar/products`, `/ar/inventory`, `/ar/repairs`, `/ar/customers`, `/ar/cash`, `/ar/reports`, `/ar/admin`. Ref: user-provided C.jpeg. Dashboard and module UI currently use demo data, and POS receipt is browser-local; DB modules are **implemented separately**, but they are not yet wired to these UI pages as complete production workflows.

## Evidence verified on 2026-10-17

1. GitHub at baseline `b0d140d`: **CI SUCCESS**, **Visual Evidence SUCCESS** (GitHub Actions runs 39032670314 and 39032670335).
2. Local browser CDP: authenticated owner navigation to nine C areas plus team; active sidebar state, desktop & mobile no horizontal overflow. Previous local screenshot evidence under `versions/2026-10-17-c-owner-visual-operational`.
3. Local isolated PostgreSQL in Docker: `a1-mobi-techzone-uat-20261017` bound to `127.0.0.1:5438`, private local data only. No customer/production database was used.
4. Focused DB test command with selected six integration files: **6/6 PASS**.
5. All `tests/*-db.test.ts` discovered explicitly through PowerShell `Get-ChildItem` and executed with isolated UAT `DATABASE_URL`: **19/19 PASS; 0 skipped; 0 failed; exit 0; 90.35s**.
6. Real test coverage includes multi-tenant provisioning, login/session rotation, MFA and recovery, rate budgets, user/branch isolation, IMEI intake & sale, repair through payment/delivery, customer debt, USD/LBP cash close, reporting, top-up and audit.
7. The previous local UI-only test run was **98 PASS / 19 SKIPPED** because `DATABASE_URL` was not injected there. Today's separate full DB run closes that skipped-tests evidence gap at the service layer, **not the browser layer**.

## Integration gap / honest product classification

**Highest risk: UI-to-service wiring.** The source inspection found:
- Owner `src/app/[locale]/page.tsx`: static demo KPIs `demoTransactions`, `demoCatalogCounts` and fixed illustrative metrics.
- POS `src/app/[locale]/pos/page.tsx`: `demoProducts`, browser state and `localStorage` receipt; not `checkoutSale` DB operation.
- Products `src/app/[locale]/products/page.tsx`: illustrative catalog, not a persistent add/edit product workflow.
- Inventory `src/app/[locale]/inventory/page.tsx`: `demoCatalogCounts`/`demoInventoryMovements`, not stockLedger source.
- Repairs `src/app/[locale]/repairs/page.tsx`: static `demoRepairs`; no live intake/estimate/delivery UI.
- Customers, Cash, Reports: demo operations fixtures; no live transaction view.
- Existing API routes focus on auth, admin roles/users, account, onboarding, health, assist; no verified HTTP routes yet for full catalog, inventory, POS, repair, cash and reports workflows.
- The service-level modules and 19 DB tests are healthy; **re-use them rather than write parallel business logic in the UI**.

## Stage sequence (One-Click Gate)

**Gate 1 — C Live Owner Slice (P0):** Authorized tenant/branch scoped reads and mutations to existing modules, with clear train/demo vs operational mode boundary. Start with product create/edit and IMEI receipt; follow through real POS checkout and stock updates. Establish session/RBAC, validation, idempotency, audit and explicit API error handling. Evidence: browser CRUD changes visible after refresh and PostgreSQL reconciliation, negative cross-tenant tests.

**Gate 2 — C Repair + Finance (P0):** Real intake → diagnosis → estimate → approval → parts → payments → READY → DELIVERED; customer records, debt and cash drawer. Evidence: same object IDs and financial totals across workflows, reloads and reports.

**Gate 3 — C Owner Truth & Settings (P0):** Dashboard KPIs and reports derived from actual source records, security/role settings and branch scoping, no phantom stats. Exercise logout and unauthorized URL access.

**Gate 4 — B Tenant Website (P1):** Merchant branding, public published catalog, verified contact channel, order/inquiry or booking only after live backend; full scrolling AR/EN and mobile/desktop real-store preview. No fabricated testimonials/metrics.

**Gate 5 — A SaaS Onboarding & Visual (P1):** Marketing visual signoff versus A.jpeg; trial signup → first branch → login → owner onboarding; validated terms, help, pricing, email flows; no unverified social proof.

**Gate 6 — Production Pre-Launch (BLOCKED until evidence):** Independent end-to-end UI journey on isolated tenant; security, MFA/recovery, negative RBAC and tenant isolation, data migration, backup/restore, HTTPS, responsive AR/EN/accessibility, A1 Foundation compliance and deployment rollback. No merge or public production until PASS.

## One Click acceptance proof per gate

Implement → browser functional tests and DB assertions → captured before/after visuals at 1440×900 & 390×844 → `npx tsc --noEmit`, `npm test` with scoped UAT DB, `npm run build`, GitHub CI → evidence + version notes + SHA → user approves next stage. Never label a mock checkout/live purchase. Preserve prior history and independent tenant data.

## Storage rule

ALL source modifications and manifests inside `C:\A1Hub\a1-mobi`, including `versions/`; GitHub sole remote. Never stage `.env.local`, `.local`, photos not authorized for repository, credentials, test data or personally identifying customer information. Release remains Draft.
