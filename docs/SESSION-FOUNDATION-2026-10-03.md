# Session resolution checkpoint — 2026-10-03

Source: Master Implementation Brief v1.0 and AGENTS.md.
All operational workflows remain required.

## Implemented
- Server lookup hashes the incoming opaque session token.
- Expired/revoked sessions and inactive users are rejected.
- Branch must exist and belong to the session user's tenant.
- Permission grants from foreign-tenant roles are excluded.
- Permissions are read from current database records on every resolution.
- Shared permission guard rejects absent sessions and missing permissions.

## Scope
This checkpoint does not implement login, logout, cookies, throttling,
or route/service integration. Public prototype pages remain prototypes.
No production readiness or completed authentication gate is claimed.

## Consultation
Claude reviewed the project and prioritized auth, boundary RBAC,
POS/device trust, remaining workspaces, then physical pilot evidence.
Gemini CLI failed with UNSUPPORTED_CLIENT; no Gemini review was obtained.
Fanshine is unavailable; its uncommitted auth work could not be recovered.
The connected Thaghr checkout was fast-forwarded from 06dd94c to fea5d84.

## Review decision
Claude confirmed tenant/role isolation and flagged nullable branches.
This helper resolves branch-scoped operational context, not general login.
A tenant/HQ account may authenticate without a branch; it must select an
authorized branch before receiving this operational context.
Future tenant administration needs a separate tenant-scoped session context.
Expiry is checked against the database server request clock without grace.
No permissions from cookies or client-provided tenant IDs are accepted.

## Verified evidence
- Full suite with PostgreSQL: 62/62 PASS, 22/22 files.
- Lint, TypeScript and optimized Next.js build: PASS.
- HTTP smoke: /ar, /en, /ar/inventory = 200; /ar/toString = 404.
- Claude's final read-only review: no blockers for this limited scope.
- npm test now generates Prisma first on a clean checkout.
- Argon2 test budget is 20 seconds, with an incorrect-password assertion.
- Initial clean-checkout test failure was missing Prisma generation; corrected.
- Validation ran in C:/Dev/a1-mobi-validation-20261003 because original
  node_modules remained locked. Preview runs there on 127.0.0.1:3100.

## Gate result
Technical branch-session checkpoint: PASS.
Complete authentication, connected operational UI and Stage 9: BLOCKED.
Gemini consultation is unavailable, and physical pilot evidence is outstanding.
Dependency audit reports 8 high findings total, 3 when omitting development
dependencies (deepmerge-ts through Prisma). No forced downgrade was applied.
No workflow requirement was removed and no production deployment occurred.

## Next work
Complete login/logout, durable throttling and session cookie integration;
enforce identity and permissions at each server boundary; connect POS and
device trust, then the remaining store workspaces. Recover/reconcile
Fanshine's uncommitted authentication changes when that device is available.
