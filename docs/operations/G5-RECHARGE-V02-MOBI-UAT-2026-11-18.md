# A1 Mobi — Recharge G5 v0.2 sandbox UAT and rollback checklist
2026-11-18 · NAWA Way / A1 First / Evidence First

**Status: NOT RELEASED, G5 NO-GO**  
Branch: `feat/recharge-g5-v02-mobi-20261118` · Draft PR #14 (base: `feat/mobi-billing-sandbox-gate-20261115`).

## Strict deployment controls
- The current Top Mobile production deployment must stay on the existing verified release. No fresh Prisma migration, image, or environment switch is approved by this stage.
- `A1_MOBI_RECHARGE_ADAPTER_ENABLED=false` always in production. Default disabled even without the variable.
- `A1_RECHARGE_SANDBOX_ONLY=true` as second gate, and `A1_MOBI_RECHARGE_REAL_MONEY_ENABLED` must **not** be `1`.
- API base URL must be local loopback HTTP for this sandbox; no public Recharge Pilot URL, no production telecom or provider access.
- Exactly two independent synthetic tenant/branch mappings registered server-side. Invalid or unknown tenant/branch → deny. User's session and authorization are still required before reaching the API.
- Example environment values (fake only, not valid credentials):
  ```dotenv
  A1_MOBI_RECHARGE_ADAPTER_ENABLED=false
  A1_RECHARGE_SANDBOX_ONLY=true
  A1_RECHARGE_API_BASE_URL=http://127.0.0.1:4588/
  A1_MOBI_RECHARGE_SANDBOX_MAPPINGS_JSON=[{"tenantId":"demo-tenant-A","branchId":"demo-branch-A","merchantId":"test-merchant-A","rechargeBranchId":"test-branch-A","token":"FAKE-REPLACE-ONLY-A"},{"tenantId":"demo-tenant-B","branchId":"demo-branch-B","merchantId":"test-merchant-B","rechargeBranchId":"test-branch-B","token":"FAKE-REPLACE-ONLY-B"}]
  A1_MOBI_RECHARGE_WEBHOOK_HMAC_SECRET=FAKE-local-development-hmac-32chars-minimum
  ```
- Never copy keys to a browser, commit secrets, or use the synthetic tokens as real service authorization.

## Mobi-owned UX and behavior
- Existing manual top-up, cashier, service configuration and supplier settlement must remain unchanged.
- The embedded sandbox is **only** for synthetic catalog/quote/order/cancel/status/replay, with immutable price minor units and time-limited quotes.
- Cashier can request quotes/orders and see status for their assigned tenant/branch; manager `foundation.manage` can cancel pending/replay events; finance `cost.read` or owner can read supplier statements.
- An unknown POST outcome is **not** retried automatically; preserve original idempotency key and external reference and reconcile by read-only status/events.
- Recharge events are captured only: **never** post customer receipt, vendor settlement, cash movement or refund in response to a webhook.
- The supplier settlement API is placeholder/read-only in Recharge v0.2. No actual accounting acceptance is possible yet.

## Test gates
1. **Unit:** receiver cancellation + stable Idempotency-Key, 409 changed payload, invalid cursor, scope isolation, flag OFF, no automatic transport POST retry.
2. **Real independent sandbox HTTP:** two test merchants+branches, verified catalog, immutable quote, order PENDING, replay same ID, CANCELLED version+1, cursor events, cross-merchant 404 and invalid cursor.
3. **Signed inbox:** HMAC over exact raw bytes + timestamp + eventId, test tampering and expiry, event ID collision, durable persistence before 2xx, concurrent duplicate deliveries, error 503 if DB unavailable.
4. **PostgreSQL:** use a disposable database; apply RechargeWebhookInbox migration, exercise uniqueness, version handling and rollback. Do not migrate Top Mobile production.
5. **Mobi money:** add owned order intent, invoice/receipt and unique financial posting keys; prove one and only one ledger entry after retries, restart, timeout, duplicated/out-of-order webhook.
6. **Restore and commercial UAT:** backups, restore, manager/cashier/finance RBAC, Arabic/English/mobile UI, signed Top Mobile test acceptance with synthetic data only.
7. **Security:** actual OAuth2 JWT issuer, aud, scope, key rotation, trusted branch mapping; signed transactional Recharge outbox with replay/DLQ, and authenticated delivery over separately deployed test services.

## Evidence currently observed
- 35/35 focused Mobi unit tests PASS (v0.2 receiver/mapping with existing inbox/HMAC).
- 17/17 cross-project focused tests PASS, including local HTTP to Recharge v0.2 (overlaps above count).
- Targeted TypeScript + ESLint PASS on branch before adding signed webhook HTTP capture.
- Initial webhook route tests caught a deliberately rejected stale timestamp and cold-import timeout; test fixture corrected, **final rerun unverified**.
- New webhook HTTP route typechecking requires an independently generated Prisma client for the `RechargeWebhookInbox` model; shared Thaghr node_modules was outdated. Isolated dependency installation is in progress.
- **Do not call G5 PASS** on the basis of these tests. No actual money, telco execution, customer receipts or real Recharge webhook sender were tested.

## External Recharge team requirements
Provide production-grade OAuth issuer, transactional webhook outbox with agreed HMAC headers and `externalRef`, provider completion/failure evidence, actual settlement journal, cancellation after-dispatch policy, delivery retries/DLQ and sandbox UAT vectors. Preserve separation of databases and accounting ownership.
