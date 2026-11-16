# A1 Mobi — G2.8 Support local pilot integration

Date: 2026-11-16. NAWA Way / Evidence First / One-Click Stage Gate.
Status: **ISOLATED BRANCH — NOT MERGED / NOT DEPLOYED**.

## Source and isolation
- Main working tree remains `C:\A1Hub\a1-mobi`, with unrelated uncommitted work; untouched.
- Isolated worktree: `C:\A1Hub\_mobi_support_g28`.
- Branch `feat/support-mobi-local-gate` based on `750cd2a128c84cafddacad775e1ba0e004803bdd`.
- Original A1 Support widget `a1-support/src/support-center-widget.mjs` staged byte-identically at `public/a1-addons/support-center.mjs`, checked by test.
- No second customer login or duplicate support ticket database.

## Implementation
- Page `/[locale]/support` uses the application's existing active hashed-cookie session via `currentStoreContext()`.
- API route `/api/a1-support/[operation]` supports `GET session/tickets/thread` and `POST tickets/reply` only in non-production, and only after BOTH `A1_MOBI_SUPPORT_FEATURE=enabled` and `A1_MOBI_SUPPORT_API_ACCEPTED=true` are set by an authorized local operator.
- Local-only contract `src/core/support-local-contract.ts`: Mobi tenant/user/session CUIDs are validated independently from Support UUIDs. The trusted Mobi session supplies the actor. A server-held map links the Mobi tenant CUID to a provisioned Support UUID. No browser-supplied app/tenant/actor/role is trusted.
- Mutation security: existing same-origin middleware plus session-bound HMAC CSRF token from `GET session`; server-to-server HMAC service key never reaches browser.
- Signed transport target only `http://127.0.0.1:<port>/internal/support`, no non-local addresses or VPS.
- Frontend integration loads a no-extra-login `<a1-support-center>` web component after fetching the host-issued CSRF token.
- **These are disabled-by-default staged routes; the live local Support process and actual Mobi login have not been connected to them yet.**

## Local environment variable names (NOT values)
- `A1_MOBI_SUPPORT_FEATURE` — default unset.
- `A1_MOBI_SUPPORT_API_ACCEPTED` — default unset.
- `A1_SUPPORT_LOCAL_ENDPOINT` — loopback-only, guarded by code.
- `A1_SUPPORT_MOBI_SERVICE_KEY` — server-held, minimum 32 characters.
- `A1_SUPPORT_MOBI_CSRF_KEY` — separate server-held, minimum 32 characters.
- `A1_SUPPORT_MOBI_TENANTS_JSON` — admin-reviewed map of **host tenant CUID -> Support UUID**. Never accept tenant mapping from browser.
Never commit actual values. Do not enable in production or on VPS.

## Evidence
- `node --test tests/support-pilot-gate.test.mjs tests/support-local-contract.test.mjs`: **7/7 PASS**, zero failures or skips.
- `vitest run tests/support-api-route.test.ts --maxWorkers=1`: **6/6 PASS**, including feature gate, absence of host session, CSRF/origin failures and trusted context.
- `tests/support-crossrepo-local.test.mjs` against isolated PostgreSQL: **1/1 PASS** via actual Mobi signer -> localhost signed HTTP -> A1 Support identity registry -> PostgreSQL ticket, read, and revocation.
- TS/TSX parse: 5/5 new files PASS; overall Mobi `tsc` currently FAIL due five unrelated existing Prisma `recoveryEmailToken` client errors. **Do not claim full typecheck/build acceptance**.
- The original Mobi active worktree and the A1Cloud VPS have NOT been modified.

## Next
- Operator reviews local tenant/user membership, provisions one disposable test identity in isolated Support database and supplies secrets outside Git.
- Start local Support service and Mobi server; test actual cookie sign-in, write CSRF, logout and tenant/revocation, responsive UAT and screenshot evidence.
- Fix the unrelated full project typecheck blocker in an approved Mobi workflow, run regression suite, and merge only after acceptance. Count follows separately.

## G2.8.1 — REAL Mobi PostgreSQL session, isolated dual-DB acceptance (2026-11-16)
- Created **new dedicated local-only PostgreSQL database** `a1_mobi_support_g28_isolated` on existing test container `a1-mobi-uat-local-pg` at `127.0.0.1:5438`. It did not reuse customer or production data. Applied **all 17 tracked Mobi Prisma migrations successfully**.
- Added `tests/support-mobi-real-session-db.test.ts` in the isolated Mobi support worktree. It creates a disposable actual Prisma Tenant/Branch/User/Session, obtains the genuine opaque session token and stores its **hash** in the test database. Only Next.js's `cookies()` accessor is mocked to supply that token; **the real `currentStoreContext`, `resolveSessionContext`, route `GET/POST`, signed local HTTP transport, Support identity registry, active membership and PostgreSQL RLS are exercised**.
- The test starts the local Support pilot on `127.0.0.1` with two distinct signing/CSRF fixture keys, provisions only the disposable fixture identity in the isolated Support test database, and uses a server-owned Mobi CUID → Support UUID mapping. It never makes a production customer session or user.
- Verified real route: obtain a session-bound CSRF token; POST without CSRF and with foreign Origin return 403; injected browser `role/tenantId/verifiedSubject` fields are ignored; create/list/read/reply persist in Support PostgreSQL; Support membership revocation makes API unavailable (503); Mobi session revocation returns 401.
- Both fixture tenants, test users, related Support tickets, identity records, audit events and sessions are removed during test teardown. The dedicated empty test database may remain for repeatable isolated test migrations.
- **G2.8.1 isolated integration:** 3/3 PASS. Together with route regression 6/6 and local feature/contract tests 7/7, **16/16 PASS, 0 FAIL, 0 SKIP**.
- **Important qualification:** this validates a *database-backed Mobi session and actual Next route* with a mocked Next cookie accessor, NOT a browser login through Mobi's UI or live Top Mobile account. The browser, full Mobi typecheck/build, backup/restore, approved production transport, real operator identity and VPS pilot remain **OPEN**. G2.8 is **PARTIAL**; release NO-GO.
- No work was merged into the actively edited Mobi worktree; no Count or VPS changes; test credentials are dynamically loaded by temporary external-only runner and are never committed.

## G2.8.2 — Explicit one-click local acceptance gate
- Added `scripts/support-g28-local-gate.cjs` and `npm run gate:support:local` in this isolated Mobi integration branch. The runner reads its two isolated PostgreSQL credentials directly from the local Docker test containers at runtime; it does not print them, persist them, migrate a database, deploy code, or provision identities.
- **Fail-closed by default:** `A1_SUPPORT_LOCAL_TEST_GATE=enabled` is required and `NODE_ENV=production` is denied. Verified default run returns `SUPPORT_G28_GATE_DISABLED`.
- On Thaghr with only the ephemeral environment flag enabled, ran `npm run gate:support:local`; observed `SUPPORT_G28_ONE_CLICK_LOCAL_ACCEPTANCE_PASS (7 node + 9 vitest)`, **16/16 PASS, 0 FAIL, 0 SKIP**.
- Prerequisites: isolated `a1_mobi_support_g28_isolated` database with its 17 migrations, local `a1-support-g1-db`, and dependencies installed in the worktree. No production or VPS flags enabled. Do not run using customer data.
- This gate proves local contracts and database-backed host route, but not full browser login, UI acceptance, deployment, or cross-instance production cryptography. G2.8 remains PARTIAL / production NO-GO.
