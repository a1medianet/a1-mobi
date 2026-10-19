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
