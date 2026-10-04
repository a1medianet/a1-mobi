# Foundation Control Gate — 2026-10-04

Status: PASS — implementation, regression, browser/HTTP evidence, and post-fix independent re-review verified.

Authority:
- A1 Mobi Master Implementation Brief v1.0
- A1 FIRST Sustainability/Superiority/Innovation Charter v1.2
- AGENTS.md

## Scope
This narrow gate adds server-side tenant/branch user control, tenant role management,
one-time initial store provisioning, session revocation on password/deactivation,
mutation audit evidence, and truthful Foundation health readiness.

It does not claim full Stage 1 Foundation PASS.

## Implemented
- GET/POST /api/admin/users
- PATCH /api/admin/users/[id]
- GET/POST /api/admin/roles
- PATCH /api/admin/roles/[id]
- POST /api/bootstrap
- GET /api/health with live DB readiness
- Permission registry seeding
- Tenant/branch-scoped user administration
- Tenant-scoped role administration
- Protected system-role assignment
- One-time empty-database provisioning
- Password/deactivation session revocation
- Audit events without password/session-token disclosure
- Repeatable HTTP smoke script: scripts/foundation-control-http-smoke.mjs
- Bilingual AR/EN Team & Access browser UI at /[locale]/settings/team
- Responsive desktop/mobile review evidence in docs/reviews/2026-10-04/

## Security boundaries
- User administration requires users.manage.
- Role administration requires roles.manage.
- Assigning roles through user administration additionally requires roles.manage.
- Users are restricted to the authenticated tenant + branch.
- Roles and role assignments are restricted to the authenticated tenant.
- Unknown permission codes are rejected.
- System roles are immutable through normal role update.
- System-role assignment requires foundation.manage.
- Role administrators may only delegate permissions they themselves hold.
- An administrator cannot deactivate itself or rewrite its own roles through this gate.
- Password changes and deactivation revoke outstanding sessions.
- Bootstrap is protected by a >=32-character server secret, has no public UI, runs
  in a serializable transaction, and refuses to run after the first tenant exists.
- Sensitive mutations emit AuditEvent without password hashes, raw passwords or tokens.
- Mutation endpoints require same-origin and JSON boundaries.

## Privilege-escalation review
Claude's first read-only review found that roles.manage could create/update a role
with permissions the actor did not hold.

First fix:
- Added assertGrantablePermissions().
- createTenantRole and updateTenantRole reject unheld permissions.
- Added create/update role escalation regressions.

Claude's final pre-commit review then found a second assignment-path blocker:
an actor could assign an already-existing non-system role containing permissions
the actor did not hold.

Second fix:
- rolesForTenant now loads the role's live permission grants.
- assertAssignableRoles checks those live grants before both create-user and
  update-user role assignment.
- foundation.manage remains the explicit authority required for system-role assignment.
- Added direct regressions for assigning a pre-existing cash.manage role through
  both createStoreUser and updateStoreUser.

Independent post-fix re-review:
- create-user assignment path: PASS.
- update-user assignment path: PASS.
- system-role protection: PASS.
- regression coverage: PASS.
- reviewer corrected its earlier stale-permission concern: session resolution
  re-queries roles and permissions from the database on every protected request.

Final verdict: FOUNDATION_CONTROL_REREVIEW_PASS.

## Verification
- TypeScript: PASS.
- ESLint: PASS.
- Full PostgreSQL-backed suite: 74/74 PASS across 31/31 files, no DB skips.
- Targeted privilege-escalation regression after final assertion: PASS.
- Production Next.js optimized build: PASS.
- HTTP smoke: PASS.

### HTTP smoke evidence
Against production-mode local server on 127.0.0.1:3102:
- health = 200, database-ready
- unauthenticated admin users = 401
- login = 200
- scoped users = 200
- create role = 201
- create user = 201
- update/deactivate user = 200
- cross-origin role mutation = 403
- bootstrap without configured server secret = fail-closed 503
- logout = 200
- old session after logout on admin endpoint = 401
- temporary fixture cleanup executed

## A1 First evidence
Created:
docs/A1-FIRST-INTELLIGENCE-DECISION-REPORT-v0.1.md

The report records:
- current competitor/market evidence,
- adopted capabilities and why,
- rejected/deferred/watch decisions and reopen conditions,
- value contribution map,
- value-expansion opportunities,
- original A1 innovation candidates,
- source/reference ledger,
- current decision ledger,
- continuous watch scope.

## Deferred beyond this narrow gate
- Self-service account recovery.
- MFA.
- Global abuse budget and retention cleanup.
- Backup + restore proof.
- dependency remediation.
- CI/monitoring/logging completion.
- operational UI-to-DB wiring.
- Tauri.
- production deployment.
- real-store Stage 9 UAT.

## Gate decision
This narrow Foundation Control gate is PASS.

Full Stage 1 Foundation remains OPEN. Account recovery/MFA, global abuse controls,
backup/restore proof, dependency remediation, CI/monitoring/logging, and the final
Foundation consolidation gate remain before Stage 1 can be closed.
