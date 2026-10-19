# A1 Mobi — C-LIVE-13 / CUSTOMER-DIRECTORY-READ-GATE-02

Date: 2026-10-19
Only development node: Thaghr | local `C:\A1Hub\a1-mobi`
GitHub: `a1medianet/a1-mobi`
Branch: `feat/mobi-abc-continue-20261013` | PR #12 Draft
Method: NAWA Way / One-Click Stage Gate / Evidence First

## Scope — real read-only branch directory

The canonical `/{ar|en}/customers` screen previously presented fixed `demoCustomers` identities, device counts and fake debt balances. Domain services already provide customer registration, linked devices, and debt entries, but the canonical screen was not using persisted data.

This gate:
- Adds `getBranchCustomerDirectory({tenantId,branchId})` with **both** tenant and registration branch filters on **both** count and list queries; deterministic newest-first order, max 75 displayed rows. It is read-only and returns only ID/name/phone/createdAt, not notes, tokens, devices from other branches or audit details.
- Mounts `CustomerOwnerDirectory` in the canonical AR/EN route with existing test feature gate `A1_MOBI_C_LIVE_01_ENABLED=1`.
- Enforces `currentStoreContext("customers.read")` before any lookup, and a localized safe permission-denied state when appropriate.
- When the gate is OFF, keeps the original pilot demo screen intact. No new schema, customer writes, notification triggers, tenant migration or dependency.
- **Does not show a fake customer debt balance.** `DebtAccount.balance` is a tenant-wide customer value, not necessarily branch-only; a safe accurate reconciliation and authorization contract is still required before a per-branch debt view. This screen is explicitly a customer **directory**, not full CRM/debt settlement.
- Real repairs can still store customer-name/phone free text not linked to a `Customer` record; this screen does not invent joins based on unverified names.

## Local evidence and validation

- `tests/c-customer-owner-gate-13.test.ts`: **5/5 PASS** (tenant + registration branch query scopes, count/list separation and limit, no synthetic data when empty, missing scope refusal, role denial before DB read, feature gate OFF fallback).
- `tests/c-customer-owner-db.test.ts`: **1/1 PASS** on isolated localhost PostgreSQL `mobi_uat`, creating synthetic tenants/branches/customer rows and verifying branch and tenant data isolation.
- Existing `tests/customer-debt-db.test.ts`: **1/1 PASS** on the same guarded UAT database. Combined **7/7 tests PASS, 3/3 test files, zero skipped and zero failures**.
- `npx tsc --noEmit`, focused ESLint, `git diff --check`: **PASS**, exit 0 on Thaghr.
- Authenticated local Chrome `/ar/customers` at 1440x900 **PASS**, `/en/customers` at 390x844 **PASS**: source-backed 2 KPI cards, canonical directory, localized empty state (the authenticated synthetic owner currently has zero registered Customer rows), no horizontal overflow.
- First browser attempt encountered a transient local `503` during auth; next attempt while recompiling lacked final DOM. After local health returned `200` a repeat passed both routes. The initial failures are recorded; no production effect. Temporary debug body captures (which might contain PII) were discarded locally, not staged.
- Reproducible **read-only** Chrome gate: `customer-directory-13-browser.mjs`, reuses existing private local auth CDP harness.
- Evidence captures in this folder: `c13-customers-ar-1440.png`, `c13-customers-en-390.png`.

## Outstanding gates

- Customer editing/creation UI, full customer timeline with related devices/repairs, and tenant-aware debt reconciliation are **NOT** completed.
- C reports, full multi-item POS, returns, warranty claims, B storefront, A signup/SMTP, Claude final audit, A1 Foundation v1.0.0 and Pre-Launch remain open.
- GitHub CI/Visual Evidence on this new commit must be checked independently before calling this subgate verified.
- PR #12 remains Draft/unmerged; no production Hostinger deployment and no use of Fanshine.

## Next gate

**C-13/03 — Reports:** authenticated branch-safe aggregate/read model built from actual sale/repair/cash source records. Do not reuse tenant-wide `buildOwnerSummary` directly for a branch-only owner view without a separate scoped contract.
