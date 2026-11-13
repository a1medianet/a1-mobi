# A1 Mobi — READINESS-GATE-06 (recovery delivery)

Date: 2026-10-18
Execution node: Thaghr ONLY
Canonical local: C:\A1Hub\a1-mobi
GitHub: a1medianet/a1-mobi, PR #12 Draft

## Verified baseline
- Latest GitHub commit ac376ef passed CI and Product/Pilot Visual Evidence.
- C-LIVE-02 financial browser E2E, full owner repair history search, tenant/branch scoping, and global branch repair KPIs are evidenced in OPERATIONAL-GATE-04 and KPI-GATE-05.
- Local Docker a1-mobi-techzone-uat-20261017 bound to 127.0.0.1:5438, running and serving PostgreSQL.
- Local Next UAT port 3198 responding; health endpoint /api/health returned HTTP 503 on inspection. This endpoint is an overall production-readiness check, not proof of owner-repair route failure.
- Current local .env.local does not declare A1_MOBI_SMTP_HOST, A1_MOBI_SMTP_PORT, A1_MOBI_SMTP_USER, A1_MOBI_SMTP_PASSWORD or A1_MOBI_SMTP_FROM.
- recoverySmtpConfig validates a supported 465/587 TLS port, host, user, password and sender. Production health requires valid recovery status and MFA status. No bypass allowed.

## Required closeout / One-Click Gate
1. Configure a genuine authorized recovery delivery method, with credentials in an approved runtime secrets store (NEVER GitHub, chat, or committed version files).
2. Use a production HTTPS APP_ORIGIN matching recovery URL validation. Local HTTP 3198 UAT is not a production-ready reset-mail endpoint.
3. Validate sender, TLS, delivery and token expiration using a test mailbox only. Check no secrets or reset tokens appear in logs or evidence.
4. Confirm GET /api/health is HTTP 200 with database ready, recovery configured and MFA configured in the target deployment. Retest negative/replay/revoked token paths.
5. Retain recovery 503 and Pre-Launch HOLD until all evidence exists. Do not fake green health or disable security controls.

## Release status
C-owner repair UAT remains test-only. Do not merge PR #12 or deploy publicly on the basis of local demos; A/B/C final visual signoff, cash close/refund/concurrency, warranty claims, Foundation v1.0 and Pre-Launch remain OPEN.
