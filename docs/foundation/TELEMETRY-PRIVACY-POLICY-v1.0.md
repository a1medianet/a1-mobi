# A1 Mobi — Telemetry & Privacy Policy v1.0

**Effective:** 2026-10-07  
**Applies to:** authenticated A1 Mobi operational runtime  
**Public marketing analytics:** disabled by default

## Purpose

A1 Mobi emits only the operational signals required to understand application health, release adoption and failure rates. Telemetry is not a substitute for business-domain records and must never be used to reconstruct customer sales, repair content or device-owner activity.

## Allowed events

### app.heartbeat
Allowed fields:
- product key: a1-mobi
- pseudonymous installation ID generated locally
- current application route
- app version, build, release channel, latest/minimum version state
- pseudonymized Tenant and Branch identifiers when A1_TELEMETRY_HASH_SALT is configured
- timestamp

### app.client_error
Allowed fields:
- opaque application/error digest
- route
- pseudonymous installation ID
- pseudonymized Tenant/Branch identifiers
- release/version context
- timestamp

## Prohibited data

Never send:
- passwords, recovery codes or MFA secrets
- session cookies, access tokens, authorization headers or service tokens
- customer names, phone numbers, email addresses or addresses
- IMEI, serial number, barcode payloads or device incident evidence
- product cost, debt notes, repair notes, payment references or free-form customer content
- raw browser storage or request bodies

The product-side Pulse adapter intentionally sends a narrow allow-listed payload.

## Identity and pseudonymization

installationId is a random first-party UUID used for operational adoption/health metrics. Tenant and Branch identifiers are HMAC-pseudonymized before leaving A1 Mobi when A1_TELEMETRY_HASH_SALT is configured. Without a valid telemetry salt, those identifiers are omitted.

## Activation

Authenticated operational heartbeat is attempted only after a valid store session is confirmed. Pulse failure must never block product usage. Public marketing pages do not emit Pulse analytics from this implementation.

## Retention

A1 Mobi does not persist Pulse events locally. The shared A1 Pulse service owns retention. Production activation requires the shared Pulse deployment to publish and enforce its retention/deletion policy and access controls.

## Consent / applicability

Operational health telemetry is treated separately from optional marketing analytics. Any future cookie-based analytics, advertising attribution or cross-site tracking requires its own consent and policy decision before activation.

## Security

Pulse endpoints and service credentials are server-only environment configuration. The browser posts to same-origin A1 Mobi routes; it never receives the Pulse service token.

## Release gate

Before Production/Public release verify:
1. Pulse endpoint ownership and authentication;
2. retention policy is active at the shared service;
3. prohibited fields are absent from captured evidence;
4. error events contain only opaque digests;
5. public pages do not start optional analytics without a separate approved consent flow.
