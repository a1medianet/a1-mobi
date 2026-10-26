# A1 Mobi — Gate 6/7: authenticated cash reconciliation API acceptance

Date: 2026-10-26. Device: Thaghr. Branch: `feat/mobi-abc-continue-20261013`.
Environment: dedicated localhost port 3242, isolated PostgreSQL port 5437, synthetic tenant and real owner login. No production deployment or external customer mutations.

## Verified result — PASS (7/7)

The command `node scripts/gate6-cash-api-acceptance.mjs` exited with status 0. Evidence: `gate6-cash-api-1792995896567/results.json`.

1. Local PostgreSQL preflight — PASS.
2. Isolated localhost Next server — PASS.
3. Authenticated owner and tenant-bound product fixture — PASS.
4. Purchase, checkout, return, count, idempotency, audit and origin controls — PASS.
5. Cash drawer open persisted; duplicate open refused — PASS.
6. Exact-cash preview shows zero variance; nonzero variance requires independent approval and cannot be closed by self — PASS.
7. Exact-cash close persisted `CLOSED`, one audit entry; repeat close refused — PASS.

The pre-existing 21/21 real-browser owner journey and separate 8/8 mobile/desktop AR/EN owner-home screenshot sweep are documented in `GATE6-OWNER-JOURNEY-ACCEPTANCE.md` and `GATE6-OWNER-VISUAL-FOLLOWUP.md`. The responsive task launcher fix is in commit `61eb0ce`.

## Pending acceptance

Gate 6/7 remains **partially open**, because an exhaustive AR/EN mobile and desktop visual run through *every* admin screen was not completed. A 56-case sweep previously stalled during cold Next/Chrome compilation; it is not a PASS and its partial observations are not classified as application defects. The cash browser click-through also stalled due to CDP timeout, so this acceptance certifies the **real authenticated cash HTTP service and persisted data**, not the full visual cash controls.

Physical scanner and receipt/label printer tests are deferred to the pilot customer, per owner direction. A release to production, final 7/6 signoff, or closing 7/7 backup/restore is not authorized by this report.

Original test errors from earlier revisions are retained locally only and excluded from this GitHub evidence set.
