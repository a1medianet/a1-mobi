# Gate 7/1 final local E2E — Thaghr

Scope: `C:\A1Hub\a1-mobi`, branch `feat/mobi-abc-continue-20261013`, base HEAD `833675a`. Local PostgreSQL `127.0.0.1:5437` only. No production/public release, Assist, commit, push, merge or deployment.

## Intelligence, decision and source ledger

Discovery/inspection PASS: read AGENTS.md, all seven pre-existing tracked diffs, existing barcode/POS, returns/counts and label evidence, auth/bootstrap/live-01/returns/count routes, scan utilities, UI panels, compose target and existing owner-journey CDP approach. Preserved pre-existing tracked edits and untracked QA assets. Local prior evidence supplies Master Brief/Charter context; this run makes no newly researched competitor or superiority claim.

Plan PASS: reuse real auth and operational endpoints; unique synthetic tenant/owner, random in-memory credentials, compose-derived literal loopback DB target, dedicated loopback dev server, exact inventory and audit assertions, then Chrome CDP keyboard Enter and AR/EN print rendering. No migrations, resets or deletes. Business records retained for inspection; generated owner sessions revoked at teardown. This is local verification, with owner testing still required.

Value rationale: executable full transaction chain and persisted balance/audit checks close the gap between mocked route/unit tests and store workflows. Source comparison found receiving used first-match lookup while POS and label selection rejected ambiguity. Small fix: receiving now rejects cross-product barcode/SKU collisions and explains the error in AR/EN; regression covers both catalog orders and unchanged draft.

Rejected/deferred: no fabricated authenticated success from rendered demo pages; no environment-file changes, physical scanner/printer claims or cash-payout claim (return records value and stock; cash settlement remains separate). Hardware calibration and owner acceptance deferred to owner. Innovation opportunity: retain this repeatable local gate and extend calibrated printer/media acceptance after software checks.

## Reproduction

Run `node scripts/gate71-local-e2e.mjs` from the repository. Requires existing schema on local compose PostgreSQL 5437, installed dependencies and Chrome at the existing repository-script path. It starts its own dedicated app on 3239 with the pilot enabled, never loads `.env.local` itself, and writes redacted stage results to `results.json`. Next may read local env files, but process-level DB/origin/pilot/bootstrap overrides are explicit. Synthetic owner credentials/cookies are never logged. No physical devices are needed.

## Results

Verification in progress; final results are appended after browser completion. Initial database TCP probe refused connections and Docker API access was denied. A subsequent runner preflight connected successfully; no service/container mutation was performed by this worker.

- HTTP chain PASS: true login with HttpOnly cookie and session permissions; anonymous denial; own-tenant catalog and no-store. Receive 5, sell 3, return 1, count 4: balances 0 → 5 → 2 → 3 → 4. Exact receive/sale/return/count replays, persisted movement counts and sale/return/count before/after audits checked; stale count and foreign origin rejected.
- Focused Vitest PASS: 10 files, 110 tests, including new receiving ambiguity regression.
- Scoped ESLint PASS, including gate runner and touched/preserved implementation and tests.
- TypeScript `tsc --noEmit` PASS.

Overall Gate 7/1 is not declared PASS until the remaining browser verification and owner acceptance are recorded. Print checks concern browser/CSS rendering only.
