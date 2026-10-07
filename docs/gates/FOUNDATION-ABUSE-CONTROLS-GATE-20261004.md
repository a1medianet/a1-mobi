# Foundation Abuse Controls Gate — 2026-10-04

Status: PASS — narrow Foundation hardening gate.

Authority:
- A1 Mobi Master Implementation Brief v1.0
- A1 FIRST Sustainability/Superiority/Innovation Charter v1.2
- AGENTS.md

## Scope
Harden login throttling beyond a single tenant/email pair without trusting client-supplied IP headers, and prevent unbounded retention of authentication-attempt counters.

## Implemented
- Existing account budget preserved: 5 attempts / 15 minutes per tenant + email.
- Tenant-wide shared budget: 120 attempts / 15 minutes.
- Application-wide shared budget: 5000 attempts / 15 minutes.
- All counters are atomic in PostgreSQL and survive worker/process restarts.
- Keys are hashed and do not store raw tenant/email values.
- Counters older than 7 days are removed before login budget consumption.
- No client IP or forwarded header is trusted as an identity boundary.

## Why
A single account-only limiter leaves credential-spraying and broad tenant abuse insufficiently bounded. A layered budget adds defense while avoiding false trust in spoofable proxy headers before a trusted edge policy exists.

## Verification
- Targeted DB auth tests: PASS.
- Full PostgreSQL-backed suite: 75/75 PASS across 32/32 files.
- TypeScript: PASS.
- ESLint on changed files: PASS.
- Optimized production Next.js build (webpack): PASS.
- Existing authentication lifecycle regression: PASS.

## A1 First classification
- PARITY: durable credential-attempt throttling.
- SUPERSEDE: layered account + tenant + global budgets with explicit retention and no untrusted-IP dependency.
- WATCH: trusted-edge/IP/device reputation once deployment topology is fixed.
- REJECT_WITH_REASON: trusting arbitrary X-Forwarded-For / client headers directly.

## Deferred
- MFA.
- self-service password recovery.
- trusted-edge/device-aware abuse signals.
- backup/restore evidence.
- dependency remediation.
- CI/monitoring/logging completion.
- final Foundation consolidation gate.

## Gate decision
PASS for this narrow abuse-control gate. Full Stage 1 Foundation remains OPEN.

