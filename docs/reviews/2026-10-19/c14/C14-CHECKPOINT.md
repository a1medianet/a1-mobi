# A1 Mobi — C-14/01 Verified Checkpoint (19 October 2026)

**C-14/01 status:** PASS for zero-variance dual-currency cash close; variance approvals intentionally gated.
**A1 Mobi Pilot v1.0 status:** PRE-LAUNCH / NO-GO for customer and production until remaining gates pass.
**Device:** Thaghr exclusively
**Branch:** `feat/mobi-abc-continue-20261013` / PR #12 remains Draft and unmerged
**Baseline:** `67f8c817e2538a24f8775464bd409a4c1eef57cd`

## C-14/01 delivered

- Branch-scoped cash snapshot for USD/LBP with the last 30 movements.
- Protected `POST /api/ops/cash/close` with explicit confirmation, schema validation, origin protection, tenant/branch and manager permission checks.
- Client-side USD/LBP count, exchange-rate input, read-only ledger variance preview and true zero-variance close.
- Persistent CLOSED status and exactly one cash.session.closed audit entry confirmed from a real browser flow against PostgreSQL.
- Critical policy: choosing an approver ID is not proof of manager approval. The endpoint rejects forged approval with `INDEPENDENT_APPROVAL_REQUIRED` and the UI disables variance close until a separately authenticated manager-approval workflow is implemented. The pilot does not misrepresent variance approval as ready.

## Verification and evidence

- API cash-close tests: **7/7 PASS**.
- C-13 cash-owner regression: **5/5 PASS**.
- PostgreSQL C-14 UAT test: **1/1 PASS** (explicit `.env.local` to avoid skipped DB checks).
- Total: **13/13 PASS**; TypeScript `tsc --noEmit` and focused ESLint: **PASS**.
- Isolated optimized production Next.js 16.4.0 build `next build --webpack` using existing generated Prisma Client: **PASS** (exit 0, all 28 static-page steps completed, /ar/cash and /api/ops/cash/close included).
- Chrome against isolated `next start` on `127.0.0.1:3218`: **PASS TWICE** (two separate runs, exit 0). Authenticated 1440x900 desktop and 390x844 mobile each showed four cash metrics, no mobile horizontal overflow; preview showed correct USD/LBP amounts; real zero-variance close persisted CLOSED with exactly one audit record in `127.0.0.1:5438/mobi_uat`.
- Evidence: `c14-browser-result.json`, `cash-desktop-auth.png`, `cash-mobile-auth.png`, `cash-mobile-preview.png`, `cash-mobile-closed.png`; executable browser gate `scripts/c14-cash-browser-gate.mjs`. Synthetic UAT fixtures are removed by the script.

## Known limitations and controls

- During Next.js *development* runs, cold compiles took up to 60 seconds; intermittent Prisma `P1001` against Docker-published UAT database caused HTTP 500 and login 503, despite the container being up (0 restarts at inspection). These symptoms did not recur in the two completed production-build Chrome flows; the underlying intermittent connectivity is not conclusively explained and remains an operational stability check.
- Conventional `npm run build` prebuild Prisma Client generation hit Windows `EPERM` renaming a shared query engine DLL. The isolated optimized Next.js production build succeeded using the existing generated client. Do not claim the conventional build command is reproducible until this lock is resolved without disrupting other services.
- Variance closing with an independently authenticated manager is deferred, intentionally denied by both UI and API.
- Scope not yet accepted: other C journeys (settlements, refunds, warranties, multi-item POS), B real commerce/order/inventory E2E, A signup/login/SMTP/recovery, final A/B/C UX, isolation/security and financial regression suites, HTTPS health monitoring, backup/restore and rollback, Hostinger prelaunch review.

## Release policy

**No PR merge and no production deployment** before comprehensive prelaunch and explicit owner approval. Existing Hostinger deployment and Thaghr Mobi listener on port 3185 were not changed. `A1 Port` remains the user's remote communication channel only. A1 Assist is independent later integration and is not a Pilot blocker.

## Next stage

Finish remaining C first-customer minimum and prove each end-to-end journey; then B, A, UI and Foundation checks; prepare backed-up Hostinger release candidate and rollback exercise; request production approval only after Pre-Launch PASS.
