# A1 Mobi — Recharge G5 Durable Inbox Foundation (2026-11-17)

Status: **G5 M2 PARTIAL / NO-GO**. NAWA Way / A1 First / Evidence First.

## Sources and constraints
- Canonical G5 contract: a1-memory/projects/a1-recharge/G5-A1-RECHARGE-A1-MOBI-INTEGRATION-CONTRACT-v0.1.md
- Recharge local HTTP server is G1 loopback only, serves demo routes such as /orders, NOT the proposed /v1 API or OAuth2 service identity. No authentic cross-application HTTP E2E performed.
- Top Mobile production manual top-up, Mobi POS and supplier settlement remain untouched; no actual telecom calls or money movements.

## Changes
- Prisma model RechargeWebhookInbox with global eventId uniqueness; records tenant, branch, registered merchant identifier, order ID/version, event hash and state, received and optional processing times.
- Matching additive PostgreSQL migration 20261117150000_recharge_webhook_inbox. **Not applied to production.**
- src/modules/recharge-bridge/inbox.ts contains persistence boundary, explicit tenant/branch/merchant checks, duplicate acknowledgement only on identical stored event, collision rejection, recovery from concurrent duplicate race, and fail-closed storage failures. No financial posting.
- tests/recharge-inbox.test.ts exercises new, duplicate, collision, cross-scope, race, DB failure, and invalid event cases with an in-memory mock store. This is **not** proof of a durable PostgreSQL test.
- Explicit production endpoint and worker deliberately omitted: verified service identity, permanent branch mapping, event ordering and actual adapter connectivity still missing.

## Evidence
- 5 Vitest files: HTTP fixture 4, bridge 10, inbox 7, webhook 5, manual top-up 4 = **30/30 PASS**, exit 0 on Thaghr, 2026-11-17 14:58 Asia/Beirut.
- Prisma schema validates with a disposable DATABASE_URL only for parsing; no DB connection or migration execution in this gate. First validation without DATABASE_URL failed P1012, rerun with dummy local URL succeeded. Not a deployed DB change.
- Prisma schema validation PASS with dummy-only DATABASE_URL; targeted ESLint PASS; TypeScript tsc --noEmit --incremental false PASS, exit 0 after 89.30 seconds. No database was connected or migrated.
- G5 remains NO-GO: no real HTTP /v1 service, OAuth scopes, registered merchant-to-tenant mapping, durable DB integration evidence, ordered processing, settlements/receipts tests or Top Mobile synthetic UAT.

## Next Stage Gates
1. Recharge team provides versioned independent sandbox /v1 endpoints + scope-aware authentication and contract test vectors; app never calls Recharge production from Mobi sandbox.
2. On a fresh disposable PostgreSQL database apply migration and verify concurrent duplicate events, tenant/branch constraints, rollback/replay and no cash movements.
3. Build authenticated webhook route + committed inbox transaction and outbox reconciliation. No 2xx until verified durable persistence.
4. Exercise separate services over HTTP with 201/200 replay, 409/410/422/503, timeout unknown, cancellation, order version ordering, cost ledger ownership and customer receipt idempotency.
5. Keep feature OFF in production until controlled release and signed acceptance.
