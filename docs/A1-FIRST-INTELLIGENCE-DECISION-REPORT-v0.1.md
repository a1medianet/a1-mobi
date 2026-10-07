# A1 Mobi — A1 First Intelligence & Decision Report v0.1

Date: 2026-10-04
Status: Living document
Authority: A1 FIRST Sustainability/Superiority/Innovation Charter v1.2 + A1 Mobi Master Implementation Brief v1.0
Scope: Current market baseline, adopted/rejected/watched capabilities, value map, A1-specific innovation candidates, sources, and decision trace.

## 1. Evidence hierarchy used
1. Real store workflow and owner evidence in the A1 Mobi Master Brief.
2. Official competitor product pages, knowledge bases, release notes, and roadmaps.
3. Reproducible local A1 Mobi tests and live browser/HTTP evidence.
4. Community/review evidence only as supporting signal, not as sole truth.

No global “first/best” claim is made. “Not found” means not found in the current reviewed source set.

## 2. Current market signals — October 2026

### RepairDesk
Official 2026 updates show a fast-moving product with:
- conditional repair intake fields,
- PWA installability and WhatsApp/live chat,
- signatures and partial payments on online invoices,
- redesigned inventory counts and inventory-aging reporting,
- M360 diagnostics + IMEI/blacklist/data-erasure integration,
- multi-store inventory transfers,
- subscriptions/recurring billing,
- recycle-bin restore with audit trail,
- marketing-consent management,
- status-history views and extensive permissions.

A1 implication:
- PARITY: configurable intake, partial/deposit payment, strong permissions, inventory count, mobile/PWA usability.
- SUPERSEDE: repair profitability truth, local dual-currency close, debt/top-up integration, explainable exception detection.
- WATCH: subscriptions, marketing automation, deeper supplier integrations, diagnostics providers.

### Orderry
Official 2026 material emphasizes:
- configurable work orders and estimates,
- mobile work-order creation/editing,
- photos/comments/files from mobile,
- mobile prepayments/payouts,
- mobile stock visibility,
- barcode sales from mobile,
- multi-location operation,
- reporting, employee activity, permissions, and recoverability.

A1 implication:
- PARITY: mobile-friendly repair workflow, photos, payments, stock visibility, activity evidence.
- SUPERSEDE: make counter/POS + repair + debt + cash + top-up one reconciled financial truth for the mobile-shop niche.
- WATCH: richer task/work-schedule and field-service capabilities if store evidence requires them.

### Fixably
Official 2026 documentation/release notes show:
- repair Order as the core operational object,
- IMEI/serial, parts, notes and full timelines,
- location-scoped access,
- multi-step stock transfer with carrier/tracking context,
- large stock imports processed in background with preview,
- saved filtered order lists,
- macros/automation for order/device actions,
- TAT/SLA and QR-assisted inspections.

A1 implication:
- PARITY: device history, location rights, repair timeline, scalable imports, saved operational views.
- SUPERSEDE: A1 should connect operational truth to cash/debt/FX/top-up and explain variance/profit, not only repair workflow.
- WATCH: macro/automation surface and configurable SLA prediction.

### RepairShopr
Official feature documentation shows:
- CRM + tickets + invoices,
- customer web portal with estimate approval,
- digital signatures,
- ticket dashboards,
- serial/warranty tracking,
- PO/parts-order workflow,
- leads/self check-in,
- multi-location controls,
- extensive integrations and reporting.

A1 implication:
- PARITY/LATER: customer trust link/portal, approvals, signatures, self check-in, integrations.
- SUPERSEDE: reduce fragmentation by using one customer-device-sale-repair-debt-payment timeline.
- WATCH: lead capture and marketing only after store-core workflow is stable.

### MobiQore
Current public site positions the product around:
- mobile-shop POS,
- inventory and IMEI tracking,
- instant IMEI verification against theft/fraud data,
- multi-shop readiness,
- team roles,
- automated backups,
- a community lost/stolen-device reporting network,
- low-friction pricing.

A1 implication:
- PARITY: fast mobile-specific POS, serialized inventory, multi-branch readiness, RBAC, backup, IMEI trust.
- SUPERSEDE: provenance/confidence/override evidence for trust checks; Lebanon-first dual currency; repair/debt/top-up/cash close; repair profit truth.
- COMMERCIAL WARNING: low price and low onboarding friction are competitive requirements, not optional polish.

## 3. Adopted capabilities and why

### Foundation / Control
Adopted:
- Tenant/Branch/User/Role/Permission model.
- Server-side RBAC and tenant isolation.
- Hashed opaque sessions and Argon2 passwords.
- Audit evidence for sensitive changes.
- One-time protected provisioning.
- AR/EN and RTL/LTR.
Reason:
Necessary baseline for multi-user shops, later multi-branch operation, least privilege, and evidence-backed corrections.

### Catalog / Devices / Inventory
Adopted:
- product/category/barcode,
- serialized IMEI/serial devices,
- manufacturer → family → model → variant,
- stock locations/movements/counts,
- suppliers/purchases,
- compatibility relation.
Reason:
Mobile shops need serialized truth and parts compatibility, not generic SKU-only stock.

### Sell / POS
Adopted:
- scanner-first flow,
- base/minimum/final price,
- auditable price override,
- partial/mixed-currency payment,
- debt,
- return/exchange tied to original transaction.
Reason:
Counter speed must coexist with leakage control and financial truth.

### Repair
Adopted:
- intake condition/accessories/photos,
- diagnosis/estimate/approval,
- technician/status history,
- parts from stock/dedicated/external source,
- direct cost/labor/service/final price,
- deposit/partial payment/balance,
- warranty/history.
Reason:
Repair is a margin business. Ticket status without cost provenance is insufficient.

### Customer / Debt / Cash / Top-up
Adopted:
- customer-device timeline,
- debt ledger with partial payments,
- daily cash sessions and variance,
- historical USD/LBP exchange-rate snapshots,
- top-up as a service domain with provider settlement rather than fake stock.
Reason:
These are real Lebanese mobile-shop workflows and create differentiation from generic repair/POS tools.

## 4. Rejected / deferred / watched

### Full offline sync — DEFERRED
Why:
Architecture is offline-aware and idempotent now, but full sync adds conflict/reconciliation complexity. Reopen when measured shop connectivity justifies it.

### Payroll/time clock — WATCH
Why:
Competitors provide it, but it is not a primary mobile-shop operational pain in current store evidence. Avoid ERP sprawl.

### Loyalty/gift cards/marketing — WATCH/LATER
Why:
Valuable for retention, but not allowed to delay stock/sale/repair/debt/cash truth.

### Full accounting suite — REJECT AS CORE
Why:
A1 Mobi should integrate with accounting systems rather than become a generic ERP/accounting platform.

### Licensed global IMEI/device sources — GATED
Why:
Commercial/legal/provider evidence is required before dependency. Manual/local trust must continue to work if a provider fails.

### Customer portal/self check-in/appointments — LATER
Why:
Strong competitor evidence for value exists, but first store pilot must prove the operator core. These remain preserved roadmap items.

## 5. Value Contribution Map

| Capability | Primary value | Secondary value |
| --- | --- | --- |
| Fast scan POS | Time compression | Fewer counter errors |
| Price floor + audited override | Margin protection | Accountability |
| IMEI/serial trace | Trust / loss prevention | Warranty history |
| Repair Profit Truth | Margin visibility | Better pricing |
| USD/LBP historical FX | Financial truth | Better reconciliation |
| Debt ledger | Cash collection clarity | Customer history |
| Top-up settlement | Margin truth | Cash accuracy |
| Daily cash close | Control / loss detection | Owner confidence |
| Customer-device timeline | Faster service | Retention |
| RBAC + audit | Security | Multi-branch readiness |
| Device Trust | Fraud/theft risk reduction | Community trust |
| Compatibility graph | Fewer wrong parts | Faster technician work |

## 6. Value expansion opportunities
1. Customer Trust Link: tokenized repair status, approval, payment and warranty.
2. Assisted Close: explain likely causes of cash/stock mismatch from the day’s events.
3. Exception Radar: rank unusual discounts, adjustments, debt, returns, cash variance and overrides.
4. Background import with preview/reject rows for large inventories.
5. Saved role-specific work queues: “waiting parts”, “ready”, “high-risk”, “my repairs”.
6. Supplier adapters for price/availability only through provider-neutral interfaces.
7. PWA/desktop offline-safe capture with idempotent replay where field evidence proves need.
8. Optional subscriptions/device-care plans only after core pilot metrics are stable.

## 7. Original A1 innovation candidates
These were not found as equivalent combined capabilities in the current reviewed source set; they are hypotheses, not “world-first” claims.

### A. Operational Truth Replay
Reconstruct a selected day as an explainable event chain:
stock-in → sale → payment → debt collection → repair → part use → top-up settlement → cash close.
Hypothesis:
A manager can identify the cause of a mismatch faster than by checking separate reports.
Value:
Recovery + control + auditability.

### B. Repair Profit Truth + Warranty Risk
Per repair, show:
part source/cost + labor/direct cost + service revenue + payments + warranty exposure + realized margin.
Hypothesis:
Owners change pricing/parts decisions when profit is visible before and after warranty outcomes.
Value:
Margin protection.

### C. Trust Gate with Provenance
Before buying/selling/repairing a serialized device:
IMEI validity + internal history + incident reports + external provider result when available + source/time/confidence + human override reason.
Hypothesis:
A provenance-aware decision is more useful and defensible than a binary “clean/blocked” result.
Value:
Fraud/theft risk reduction + evidence.

### D. Compatibility Confidence Graph
Compatibility relation carries source, confidence and field outcome. Successful/failed part use updates evidence.
Hypothesis:
The store’s own repair history compounds into a compatibility advantage.
Value:
Fewer wrong-part jobs + reusable knowledge.

### E. Dual-Currency Truth Engine
Every transaction retains the applied FX snapshot and cash denomination trail across sale, debt, repair and top-up.
Hypothesis:
A single historical truth layer materially reduces Lebanese daily-close disputes and reporting ambiguity.
Value:
Localization + reconciliation.

### F. Exception-to-Skill Loop
Repeated exceptions that are successfully resolved become reusable policies/checklists/automation rules.
Hypothesis:
The product improves operationally from failures instead of accumulating one-off patches.
Value:
Compound advantage + lower support burden.

## 8. Decision ledger — current strategic decisions
- A1 Mobi remains specialized for mobile retail/repair; do not expand into generic ERP.
- Real store evidence outranks generic MVP theory.
- Global competitor capability is baseline evidence, not an instruction to clone.
- Mobile/repair-specific financial truth is a primary differentiator.
- Dependencies such as IMEI data providers must remain replaceable.
- Full offline sync is evidence-gated.
- Operator core and reconciliation outrank marketing/loyalty for Pilot 0.1.
- No Stage/Release receives A1 First PASS without current market review, value rationale and live evidence.

## 9. Sources & references
Accessed/re-verified 2026-10-04 unless noted.

1. RepairDesk — Features
   https://www.repairdesk.co/features/
2. RepairDesk — Product Updates (2026)
   https://feedback.repairdesk.co/updates
3. RepairDesk — July 2026 Product Updates
   https://feedback.repairdesk.co/updates/july-2026-product-updates
4. RepairDesk — POS feature
   https://www.repairdesk.co/features/point-of-sale-software/
5. RepairDesk — Self Check-In
   https://www.repairdesk.co/features/self-check-in/
6. Orderry — Features
   https://orderry.com/features/
7. Orderry — Mobile App Features
   https://help.orderry.com/en/articles/9130458-features-of-the-orderry-mobile-app
8. Orderry — Work Orders general information
   https://help.orderry.com/en/articles/9133862-work-orders-general-information
9. Orderry — Sales and Services in Work Orders App
   https://help.orderry.com/en/articles/9232217-sales-and-services-in-the-orderry-work-orders-app-my-company-section-in-the-main-menu
10. Fixably — What are Orders?
    https://kb.fixably.com/en_US/order-management/what-are-orders
11. Fixably — V26.28 Release Notes
    https://kb.fixably.com/en_US/2026-releases/v2628-release-notes
12. Fixably — Order Lists User Guide
    https://kb.fixably.com/en_US/order-lists-user-guide
13. Fixably — Macros
    https://kb.fixably.com/en_US/automations/what-can-macros-do
14. RepairShopr — Features
    https://www.repairshopr.com/features
15. MobiQore — Business Engine
    https://mobiqore.com/

## 10. Continuous watch
The A1 First watch must keep monitoring:
- competitor releases and roadmaps,
- diagnostics/IMEI providers,
- mobile repair supplier integrations,
- PWA/offline and scanning patterns,
- repair automation and AI,
- privacy/consent/regulatory changes,
- pricing and packaging,
- community complaints/pain signals.

Only findings that change a decision, reduce risk, create value, or reopen a WATCH item should interrupt active implementation.

## 11. Failure-derived reusable A1 guardrails

### Delegation Ceiling Guard
Origin:
Independent adversarial review of Foundation Control found two related privilege-escalation paths:
a role administrator could first attempt to mint a role above its own authority, and could also
assign an already-existing higher-privilege non-system role to another user.

Decision:
- Role creation/update cannot grant permissions the actor does not hold.
- Role assignment checks the selected role's live permission grants, not only role identity.
- System-role assignment requires explicit foundation.manage authority.
- Both create-user and update-user assignment paths have regression coverage.

Value:
Prevents indirect privilege amplification while keeping delegation useful for store managers.

Cross-project reuse:
Promote this pattern into the A1 security baseline for every product with delegated RBAC:
"an actor cannot delegate more authority than the actor is authorized to delegate." Exceptions
must be explicit top-level authorities, audited, and tested.

Evidence:
- Claude read-only review blocker and post-fix re-review.
- tests/foundation-control-db.test.ts targeted regressions.
- Full Foundation Control gate evidence in docs/gates/FOUNDATION-CONTROL-GATE-20261003.md.

## 12. Layered Authentication Abuse Budget — 2026-10-04

Origin:
Foundation security review after the persisted login/session gate.

Problem:
A per-account limiter alone does not bound credential spraying across many accounts or broad abuse against one tenant. Blindly trusting forwarded IP headers would create a spoofable security boundary before deployment topology is fixed.

Decision:
- Keep account budget: 5 / 15 min.
- Add tenant-wide budget: 120 / 15 min.
- Add application-wide budget: 5000 / 15 min.
- Store only hashed budget keys.
- Purge counters older than 7 days.
- Do not trust client IP/forwarded headers until a trusted edge contract exists.

Classification:
SUPERSEDE for the current Foundation baseline; trusted edge/device reputation remains WATCH.

Value:
- Better brute-force and credential-spraying containment.
- Survives process restarts and concurrent requests.
- Prevents unbounded counter-table growth.
- Avoids a false security dependency on spoofable network metadata.

Evidence:
- tests/auth-abuse-db.test.ts
- tests/auth-lifecycle-db.test.ts
- Full suite 75/75 PASS, 32/32 files.
- TypeScript PASS.
- ESLint changed-files PASS.
- Production build PASS.
- docs/gates/FOUNDATION-ABUSE-CONTROLS-GATE-20261004.md

Cross-project reuse:
Promote layered durable auth budgets + explicit retention + trusted-edge boundary as an A1 security pattern for products with password authentication.


## 13. Restore-Proven Operations Baseline — 2026-10-04

Origin:
Foundation gap review under A1 First.

Decision:
A backup is not considered a resilience feature until restoration is exercised and verified. A1 Mobi now has a repeatable local backup/restore smoke that restores into an isolated temporary PostgreSQL database and compares schema-table and completed-migration evidence before cleanup.

Value:
- Converts “we have a backup” into recoverability evidence.
- Reduces false confidence.
- Makes disaster-recovery checks repeatable.
- Reusable across A1 PostgreSQL products.

Additional hardening:
- Structured logs redact secret-bearing keys.
- Baseline browser/security headers are enabled.
- GitHub CI is defined for migrations + validation + lint + TypeScript + tests + build.
- Direct package versions are pinned to prevent unnoticed drift.

Known risk:
Production npm audit still reports 3 HIGH findings in Prisma tooling through deepmerge-ts (GHSA-ggr8-5vv4-36mx). No forced downgrade or blind override was accepted without compatibility evidence.

Classification:
PARITY for CI/health/logging; SUPERSEDE for restore-as-proof; REJECT_WITH_REASON for unsafe dependency forcing.
