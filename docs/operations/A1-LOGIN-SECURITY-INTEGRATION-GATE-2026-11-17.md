# A1 MOBI — Security Integration Gate (2026-11-17)

## Environment and source of truth
- Thaghr: C:\A1Hub\a1-mobi (development only), branch feat/mobi-billing-sandbox-gate-20261115.
- Baseline before security work: cce34e1; production A1Cloud image and checkout cce34e1.
- Do not discard unrelated dirty worktree files or overwrite Top Mobile production.
- Atlas decision A1-DEC-2026-0020: A1 Trust remains EVALUATING, adoption_effect NONE. Provider-neutral binding is a candidate adapter, not a production approval service.

## Existing capabilities (reused)
- AccountHandle unique indexed identity and username@a1mobi.app mapping, distinct verified external recovery email.
- User primary stable database ID separate from username.
- Tenant/branch-scoped auth contexts and role permissions; platform superadmin separate from store identities.
- TOTP secret encryption, one-time recovery codes, replay protection, revocable sessions; platform admin TOTP.
- Database-backed per-account/tenant/global 15-minute budgets and sensitive-action throttling.
- Account recovery request/reset APIs; *email delivery readiness is still a production blocker*.

## New implementation (local only)
- src/server/turnstile.ts: fail-closed Cloudflare Siteverify on protected routes, hostname/action match, token cap 2048, server-only secret, 6-second timeout; no bypass if verification fails.
- src/app/api/auth/challenge-config/route.ts exposes only public sitekey and feature modes, no secret.
- Signup and recovery request enforce token when A1_MOBI_TURNSTILE_ENABLED=1.
- Repeated login: when A1_MOBI_TURNSTILE_LOGIN_ENABLED=1 and account budget has >=2 attempts inside 15 minutes, a Turnstile token is required; healthy logins are unchanged. Existing login budgets remain in effect.
- src/components/auth-turnstile.tsx uses managed Cloudflare widget with action scope and token rotation. Signup, recovery and login show widget only if corresponding policy requires it.
- src/core/security/approval-binding.ts: deterministic approval request digest scoped to user/tenant/branch/action/requestId/amount/full operation. Does NOT verify cryptographic attestation or authorize payments. Must be combined with verified future Trust service only after Atlas decision.

## Deployment flags (all OFF by default)
- A1_MOBI_TURNSTILE_ENABLED=1 enables signup/recovery.
- A1_MOBI_TURNSTILE_LOGIN_ENABLED=1 enables adaptive login step-up.
- A1_MOBI_TURNSTILE_SITE_KEY=public widget key.
- A1_MOBI_TURNSTILE_SECRET=private Siteverify secret; secret server-only.
- A1_MOBI_TURNSTILE_HOSTNAME=mobi.a1net.tech (exact expected challenge hostname).
- Never enable without provisioning Managed widget with the correct allowlisted hostnames and verifying real browser flows and recovery delivery.
- Apply Cloudflare WAF/rate limit policies separately with explicit tenant/IP safe thresholds to avoid malicious forced lockouts.

## Gaps not closed by this change
- Production Cloudflare Turnstile keys and CF WAF rules not provisioned or verified.
- WebAuthn/passkeys not implemented, nor mandatory MFA enrollment for every store owner; TOTP already available.
- A1 Trust infrastructure not adopted; adapter intentionally disconnected.
- A1 Recover integration: existing backups and restore tooling should be cataloged before adding service hooks. No duplicate backup engine authorized.
- Isolated PostgreSQL test restore and complete ABC regression remain prerequisites to production rollout.
- Credentials, email recovery, backup restore, and actual Top Mobile flows require verification on an isolated staging copy before replacing production.

## One-Click Gate criteria
- G1 baseline: verified if Thaghr source, Git and VPS inspected; all unrelated changes untouched.
- G2 A1 Login: existing implementation baseline only, full formal acceptance pending.
- G3 Turnstile: code/test stage; production activation pending real Cloudflare credentials and browser/siteverify UAT.
- G4 MFA: existing TOTP baseline; passkeys and policy UAT pending.
- G5 Trust adapter: provider-neutral binding stage only; adoption blocked by Atlas.
- G6-G8: full security suite, deployment, and closeout pending.
