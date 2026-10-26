# A1 Mobi — C-LIVE-13 | Version Index

Date: 2026-10-19
Local: `C:\A1Hub\a1-mobi` (Thaghr only)
Branch: `feat/mobi-abc-continue-20261013`
PR: #12 Draft / no merge / no production deploy

## Completed local acceptance

- **C-13/01 — Cash owner read:** canonical cash drawer reads persisted branch-scoped CashSession + CashMovement data using existing role permissions, with exact grouped totals, no synthetic balances. Local **11/11 targeted and database tests PASS**, TypeScript/ESLint PASS, AR desktop and EN mobile Chrome PASS. Report: `CASH-OWNER-READ-GATE-01.md`.
- **C-13/02 — Customer directory read:** canonical branch-scoped Customer directory, no fixed demo identities; protects PII via `customers.read`. Branch/tenant isolation UAT verified, no fabricated per-branch debt. Local **7/7 targeted and database tests PASS**, TypeScript/ESLint PASS, AR desktop/EN mobile Chrome PASS. Report: `CUSTOMER-DIRECTORY-READ-GATE-02.md`.

## Pending next work

C-13/03 reports aggregation, customer debt and linked-device reconciliation, cash closure/returns UAT, multi-item sale, B storefront, A customer journey, independent Claude acceptance, Foundation and Pre-Launch.

**This version index is not an ABC Finished or production acceptance declaration.**

- **C-13/03 — Branch report read:** canonical AR/EN report cards source recorded branch sale statuses, posted refunds, collected repair payments, closed drawer variances and current branch repair/customer counts. Explicitly no unverified accounting margin/debt/stock valuations. Local **7/7 targeted including real PostgreSQL branch+tenant isolation PASS**, TypeScript/ESLint PASS, AR desktop/EN mobile Chrome PASS. Report: `BRANCH-REPORT-READ-GATE-03.md`.

### Next gate
C-14: complete reconciliation and **write workflows** (cash closure/returns/warranty), plus multi-item POS and B/A pre-launch. These are NOT certified by the three read-only C-13 screens.
