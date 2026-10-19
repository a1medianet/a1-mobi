# A1 Mobi — C-14/01 Safe Checkpoint (19 October 2026)

**Status:** SAFE WIP — NOT FINAL ACCEPTANCE / NOT PRODUCTION-READY
**Device:** Thaghr only
**Branch:** `feat/mobi-abc-continue-20261013` / Draft PR #12
**Starting commit:** `67f8c817e2538a24f8775464bd409a4c1eef57cd`
**Environment:** local PostgreSQL `127.0.0.1:5438/mobi_uat`, isolated Next.js port `3218`; existing port `3185` untouched.

## Delivered in this checkpoint

- Branch-scoped cash snapshot with USD/LBP expected balances and last 30 movements.
- Protected `POST /api/ops/cash/close` with schema validation, origin check, tenant/branch scope, and explicit confirmation.
- Dual-currency physical count and read-only variance preview in Arabic and English.
- Zero-variance close path using the existing serializable cash service, journal and audit.
- **Security restriction:** Approver ID selection does NOT establish independent managerial consent. This pilot API now rejects requests supplying `approverId` or `varianceReason` with `INDEPENDENT_APPROVAL_REQUIRED`. The UI forbids closing a drawer when a variance is present; no fictitious approval is displayed.
- Isolated Chrome UAT script and saved screenshots.

## Verified evidence

- C-14 API suite: **7/7 PASS**, including forged-manager-approval rejection.
- C-13 cash-owner regression: **5/5 PASS**.
- PostgreSQL UAT cash authorization: **1/1 PASS** when explicitly using `.env.local` (not skipped).
- TypeScript `tsc --noEmit`: **PASS**.
- Focused ESLint: **PASS**.
- Chrome: successful authenticated desktop and mobile rendering, four metric cards, no mobile horizontal overflow, and successful USD/LBP preview during one warm run. See `c14-browser-result.json` and PNG screenshots.

## Unresolved / do not claim PASS

1. **Intermittent DB access**: the local Next.js process received Prisma `P1001` against `127.0.0.1:5438`, causing authenticated cash page 500 and login 503 during subsequent browser runs. Docker container `a1-mobi-techzone-uat-20261017` was still running (no restarts); at inspection 44/100 PostgreSQL connections were active. Root cause **not proven**. Do not mask or ignore this instability.
2. Browser-driven **actual close + audit** test not consistently completed. The script now checks persisted CLOSED state and one audit record, but final verification is pending a stable full run.
3. Variance closing requires a separately authenticated manager approval flow. Until implemented and tested, intentional no-variance-only pilot policy applies.
4. Full A/B/C customer journey, SMTP/recovery, inventory/POS, backups and rollback, and Hostinger prelaunch gates remain to be completed and verified independently.

## Release decision

**NO-GO** for production replacement, PR merge, or first-customer pilot until the above gates pass. This is a checkpoint commit on the existing Draft PR only. Previous Hostinger deployment remains unchanged.

## Immediate next execution

1. Stabilize or isolate the `mobi_uat` PostgreSQL Windows/Docker connectivity.
2. Rerun `node --env-file=.env.local scripts/c14-cash-browser-gate.mjs`, asserting persisted zero-variance close and single audit, and screenshot the resulting closed state.
3. Continue C settlement/returns/warranty/POS minimum, then B and A E2E, UX, tenant security and recovery; request explicit production approval only after successful Pre-Launch.
