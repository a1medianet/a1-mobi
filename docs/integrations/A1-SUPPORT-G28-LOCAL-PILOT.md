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
