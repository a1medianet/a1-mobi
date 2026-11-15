# A1 Mobi × A1 Billing Sandbox — Local account API follow-up, 2026-11-15

Base: `a1-mobi@c9b56ae` on Thaghr, `C:\A1Hub\a1-mobi`. Billing local source inspected at `C:\A1Hub\a1-billing` HEAD `c224be6` (`src/app/api/customer/account/route.ts` and `src/server/billing/service-auth.ts`). Production/Hostinger/VPS untouched.

## Implemented
- `src/server/mobi-billing-account.ts`: server-to-server scoped customer account GET `/api/customer/account?tenant=<session-bound>&product=mobi`; separate `A1_BILLING_MOBI_ACCOUNT_TOKEN`; response tenant/product identity validation; no cache; timeout.
- Renewal POST contract prepared, with confirmation via subsequent account GET. Server route `/api/billing/mobi/account` is owner-only and origin/JSON validated. Renewal mutation **disabled by default** using `A1_MOBI_RENEWAL_CONTROL_ENABLED=0` until A1Cloud/Paddle UAT.
- Subscription UI refresh reads the scoped account API and shows server-confirmed status/expiry/plan/renewal state. No paid-success inferred from Checkout return.
- Billing URL `https://billing.a1medianet.com` placed only in ignored local `.env.local` (no secret added).
- `.env.example` documents server-only account token and renewal feature gate.

## Verified local test evidence
- 4 focused Vitest suites: **21 PASS / 0 FAIL**; tests cover account GET, scoped bearer, cross-tenant mismatch, missing token, renewal POST contract, no premature renewal control, owner-only route, origin/tenant injection rejection, existing trial/checkout mocks.
- The tests use mocked HTTP and mocked owner session, **not live Billing**.
- Account token XML found on Thaghr under `%LOCALAPPDATA%\A1Billing-AccountTokens.xml` with `Mobi` entry of SecureString type. Token value was never displayed.
- Current Mobi ignored `.env.local` **does not contain** `A1_BILLING_SERVICE_TOKEN` or `A1_BILLING_MOBI_ACCOUNT_TOKEN` at the time of inspection. The attempt to install the encrypted account token was blocked by the tool's safety checks. Do not claim installation or live API success.
- No real test store/owner provisioned or mutated; DB target not proven isolated. Top Mobile explicitly deferred.
- Full checkout/payment/HTTPS return and renewal cancellation explicitly deferred to A1Cloud.

## Pending / next safe gate
1. Configure both server-only tokens securely on Thaghr without exposing them to chat, Git, logs, or browser; verify `A1_BILLING_MOBI_ACCOUNT_TOKEN` matches Billing deployed account endpoint and service token supports trials/checkout.
2. Verify `APP_ORIGIN` is the local test address, and dedicated disposable local DB is confirmed (not production).
3. Provision two disposable test stores/owners; log in as owner; start 14-day trial for first; verify 409 duplicate, expiry, independent second store, and staff 403.
4. Test monthly/annual Checkout URLs and account refresh, without actual payment. Do not infer payment from redirect alone.
5. Later on A1Cloud: Paddle webhook/return UAT, renewal opt-out retains access to period end, Top Mobile separate UAT, deployment authorization.

## NAWA Way gate
Local source/test gate may pass; **live Sandbox acceptance BLOCKED** pending scoped tokens and verified isolated DB. No release or deployment authorization.
