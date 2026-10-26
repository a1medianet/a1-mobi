# A1 Mobi — C-LIVE-02 / SMTP-HOSTINGER-GATE-08

Date: 2026-10-18
Device: Thaghr ONLY
Project root: `C:\A1Hub\a1-mobi`
Repository: `a1medianet/a1-mobi`, Draft PR #12

## Approved Hostinger transport profile

- Recovery sender and SMTP authenticated mailbox identity: `hi@a1medianet.com`.
- Outbound mail host: `smtp.hostinger.com`.
- TCP 465 with implicit SSL/TLS; the existing Nodemailer transport uses `secure: true`, `requireTLS: true`, minimum TLS 1.2 and certificate validation when configured with this port.
- Configuration documented in the tracked `.env.example` without any live password or authorization token.
- Existing `src/server/recovery-mail.ts` and recovery delivery tests support SMTP 465. No parallel mail subsystem was created.
- Merchant-specific customer-facing sender/contact details remain separate from A1 Mobi account-recovery identity.

## Live network checks from Thaghr (no authentication, no email sent)

- TCP connect to `smtp.hostinger.com:465`: **PASS**.
- TLS handshake to the named server, certificate validated with the system trust store: **PASS**, negotiated **TLS 1.2** and encrypted/authenticated TLS channel.
- `a1medianet.com` MX lookups: **PASS**; provider answers `mx1.hostinger.com` and `mx2.hostinger.com`.
- Root TXT **SPF record present**; `_dmarc.a1medianet.com` **DMARC record present**. These presence checks do not certify policy correctness or end-to-end deliverability; DKIM not yet verified.
- Current local `.env.local`: `APP_ORIGIN` is loopback `http://127.0.0.1`. SMTP host, port, username, password, from, webhook URL and webhook secret were **all absent** at inspection. We did **not** change local UAT secrets or issue a recovery email.

## Explicitly unverified / blocked release requirements

1. An approved reachable staging/production `https://` application origin and same-origin `/api/internal/recovery-delivery` webhook.
2. Credentials entered only into the approved private runtime/hosting secrets store: `A1_MOBI_SMTP_PASSWORD` plus an independently generated `A1_MOBI_RECOVERY_WEBHOOK_SECRET`; never commit them, paste them into chat or include them in evidence.
3. Verify the Hostinger mailbox is authorized to send using this From address, and confirm real delivery to a test inbox. Check both supported locales, reset-link validity/expiration, replay, rate limits and no secret disclosure.
4. Verify DKIM and SPF/DMARC alignment against the actual sending path, and production-mode `/api/health` readiness **after** configuration.
5. Confirm rollback and final Application Foundation v1.0.0 / Pre-Launch checks and owner A/B/C visual approval.

**Decision:** SMTP network/TLS profile READY for further controlled testing; recovery delivery, production HTTPS readiness and overall product launch remain **HOLD**. PR #12 stays Draft/unmerged; no public deployment.
