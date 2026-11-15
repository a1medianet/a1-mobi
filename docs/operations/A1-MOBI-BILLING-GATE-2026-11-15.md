# A1 MOBI × A1 Billing — Thaghr Local Gate (2026-11-15)

## Scope and authority
- Working copy: `C:\A1Hub\a1-mobi` only. No Hostinger/A1Cloud/production deployments.
- Central Billing contract reviewed at `a1medianet/a1-billing@1117b6020ce110204b18b2e01e15164494238e6c`.
- A1 Billing branch is not deployed; only local mocks and code review can pass at this gate.
- Existing dirty source tree had unrelated changes and generated QA evidence. Never stage those accidentally.

## Implementation
- `src/app/api/billing/mobi/route.ts`: same-origin server endpoint, authenticated owner-only, derives tenant and email from server session (not user JSON). Actions `START_TRIAL` and `CHECKOUT` only. Hard whitelist for `mobi-monthly` / `mobi-annual`. Returns no-store responses.
- `src/server/mobi-billing-owner.ts`: server-side tenant/owner/role validation; preserves legacy persisted Billing keys and derives `mobi:<internal-tenant-id>` for new/unbound stores. Top Mobile key migration requires an explicit coordinated Billing data migration, not a silent replacement.
- `src/server/bootstrap-service.ts`: new tenant provisioning persists `mobi:<immutable Prisma Tenant.id>` atomically in the original transaction instead of a slug-derived key.
- `src/server/billing-client.ts`: existing Billing bearer-token client reused. Added checkout request; validates returned absolute URL origin, `/checkout/mobi` path and checkout id. Added local expiry-safe entitlement checks and alias support for Billing `mobi.users` / `mobi.branches` versus Mobi older `staff.max` / `branches.max`.
- `src/app/[locale]/account/page.tsx`: owner-only billing panel added while preserving previously dirty RTL change.
- `src/components/mobi-billing-panel.tsx`: 14-day no-card trial button, monthly USD 20 / annual USD 200 links, server-confirmed status/expiry, refresh after checkout return. Monthly auto-renew control deliberately unavailable until Billing exposes a real state/mutation API.
- Trial signup review label corrected to 14 days (AR/EN).
- `.env.example` documents optional `A1_BILLING_CHECKOUT_ORIGIN`, and requires existing server-only `A1_BILLING_CORE_URL`, `A1_BILLING_SERVICE_TOKEN`, and `APP_ORIGIN`.

## Stage Gate results (local)
| Gate | State | Evidence / limitations |
|---|---|---|
| Billing contract plan/trial/checkout | PASS (source review) | Billing commit 1117b60: `/api/trials`, `/api/entitlements`, `/api/checkout`, `mobi-pilot`, `mobi-monthly`, `mobi-annual` |
| Card-free trial, repeat request | PASS (mocked route) | `tests/mobi-billing-route.test.ts`: trial success, repeated 409, strict actions |
| Stable new-store billing identity | PASS (code + unit) | New stores use Prisma `Tenant.id`; legacy mapping is preserved |
| Top Mobile / other-store isolation | PASS (mocked auth/route) | User-role restriction, tenant key scoped to session; no live Top Mobile test yet |
| Expiry / entitlements | PASS (unit) | Past expiry denies `featureEnabled` and staff/branch limits; central source snapshot clears features |
| Checkout plan + safe return | PASS (mocked HTTP) | Server-only bearer token, fixed product `mobi`, trusted checkout origin, fixed `/{locale}/account?billing=return` |
| Live Billing staging / Checkout / activation webhook / return | BLOCKED | Billing pilot branch has not been deployed, no staging token/price IDs verified |
| Monthly auto-renew opt-out | BLOCKED | Billing lacks verified API/contract for `cancel_at_period_end` or renewal preference |
| Real Top Mobile DB UAT | BLOCKED | Requires isolated non-production DB/credentials and Billing staging mapping verification |
| End-to-end POS access lock after expiration | OPEN | Existing module permissions are separate; cannot claim full application-wide subscription enforcement yet |
| TypeScript | PASS | `docs/operations/evidence/mobi-billing-20261115-type-and-lint.txt`, exit 0 |
| Focused tests | PASS | Five Vitest suites, **21 PASS / 0 FAIL**, `docs/operations/evidence/mobi-billing-20261115-tests.log` |

## Required from A1 Billing team
1. Deploy commit `1117b60` (or tested descendant) to isolated sandbox environment; provide **server-only** API base and service-token secret through secure configuration, never browser/public Git.
2. Configure sandbox Paddle `PADDLE_MOBI_MONTHLY_PRICE_ID` and `PADDLE_MOBI_ANNUAL_PRICE_ID`, verify USD 20/month and USD 200/year and plan response mappings.
3. Validate durable unique trial per product + stable store key, clear 409 behavior on duplicates and expiry; provide a controlled migration strategy for legacy `mobi:<slug>` identities including existing Top Mobile subscriptions.
4. Deliver server-authenticated subscription detail API with `status`, `trialEndsAt`, `currentPeriodEndsAt`, `autoRenew` or `cancelAtPeriodEnd` and cancel-at-period-end operation that **does not revoke paid access early**; documented idempotency/permissions.
5. Confirm checkout `returnUrl` allowlist and success return after authenticated Paddle webhook; Mobi must re-fetch Billing entitlements and never trust query-string success alone.
6. Provide dedicated test tenant(s), webhook sandbox evidence, cancellation/renewal lifecycle and cross-tenant denial tests before release.

## NAWA Way / Stage Gate
No production release and no assertion of live payment success. Complete integration UAT only once Billing sandbox and safe test accounts are available. Preserve any existing dirty local work and stage only the files belonging to this gate.
