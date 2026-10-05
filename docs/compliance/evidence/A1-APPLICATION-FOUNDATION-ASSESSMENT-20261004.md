# A1 Mobi — A1 Application Foundation v1.0.0 Assessment

Date: 2026-10-04
Project: A1 Mobi
Repository: chadiatwi/a1-mobi
Working branch: feat/foundation-account-security-20261004
Standard: A1-STD-APPLICATION-FOUNDATION@1.0.0
Assessment rule: no capability is credited without repository/test/deployment evidence.

## Assessment summary

A1 Mobi explicitly adopts A1 Application Foundation v1.0.0, but current compliance is PARTIAL and the Pre-Launch Gate is FAIL. This does not invalidate completed narrow Foundation gates; it means Production/Public Release remains blocked until the missing Application Foundation requirements are implemented and evidenced.

## A1 Pulse Core — PARTIAL

Evidence found:
- src/app/api/health/route.ts: database/readiness endpoint and current security-configuration readiness.
- src/core/config/domains.ts: health/logging/featureFlags declared as Foundation capabilities.
- docs/gates/FOUNDATION-OPS-GATE-20261004.md: health, logging, CI, backup/restore, operational evidence.

Not evidenced as implemented:
- secure installation identity
- pseudonymous device identity where needed
- account/org link after login
- heartbeat / last seen
- app version + build number reporting
- release channel reporting
- active installs / new installs / DAU-WAU-MAU
- version adoption / feature adoption
- crash-free sessions / startup failure analytics
- update success/failure telemetry
- latest/minimum supported version service
- optional/recommended/required update state
- staged rollout / stop rollout / rollback
- in-app update notification
- stale-version visibility
- remote configuration / percentage rollout
- audited plan/environment rollout controls
- Billing-backed entitlement reporting

Conclusion: PARTIAL, not IMPLEMENTED.

## A1 Assist Integration Contract — MISSING

Repository search found only product/competitor references to assistance; no in-product A1 Assist implementation was evidenced in src/.

Not evidenced:
- version-aware in-product product knowledge
- role/tenant/permission-aware assistance surface
- workflow troubleshooting assistance
- allowed-action execution contract
- Guide/Help Center retrieval contract

A1 Mobi is a user-facing product, so Assist is applicable under the standard.

Conclusion: MISSING.

## A1 Guide / Help Center — PARTIAL

Evidence found:
- README.md
- AGENTS.md
- docs/gates/*
- docs/A1-FIRST-INTELLIGENCE-DECISION-REPORT-v0.1.md

These are engineering/project documents, not a complete user-facing Help Center.

Not evidenced as a complete product Help Center:
- Getting Started
- user guide
- roles & permissions guide
- feature guides
- common tasks
- troubleshooting
- FAQ
- billing/plans help
- release notes surface
- security/privacy help
- support/contact
- version-specific user documentation

Conclusion: PARTIAL, not IMPLEMENTED.

## A1 App Protection — PARTIAL

Evidence found:
- strict server-side session resolution and RBAC/tenant/branch checks
- session revocation
- MFA/recovery hardening work in current branch
- database-backed abuse budgets/rate limiting
- same-origin mutation checks
- no-store auth responses
- security response headers in next.config.ts
- structured log redaction
- PostgreSQL backup/restore proof
- GitHub Actions CI with migration, Prisma validation, lint, TypeScript, tests and production build
- dependency audit documented in Foundation Operations gate

Known gaps / not yet evidenced:
- remaining production dependency audit findings are unresolved
- formal secrets rotation procedure
- formal client/source-map policy
- SBOM per release
- minimum supported application version policy
- block/kill mechanism for dangerous/unsupported versions
- device revocation model where/when desktop/mobile device identity is introduced
- CSP/nonces remain deferred pending final deployment topology
- code-signing/signed-update evidence for future Tauri/Desktop distribution
- explicit release-level supply-chain evidence beyond current pinned direct dependencies/CI

Conclusion: PARTIAL, not IMPLEMENTED.

## Additional Pre-Launch Gate checks

Privacy: FAIL
- Safe logging/redaction is evidenced, but a release-level privacy + data-collection map for Pulse/analytics is not yet evidenced.

Telemetry Policy: NOT_ASSESSED
- Pulse telemetry is not implemented yet; the policy must be defined before telemetry is enabled.

Update Mechanism: NOT_ASSESSED
- Current product is web-first and desktop packaging is not yet release-ready. Platform-specific update policy must be assessed before distribution.

Health / Crash Reporting: FAIL
- Health/readiness is evidenced; crash reporting is not.

Version Reporting: MISSING
- Current/build/latest/minimum supported version reporting is not evidenced.

Entitlement Reporting: MISSING
- A1 Billing-backed server-side entitlement reporting is not yet evidenced in A1 Mobi.

Release Evidence: FAIL
- Stage 1 Foundation final consolidation is still open; Application Foundation release evidence is incomplete.

## Required remediation

1. Integrate A1 Pulse Core via shared contract/adapter, not a project-specific reinvention.
2. Add version/build/release-channel and minimum-supported-version reporting.
3. Add privacy-first heartbeat/health/operational telemetry with a documented telemetry policy.
4. Integrate Billing-backed entitlement reporting when commercial activation is enabled.
5. Implement A1 Assist Contract with version-aware, role/tenant/permission-aware context.
6. Build a standalone AR/EN Guide / Help Center usable without AI.
7. Close remaining dependency audit findings or document an approved tested remediation.
8. Add formal source-map, secret-rotation, SBOM and supply-chain release policies.
9. Add crash/error reporting appropriate to the final runtime.
10. Define update/rollback/kill behavior for each distributed platform before release.
11. Re-run A1 Application Foundation Pre-Launch Gate and attach release evidence.

## Decision

Compliance status: PARTIAL
Upgrade status: CURRENT
Pre-Launch Gate: FAIL
Production/Public Release: BLOCKED by this gate until all applicable checks are PASS or an explicitly justified and approved NOT_APPLICABLE.
