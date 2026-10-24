# A1 Mobi — C-LIVE-02 / CASH-CONCURRENCY-GATE-07

**Date:** 2026-10-18
**Executor:** Thaghr only
**Canonical workspace:** `C:\A1Hub\a1-mobi`
**Repository / PR:** `a1medianet/a1-mobi`, PR #12 (Draft, do not merge)
**Environment:** Isolated local `mobi_uat` PostgreSQL, loopback `127.0.0.1:5438`. No production database or live customer payments.

## Verified defect and fix
- A newly added concurrent cash movement / drawer-close regression test initially **FAILED**: committed ledger USD 5 but close `expectedBase` remained USD 10 rather than USD 15.
- Root cause: under PostgreSQL SERIALIZABLE, the close transaction could retain an older ledger snapshot despite waiting for an explicit session-row lock.
- `recordCashMovement` and `closeCashSession` now lock the same `CashSession` row before mutation or reading closing movements.
- Closing uses READ COMMITTED with the explicit row lock, so the ledger query sees transactions committed before acquiring the lock. Closing count, CLOSED state and audit remain atomic in one DB transaction.
- Movement idempotency now rejects conflicting replays that reuse the same key with changed session, actor, direction, type, currency, amount, rate, source or reason.
- No new payment methods, credentials, refund payouts or production endpoints were introduced.

## Test evidence
- After the correction, focused PostgreSQL tests `tests/cash-db.test.ts` and `tests/c-live-02-route-db.test.ts`: **7/7 PASS**, **2/2 files PASS**, 0 failed, 0 skipped, exit 0.
- Tests cover dual-currency drawer balance; original movement replay; conflicting same-key replay; missing variance approval; double-close refusal; refusal to add cash movements after close; concurrent movement vs close; real repair lifecycle, persisted payment, tenant and permission guards.
- TypeScript (`npx tsc --noEmit`) and focused ESLint **PASS**, exit 0, run on Thaghr after the fix.
- Full local PostgreSQL regression suite: **50/50 files PASS, 133/133 tests PASS**, 0 failures and 0 skips, exit 0; run with isolated, explicitly guarded `mobi_uat` DATABASE_URL.
- GitHub Actions CI and visual workflow must be verified again on the new pushed commit; previous green checks do not certify these changes.

## Recovery health is NOT cleared
- `GET http://127.0.0.1:3198/api/health` in Next **development** reported `status=ok`, database ready, MFA configured, but recoveryDelivery `not-configured`. This is NOT proof of production readiness; non-production mode intentionally does not require recovery delivery for HTTP 200.
- No local SMTP credential has been configured. A real authorized mailbox, TLS/465 or STARTTLS/587, approved `hi@a1medianet.com` sender, validated HTTPS APP_ORIGIN and safe secret storage remain required.
- Production recovery email delivery, expiration, duplicate and replay validation remains **BLOCKED** until a real end-to-end test mailbox delivery is evidenced.

## Explicit unresolved gates
- `postSaleReturn` currently restores stock and updates the sale status, but this alone does not verify a cash REFUND movement, actual payout or full accounting reconciliation. **Refund settlement / reports HOLD.**
- Repair warranty issuance is covered by the existing delivery tests; warranty **expiry / claims** are not yet certified. **HOLD.**
- Review customer-visible Arabic/English wording on desktop and mobile against the signed-off A/B/C references. Owner signoff still required.
- `A1-STD-APPLICATION-FOUNDATION@1.0.0`, rollback/backup restore, production TLS/SMTP, Pre-Launch and security review remain OPEN.

**Stage Gate:** Cash concurrency source hardening is a local-UAT subgate only. Do not merge PR #12, deploy to production, or represent the entire application as finished.
