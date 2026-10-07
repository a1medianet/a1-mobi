# Foundation Operations Hardening Gate — 2026-10-04

Status: PASS — narrow operations/reliability checkpoint. Full Stage 1 Foundation remains OPEN.

Authority:
- A1 Mobi Master Implementation Brief v1.0
- A1 FIRST Sustainability/Superiority/Innovation Charter v1.2
- AGENTS.md

## Implemented
- Structured JSON logging helper with recursive redaction of password/token/secret/authorization/cookie/session/credential fields.
- Health endpoint logs only safe error type on database failure; no database detail is exposed to the client.
- Global baseline response headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy: camera=(), microphone=(), geolocation=()
  - Cross-Origin-Opener-Policy: same-origin
  - X-Permitted-Cross-Domain-Policies: none
  - poweredByHeader disabled.
- Repeatable backup/restore smoke script using PostgreSQL custom-format dump.
- Restore proof uses an isolated temporary database and verifies public table count and completed Prisma migration count before cleanup.
- GitHub Actions CI workflow with PostgreSQL 17 service, install, migrate, Prisma validation, lint, TypeScript, full tests, and production build.
- Direct package specifications pinned to the currently resolved versions to avoid unreviewed drift.
- gate:foundation and smoke:backup-restore scripts added.

## Backup / Restore Evidence
Local Docker PostgreSQL restore smoke: PASS.
- source public tables: 54
- restored public tables: 54
- source completed migrations: 9
- restored completed migrations: 9
- temporary restore database and dump removed after verification.

## Verification
- Full PostgreSQL-backed suite: 76/76 PASS across 33/33 files.
- Structured logging redaction regression: PASS.
- ESLint: PASS.
- TypeScript: PASS.
- Optimized production Next.js build (webpack): PASS.
- Existing auth/control/abuse/domain regressions remain PASS.

## Dependency audit
Production-only npm audit currently reports 3 HIGH findings in Prisma tooling through deepmerge-ts (GHSA-ggr8-5vv4-36mx).
A forced downgrade or blind transitive override was NOT applied because that could create a larger runtime/build risk.
Direct dependencies are now pinned; Prisma/deepmerge remediation remains an explicit Foundation blocker until a tested compatible resolution is selected.

## A1 First classification
- PARITY: restore proof, health/readiness, CI, structured logs, security headers.
- SUPERSEDE: treat restore as evidence, not merely existence of a backup file.
- REJECT_WITH_REASON: untested forced dependency downgrade/override.
- WATCH: stronger CSP/nonces once final production rendering/deployment topology is fixed.

## Deferred
- MFA.
- Self-service password recovery.
- Compatible remediation of the remaining production audit findings.
- Remote CI run evidence after push.
- Final Stage 1 consolidation gate.

## Gate decision
PASS for this narrow operations/reliability checkpoint.
