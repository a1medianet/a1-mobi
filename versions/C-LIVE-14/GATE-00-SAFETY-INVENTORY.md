# A1 Mobi — C-LIVE-14 / Stage Inventory & Safety Gate 00

Date: 2026-10-19
Device: Thaghr only
Local canonical project: `C:\A1Hub\a1-mobi`
Branch: `feat/mobi-abc-continue-20261013`
PR: #12 (Draft, no merge, no production deploy)
Method: A1 First / NAWA Way / One-Click Stage Gate / Evidence First

## Baseline verified before implementation

Local branch clean and matched origin at `ff731726218466da16d89672bf33c98f1877132e`. Three earlier independent commits have completed C-13 read-only gates: cash `0a4fb28`, customers `a310f6d`, branch reporting `ff73172`. Verified `versions/C-LIVE-13/VERSION.md` and the canonical routes. Do not repeat read-only implementation or rename the existing services.

## Inventory of C-14 underlying services

- `src/modules/cash/cash-service.ts` already contains transactional `openCashSession`, `recordCashMovement`, `closeCashSession`, using serializable database transactions and row locks to coordinate movement vs. close.
- `tests/cash-db.test.ts` already tests dual-currency opening, movement idempotency, variance reason/approver requirement, close/audit, post-close movement rejection and concurrent close-vs-write serialization. Reuse these tests, extend only missing owner route/permission/UX cases.
- `src/app/api/ops/live-02/route.ts` currently exposes opening the cash drawer and repair payment under permissions and feature gates, but has **no owner route action for closing the drawer**. Do not directly expose the service without explicit cash.manage authorization, same-origin request validation, actor/approver policy, branch/tenant match, bounds and conflict error mapping.
- `/ar/cash` and `/en/cash` now use `CashOwnerLivePage` in gated UAT. It reads operational session/movement data. A close UI must show an accurate counted cash dialog and expected/actual variance preview, reject accidental repeat and keep amounts/audit consistent.
- Warranty issuance on settled repair delivery exists in Live-02. Warranty **claim handling** and validated return/refund settlement remain separate incomplete gates.
- C-13 report aggregates cash variance and posted refunds from recorded database state, so C-14 must preserve its reconciliation invariants.

## Next minimal implementation gate — C-14/01 (NOT yet passed)

1. Inspect cash close service's full approver and variance invariants, `cash.manage` permissions and current canonical cash read handler. Do not create a second cash ledger.
2. Implement authenticated, same-origin, strict-schema `closeCash` action in existing operational endpoint or a coherently owned sibling endpoint (do not expose a public unauthenticated close). Require exact tenant/branch and session match.
3. Cash owner UI: safe preview, physical USD/LBP count and rate, reason and approver for non-zero variance, confirmation, error/status handling, no false "closed" state.
4. Extend route tests for invalid input, cross-tenant / cross-branch / unauthorized actor / repeated close / concurrency and end-to-end Prisma UAT. Avoid real balances or customer records; only synthetic `mobi_uat` fixtures.
5. Browser AR desktop + EN mobile functional and visual evidence, full TypeScript/ESLint/CI and GitHub Visual Evidence **per commit**.

## Subsequent C-14 subgates

- C-14/02 refund/return settlement and inventory/reversal accounting, preserving immutable audit.
- C-14/03 warranty claim lifecycle / no double-refund or double-settlement.
- C-14/04 multi-item checkout and mixed inventory stock path with idempotent invoices.
- C-14/05 branch cross-screen financial reconciliation, UAT and rollback.

**Stage verdict:** C-14/00 scope / no changes to financial runtime. C-14 is NOT finished. Further production rollout, merge, automatic Hostinger deploy, or live money operations remain HOLD. Record evidence and create a fresh commit only after each passing subgate.
