# A1 Mobi — A1 Shared Services Integration Contract

**Status:** REQUIRED ARCHITECTURAL CONTRACT  
**Effective:** 2026-10-07

## Principle

A1 Mobi remains an independent product with its own domain, journey, data model and release gates. Shared A1 platform capabilities are consumed through explicit contracts and MUST NOT be reimplemented ad hoc inside this repository.

## Canonical account hierarchy

Account → Organization/Merchant → Store Tenant → Branch → Members/Roles

The product may add domain-specific entities below the Tenant/Workspace boundary, but identity, organization membership and commercial entitlement decisions must remain separable from domain records.

## Shared capabilities

| Capability | Ownership | Product responsibility |
|---|---|---|
| Identity / Authentication | A1 shared identity contract | Consume identity/session claims; keep product RBAC and domain permissions explicit |
| Organizations / Membership | A1 shared account contract | Map membership to product tenant/workspace roles |
| Billing / Subscription | **A1 Billing Core** | Never duplicate subscription ledger; consume plan/entitlement state |
| Entitlements | A1 Billing Core + product policy | Gate product capabilities fail-closed when entitlement is unavailable |
| A1 Assist | Shared integration contract | Product-aware help/actions only within allowed product capabilities |
| A1 Pulse | Shared telemetry contract | Health, version, product telemetry with privacy/consent controls |
| Guide / Help Center | Shared guide contract | Product-specific help content and deep links |
| App Protection | Shared security baseline | Product-specific authorization, audit, abuse and secret controls still required |
| Update / Version | Shared application-foundation contract | Expose version/update/compatibility state |
| Evidence / Release Gate | A1 Application Foundation | No Production/Public PASS without executed evidence |

## Commercial entitlement model

Branches, staff seats, POS, repair, inventory, device trust, reports, integrations.

Billing provider details must stay behind A1 Billing Core. This repository should integrate against stable account/plan/entitlement interfaces instead of provider-specific payment logic unless the product itself owns customer transaction payments as domain functionality.

## Landing and application surfaces

Public product landing is separate from authenticated store operations.

Every product must provide:
- clear public value proposition,
- product capabilities and audience,
- pricing/plan entry point or contact/demo path,
- sign-in / create-account path when commercially enabled,
- privacy / terms / help links,
- status/version disclosure where appropriate,
- responsive AR/EN behavior when the product supports Arabic.

## Multi-tenant rule

No tenant is selected only from client input. Tenant/workspace resolution must be authenticated or host/routing-bound and verified server-side. Cross-tenant access must fail closed.

## Release rule

Adopting this contract does **not** claim the shared services are already implemented. Each capability requires evidence and an explicit compliance state:

`standard_id + standard_version + compliance_status + evidence_refs + remediation + upgrade_status`

No missing shared capability may be marked PASS merely because another A1 product implements it.
