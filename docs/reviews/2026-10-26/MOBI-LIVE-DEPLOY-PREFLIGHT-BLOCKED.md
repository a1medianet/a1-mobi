# A1 Mobi — 2026-10-26 live deployment preflight

Requested target: https://mobi.a1medianet.com
Source device: Thaghr only; repo: a1medianet/a1-mobi, branch feat/mobi-abc-continue-20261013.
No live publish performed.

## Read-only evidence
- Git branch synchronized with its remote when checked; last release-evidence commit before this report: bc99bfd.
- Pre-existing working-tree modifications and numerous untracked artifacts remain, including owner reports, cash panel, stock/cart, signup and tsconfig. They are user-owned and were not bulk-staged or overwritten.
- The live URL returned HTTP 307 to /product/ar, served by Hostinger with security headers; live build was not identified from response headers.
- Thaghr `npx tsc --noEmit --incremental false`: PASS, exit code 0.
- `docs/gates/A1-APPLICATION-FOUNDATION-PRELAUNCH-20261004.yaml` explicitly says `decision: FAIL`, `release_blocked: true` for PRODUCTION/PUBLIC_RELEASE, with unclosed Pulse, Assist, help, privacy, reporting, update, protection, entitlement and release evidence checks.
- Older `docs/reviews/2026-10-21/MOBI-HOSTINGER-STAGING-HANDOFF.md` still requires verification of Hostinger database runtime and an established rollback path.
- A host control-panel authenticated deployment session was not established in this run.

## Decision
**PUBLIC DEPLOY BLOCKED.** Do not assume the 2026-10-04 FAIL gate is already fixed; re-assess every applicable check against current code and record fresh PASS evidence or scope a strictly isolated non-public pilot that does not override production boundaries.

## Safe next sequence
1. Preserve existing dirty working tree without staging unrelated files. Define a reviewed release commit from the latest branch.
2. Verify Hostinger app deployment mode, source branch/commit, PostgreSQL connectivity, existing data, and actual backup/restore plus rollback with no production mutation.
3. Complete current A1 Application Foundation applicable release checks, identify mandatory defects vs properly deferred pilot-only functionality, and get a passing production gate.
4. Build/test the exact release revision, capture proof and immutable rollback point.
5. Deploy only after passing prerequisites, then smoke-test Arabic/English public and authenticated journeys plus mobile/desktop visual acceptance online.
6. Physical scanner/label/receipt printer tests remain deferred to the real pilot client by explicit owner decision.

Do not describe this checkpoint as a successful deploy.
