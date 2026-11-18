# A1 Mobi — G5 real cross-project HTTP sandbox, 2026-11-18

Status: **G5 M2 PARTIAL / NO-GO**, NAWA Way / A1 First / Evidence First.

## New Mobi changes
- src/modules/recharge-bridge/http.ts: server-only transport with URL allowlist (HTTPS or loopback HTTP), secret supplied by server callback, explicit merchant/branch headers, API Accept version, no redirects and bounded timeout. No automatic retries after ambiguous POST network failure.
- src/modules/recharge-bridge/receiver.ts: createQuote maps scoped requests to Recharge /v1/quotes; manual top-up path unchanged.
- tests/recharge-live-two-project-http.test.ts: targeted transport safety plus a real loopback HTTP integration with the newly added independent Recharge sandbox service in sibling repository, only when explicit A1_RECHARGE_G5_SANDBOX_MODULE env is set. The other repo and Mobi remain separate; the service uses a disposable SQLite database and no telecom.
- Cross-app test: catalog, quote, durable test order, same-key replay, order lookup, cross-merchant 404, read-only settlements.

## Evidence and boundaries
- Recharge full suite 43/43 PASS before quote replay refinement; focused Recharge sandbox API 2/2 PASS after refinement.
- Mobi focused suite 34/34 PASS before refinement, including 4/4 cross-project transport test; focused cross-project 4/4 PASS after refinement.
- Real network HTTP against loopback service module, NOT production Recharge endpoint. Sandbox opaque bearer tokens are deliberately NOT OAuth2.
- Full external G5 acceptance remains OPEN: OAuth2 JWT scope/tenant/branch + key rotation, signed webhook durable ack, ordered processor/outbox, retry/reconciliation, no-duplicate Mobi receipt financial proof, cancellation and terminal state audits, full Top Mobile synthetic UAT, tested restore/rollback, approval.
- Never enable A1_MOBI_RECHARGE_SANDBOX_ENABLED on production. The manual recharge remains the only production path.
