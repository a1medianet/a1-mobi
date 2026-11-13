# A1 Mobi — Lost & Found as a separate window, external network later
Date: 2026-11-13
Environment: mobi.a1medianet.com, Hostinger Business Plan. Do not deploy to A1Cloud VPS.

## Current decision / approved scope
- "المفقودات والبلاغات" is its own A1 Mobi route `/{locale}/lost-found`, separate from `/{locale}/device-trust` (IMEI format checking).
- Navigation AR: المفقودات والبلاغات / EN: Lost & found.
- Staff with scoped permissions can lookup an IMEI in their branch's serialized inventory, customer-device links (only with customer read privilege), and internal incident reports.
- A report requires a registered branch customer, an evidence reference and staff authorization. It is saved **EVIDENCE_PENDING / STORE_ONLY**, never published to a public theft registry and never represented as independently confirmed.
- Incidents can be closed with an audit trail. Owner identity, phone and evidence are not released to an anonymous public lookup.
- No automatic registry/blacklist provider integration. Presence or absence of a report is not proof of ownership, theft, safety or device eligibility.
- Prevent cross-tenant exposure. Link customer and IMEI at branch scope wherever a relationship exists.

## Future independent product — out of scope for the current phase
Build a separate consent-based device-incident service with multi-organization subscribers, policy-based evidence verification, appeals, false-report corrections, limited sharing, case-status history, jurisdictional privacy compliance, and an auditable scoped API. Integrate A1 Mobi as a tenant client through an authenticated connector with minimal, non-identifying results; do not share names, contacts or full IMEI publicly.
Future integration contract: `POST /api/v1/incident-check` with hashed device identity and caller authorization, result `not_checked|no_verified_match|verified_report|unavailable`, not an absolute "clean" or "stolen" judgement. Network endpoints and API credentials are **NOT** configured today.

## Gate to close current window
- AR/EN UI route, sidebar, no duplicate report panel on IMEI page, responsive/RTL visual check.
- Auth/RBAC tests for lookup, reports and closure; invalid IMEI, missing customer, duplicate active reports, cross-tenant denial.
- Database schema/migrations and backup readiness on Business Plan.
- A real authorized end-to-end record with explicit consent, audit, closure and read-back; no fabricated test data on live client tenant.
- External registry status clearly "not connected", no public data exposure.

Status at authoring: route and permission-scoped API implementation underway; automated tests are required before production release. Do not claim a complete independent external service.
