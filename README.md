# A1 Mobi

A1 Mobi is a specialized operating platform for mobile retail and repair shops.

## Authority
The Arabic and English Master Implementation Brief v1.0 files in this repository
are the Source of Truth. Real-store workflows may be staged, but not deleted.

## Current gate
Stage 1 Foundation: Next.js, TypeScript, PostgreSQL, Prisma, Auth, Tenant/Branch,
RBAC, Audit, AR/EN direction, feature flags, health, and domain boundaries.

## Local start
1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d`.
3. Run `npx prisma migrate dev`.
4. Run `npm run dev`.

## Quality gate
Run `npm run db:validate`, `npm run lint`, `npm test`, and `npm run build`.

A1 Mobi adopts `A1-STD-APPLICATION-FOUNDATION@1.0.0`. Before any Production/Public Release, the evidence-backed A1 Application Foundation Pre-Launch Gate must PASS; adoption alone does not count as implementation.

No later Stage begins without a documented PASS.

## Staging password recovery mail

The optional first-party endpoint is `POST /api/internal/recovery-delivery`.
In Hostinger's secret environment settings, set `APP_ORIGIN` to the staging HTTPS
origin, `A1_MOBI_RECOVERY_WEBHOOK_URL` to that origin plus the endpoint path, and
`A1_MOBI_RECOVERY_WEBHOOK_SECRET` to a strong random bearer secret. Configure
`A1_MOBI_SMTP_HOST`, `A1_MOBI_SMTP_PORT`, `A1_MOBI_SMTP_USER`,
`A1_MOBI_SMTP_PASSWORD`, and `A1_MOBI_SMTP_FROM` (a bare email address).
Hostinger Mail or another SMTP provider may be used; obtain credentials from the
provider and enter them only through hosting secrets. Never paste credentials
into this repository, screenshots, test payloads, or logs.

Only port 465 (implicit TLS) or 587 (required STARTTLS) is accepted. Certificate
verification and SMTP authentication are mandatory. Missing or invalid SMTP
configuration makes first-party recovery readiness fail; external HTTPS webhooks
remain supported without SMTP settings. Readiness checks configuration, not live
SMTP connectivity or inbox delivery. The endpoint authenticates the bearer before
reading a bounded JSON body and accepts only current, matching recovery tokens
and same-origin HTTPS locale recovery links. It sends Arabic/English HTML and text
mail and returns generic errors without recording token or SMTP error details.

Tests mock the SMTP transport; they send no live mail. Before staging acceptance,
an operator must verify provider connectivity and inbox delivery using a dedicated
staging account. No production release or deployment is authorized by this change.
Public trial settings and entitlement guards remain unchanged.
