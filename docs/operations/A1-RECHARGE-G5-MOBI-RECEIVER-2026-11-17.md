# A1 Mobi — A1 Recharge G5 M1 Receiver Review and Evidence
Date: 2026-11-17. NAWA Way / A1 First / Evidence First.
Source contract: a1-memory/projects/a1-recharge/G5-A1-RECHARGE-A1-MOBI-INTEGRATION-CONTRACT-v0.1.md (DRAFT, NO-GO).

## Contract assessment
- Accept as sandbox interface draft, NOT a production API. Recharge is owner of order/provider execution/settlements, while Mobi owns customer collection and POS receipts.
- Existing Mobi postTopUp() creates cash movements and provider postings; do NOT invoke it on Recharge callbacks.
- No real Recharge HTTPS API, OAuth2 client credentials, durable webhook inbox, database branch mapping, two-app settlement proofs or customer UAT is available in this local change.
- Contract leaves final event retention and accounting ownership approval open. Do not introduce direct cross-database writes or shared secrets.

## Isolated Mobi code
- src/modules/recharge-bridge/receiver.ts: sandbox flag A1_MOBI_RECHARGE_SANDBOX_ENABLED=1 (OFF by default), additional deny if A1_MOBI_RECHARGE_REAL_MONEY_ENABLED=1. Injected transport provides read-only catalog/settlements plus scoped order requests; stable idempotency key and one-call write with no automatic retry. It validates incoming orders, monotonic versions and terminal states. Returned decisions always financialPostingAllowed=false.
- src/modules/recharge-bridge/webhook.ts: exact raw payload HMAC-SHA256/timestamp/eventId, constant-time signature comparison, merchant/branch validation, pure event collision/duplicate decision. NO endpoint or durable event inbox; not production event processing.
- No modifications to src/modules/topup, cash movements, provider settlements, POS, real Top Mobile data, migrations or production compose.

## Tests
- First receiver + Turnstile + existing topup focused suite: 19/19 PASS, exit 0.
- Final receiver + webhook + existing manual topup suite: 19/19 PASS, exit 0 (2026-11-17 14:35 Beirut); 10 bridge + 5 webhook + 4 manual topup.
- Includes scope mismatch, stable idempotency on retries, unknown outcome not auto-retried, invalid path, replay version, reversal, terminal immutability, signature tamper, timestamp, duplicate event and collision.
- These are isolated mocked contract tests; 38/38 Recharge tests are from source project's handoff, not reverified as a cross-app end-to-end suite.
- ESLint of bridge/webhook/test files PASS (exit 0). TypeScript tsc --noEmit --incremental false PASS (exit 0, 84.59 seconds). G5 remains NO-GO until actual sandbox protocol with durable persistence and financial reconciliation.

## Next gates
M1 next: verify HTTP contract conformance against versioned Recharge sandbox API, 201/200 replay, 409 conflict, 410 quote expiry, 401/403 scope, 422 capability and 503 unknown, plus stable key over network.
M2: two-tenant/branch isolation with dedicated database, durable webhook inbox with unique event IDs, monotonic event processing, signed outbox replay; explicit OAuth2 server-side token audience/scopes.
M3: verify ledger/receipt owner mapping including refunds and reconciliation; simulated merchant acceptance without touching production Top Mobile.
M4/M5: rollout opt-in only after business sign-off, rollback proof, real provider capability and operator approval. Existing manual path remains sole production operation.
