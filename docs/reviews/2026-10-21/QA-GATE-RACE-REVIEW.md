# Local browser gate race review

Scope: authorized Thaghr only, branch feat/mobi-abc-continue-20261013, existing production-mode preview http://127.0.0.1:3226. No build, server restart, production action, commit, push or merge performed. Existing origin/output/CDP environment overrides were preserved.

## A1 First decision / source ledger

Discover/Compare and Inspect PASS: prior qa-3226-full/results.json (73 PASS / 2 FAIL), scripts/owner-journey-gate.mjs, src/app/[locale]/settings/team/page.tsx and src/components/team-admin.tsx. TeamAdmin returns only a status paragraph while fetching access controls; the previous fixed sleep could inspect it before a heading exists. Client navigation checked images immediately after the URL changed, before lazy images decoded. No application source defect established.

Plan PASS: fix gate synchronization and privacy only; preserve application, auth, CSRF, RBAC, tenant isolation and English direction. Rejected fixed longer sleeps (machine-dependent), ignoring incomplete/broken images (hides defects), application changes without evidence, and broad suite rerun (unnecessary for this bounded change). Value: remove timing-dependent false failures while retaining bounded failure and real image checks. Innovation opportunity: reusable readiness contract for future journey gates.

Build PASS: full navigation requires the old document marker to disappear, expected pathname and complete document. Layout waits up to 15 seconds for content, then requires visible images to decode within 8 seconds. Only intersecting images are prompted to load eagerly; decode failures still fail. Error-page, overflow and image assertions remain. Cache disabled for repeatable cold image checks. Local HTTP origin and exact mobi_uat database enforced. Configured origin and actual served build are no longer misrepresented by a hardcoded build label. OWNER_QA_FILTER selects named checks while always retaining bootstrap, authenticated setup, console checks and identity-scoped cleanup. Reports/logs redact fixture credentials, bootstrap secret and database URL; screenshots mask input text and redact fixture identity text, restoring DOM afterward.

Test/Evidence PASS: qa-3226-race-focused/results.json: 10 PASS / 0 FAIL. Final cold-cache qa-3226-race-final/results.json: 15 PASS / 0 FAIL / 0 BLOCKED, no console/uncaught errors. Includes all four team locale/viewport variants, seven real navigation clicks, an intentionally undecodable visible image correctly rejected, invalid EN login recovery, AR/EN authentication/logout, actual served EN direction (no CSS injection), verified synthetic fixture deletion and browser/profile cleanup. node --check, npx tsc --noEmit and git diff --check passed. Text report scan found no generated fixture identities. No broad suite rerun; original evidence remains intact.

Intermediate qa-3226-race-cold/results.json retains 14 PASS / 1 FAIL: the new negative control was initially placed after logout and hit an authentication redirect. This was a harness ordering mistake, corrected before the final run; it is not reported as an application pass.

Evidence-backed PASS applies to these focused changes only. Production foundation/pre-launch checks remain outside this task. Commit deferred per owner instruction; changes remain for assistant review.
