# A1 MOBI — Engagement, Campaigns, Contacts and Exports (Gate E1)
Date: 2026-11-13. Evidence First. Product host: mobi.a1medianet.com (Hostinger Business).
STATUS: E1 architecture and customer CSV export implemented locally; import, consent persistence, outbound delivery, XLSX and PDF are NOT live.

## Data ownership and identity
1. Tenant isolation is mandatory. Branch controls operational actions; customer identity belongs to a tenant.
2. Customer origin is an immutable event: STAFF_ENTRY, STORE_ORDER, STOREFRONT_SIGNUP, REPAIR, TOPUP, CSV_IMPORT, API. Do not overwrite origin when merging.
3. Customer records and marketing contacts are distinct. A storefront email address is not marketing consent. An order acknowledgment is transactional, not a marketing opt-in.
4. Match by tenant-scoped normalized phone or normalized verified email. Same email/phone collision is flagged for owner review, not silently merged. Guest store orders may remain guests.
5. Store customer language, timezone, country, preferred channels, contact source, tags, and last activity when these are collected.
6. For every channel and purpose store consent state (UNKNOWN, GRANTED, REVOKED), evidence (text version, timestamp, IP/privacy-limited source and form ID), plus unsubscribe and suppression history. No historical 'inferred opt-in'.

## Product sections
- Customers: register, edit, source, timeline, import preview / validation, export; channel preferences.
- Notifications & Follow-up: work queue, operational reminders and delivery states. In-context widget in Repairs, Top-up, Store Orders, Debt.
- Marketing & Campaigns: audience filters, consent-aware segmentation, templates, birthday/holiday calendar, drafts, approval, scheduling, manual send, delivery analytics. Separate permission from service communications.
- Reports: scoped CSV/XLSX and server-generated PDF per report with filter snapshots, totals, currency and FX rate/source, generated-at, tenant/branch and author; financial reconciliation required before enabling financial exports.

## Trigger model
- Service: repair received/diagnosed/approved/ready/collected; recharge renewal date; order status; payment due. Trigger events in same DB transaction or transactional outbox.
- Campaign: consent-aware schedule only. Never turn operational events into unsolicited advertising.
- Channel adapter: INTERNAL -> EMAIL -> WhatsApp Cloud API / SMS vendor when integrations are approved. Provider webhooks verify signature; all sends idempotent and retryable with bounded exponential backoff.
- Status history: PENDING, SCHEDULED, NEEDS_APPROVAL, READY, SENT, DELIVERED, FAILED, CANCELLED, SUPPRESSED. Store external IDs and timestamps without exposing tokens.
- Central inbox with branch / assignment / source filters, and per-record history using a single notification ID.

## Import/export gates
- CSV/XLSX import: template and column mapping; dry-run preview with sample; duplicate detection; tenant limit; clear create/update/skip policy; partial failures download; audit; rollback by import batch. Never import marketing permission as GRANTED without verifiable proof and owner review.
- Export must be server RBAC protected, tenant and branch scoped, logged, capped or paginated, sanitize spreadsheet formulas, limit PII and avoid permanent public storage.
- Initial read-only customer CSV: max 5000 records for tenant's current branch, UTF-8 BOM. For larger datasets use chunked export / background jobs and expiring private download.
- Financial PDF must use consistent period, timezone, filters and reconciled persisted ledger; no invented demo totals.

## Deployment gates
- Confirm independent production PostgreSQL backup + restore drill and application rollback target.
- Run prisma validate; typecheck; unit + tenant/permission/consent/CSV/XLSX QA; authenticated browser flows.
- Stage schema migration with backward compatibility and no unapproved destructive operations.
- No automatic outbound messaging until explicit provider configuration, templates, opt-in, sending limits and cancellation controls verified.
