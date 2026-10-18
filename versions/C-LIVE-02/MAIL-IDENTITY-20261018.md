# A1 Mobi — Approved official mail identity

Approved: 2026-10-18
Device: Thaghr
Canonical root: C:\A1Hub\a1-mobi
GitHub: a1medianet/a1-mobi (PR #12 Draft)

## Decision

Adopt **hi@a1medianet.com** as the official default outbound email identity for A1 Mobi's own account-recovery messages and product-level correspondence.

This does NOT change each merchant/tenant's public store contact email, their login email, their customer list, or any mailbox password. Multi-tenant separation stays intact.

## Configuration

- Default in `src/server/recovery-mail.ts`: `hi@a1medianet.com` if `A1_MOBI_SMTP_FROM` is absent.
- Sample in `.env.example`: `A1_MOBI_SMTP_FROM=hi@a1medianet.com`.
- Custom From remains validated as a single email address. A malformed header must fail closed.
- The existing SMTP username and SMTP password MUST come from private runtime/hosting environment and are not included in GitHub.
- For a real deployment, set `A1_MOBI_SMTP_HOST`, `A1_MOBI_SMTP_PORT` (465 or 587), `A1_MOBI_SMTP_USER`, `A1_MOBI_SMTP_PASSWORD`, `APP_ORIGIN` with HTTPS, and the authorized recovery webhook URL + secret. The authenticated sending account must be authorized by the mailbox provider to use this From address.
- Provider DNS SPF, DKIM and DMARC should be checked before production mail.

## Verified vs pending

- Automated SMTP mock tests validate the configured From address and reject header injection; NOT a real email delivery test.
- Local `.env.local` presently contains no SMTP or recovery-webhook variables; outbound recovery is **not configured**. Do not disable or bypass health/readiness to hide this.
- Sending a live reset message is PENDING real mailbox credentials and secure HTTPS environment. Keep production Pre-Launch gate BLOCKED until delivery, receipt and the full reset flow are confirmed.
- No real credentials, personal mail content or reset tokens are stored in this version document.
