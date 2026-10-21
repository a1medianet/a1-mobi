# A1 Mobi Pilot v1.0 — Thaghr resume checkpoint (2026-10-21)

Scope: C:\A1Hub\a1-mobi, branch feat/mobi-abc-continue-20261013, existing local production-mode preview http://127.0.0.1:3226. No production deploy, PR merge, or real customer transactions.

## Confirmed outcomes

- Full owner browser QA rerun: **75 PASS / 0 FAIL / 0 BLOCKED**, with synthetic mobi_uat identity, AR/EN login/logout, 1440/390 responsive A/B/C routes, team/roles Arabic desktop, real click navigation and visible-image decoding. Evidence: `qa-3226-resume-full/results.json`, `qa-3226-resume-full/EVIDENCE.md` (screenshots remain locally on Thaghr).
- The two failures in the earlier 73/75 run passed in the full rerun. The harness waits for the actual new document and visible image decode within bounded time; does not suppress broken images. The separate negative control verified rejection of a deliberately invalid visible image (`qa-3226-race-final/results.json`).
- `node --check scripts/owner-journey-gate.mjs`, `npx tsc --noEmit`, `git diff --check`: PASS.
- Pilot DB integration run with explicitly loaded local UAT environment (without emitting secrets): **11 PASS / 0 SKIPPED**, 8 test files. Covers IMEI stock movement, sale/invoice/dual currency, repair/warranty, cash reconciliation, debts, reports, top-up and pilot checks. Default `npm run gate:pilot` previously showed 3 PASS / 8 SKIPPED because DATABASE_URL was not loaded; do not mistake that run for a complete gate.

## Remaining before first client

- Complete a human-quality visual review of prior annotated screenshots and obtain Claude independent UX review (not conducted in this checkpoint).
- Prove a single joined inquiry-to-admin-to-sale/repair user journey and any external mail/MFA integrations required for customer pilot. Browser QA and independent DB service integration tests are not proof of that full joined workflow.
- Product-image rights, P0/P1 launch classification, A1 Application Foundation standard compliance, security and deployment/rollback review still require explicit evidence and owner approval.
- Keep PR #12 Draft, do not merge or deploy to production without the owner gate.

## Data minimization

Only redacted JSON/text evidence and the reviewed harness source are suitable for this commit. Keep bulky UI screenshots, transient browser data, local credentials and .env files off GitHub.
