# A1 Mobi — Competitive Intelligence & North Star — 2026-10-20

**Authority:** A1 First / NAWA Way / One-Click Stage Gate / Evidence First.
**Scope:** product decisions for a phone shop, not permission to enlarge or delay Pilot v1.0. Deployment/PR merge require the owner's approval.

## Primary verified competitor patterns (official sources)

| Competitor | Observed operating strength | A1 Mobi approach |
|---|---|---|
| RepairDesk | Repair tickets, intake, POS, parts/inventory, customer updates, appointment booking, customer-facing acknowledgements. | Integrate existing repairs with customer-facing status and a simple bilingual 3-step customer timeline, not an additional repair subsystem. |
| RepairShopr | Customer web portal for tracking tickets and approving/declining estimates; technician status progress, templated notifications, photo attachments. | One reference-number-based status experience for order and repair, privacy-preserving; consent before messages. |
| iQmetrix / iQ Storefront | One view for online and store pickup orders, cross-channel inventory, mobile checkout with fewer steps, staff permissions. | Owner inbox -> one-click transfer of confirmed request into existing POS, choose actual IMEI, then explicit payment and invoice. Avoid premature stock reservation. |
| Lightspeed Retail | Purchase orders, automatic stock receipts, low-stock triggers, restocking and supplier tracking. | Owner's morning triage shows low/zero stock, in-transit orders, critical items; one action to start a purchase. |
| Mobiqore | Phone-retail-specific UI emphasising IMEI, fast POS, inventory, billing. | Make IMEI an end-to-end trust/custody property, clear unit stock, and bilingual owner/customer flows. |

Official reference links:
- https://www.repairdesk.co/Features/
- https://help.repairdesk.co/portal/en/kb/articles/how-does-the-pos-section-work
- https://feedback.repairdesk.co/updates/july-2026-product-updates
- https://www.repairshopr.com/features
- https://www.iqmetrix.com/intelligent-commerce/pos
- https://www.iqmetrix.com/intelligent-commerce/omnichannel
- https://www.lightspeedhq.com/pos/retail/purchase-orders/
- https://retail-support.lightspeedhq.com/hc/en-us/articles/115000271633-Setting-reorder-points-and-desired-inventory-levels
- https://mobiqore.com/

These are verified feature descriptions from competitors, **not independent proof** of product superiority, adoption, performance, or actual customers.

## Prioritised decisions

| Stage | Decision | User benefit | Gate |
|---|---|---|---|
| **P0 Pilot** | Public customer request -> tenant/branch owner inbox -> explicit confirmation, with actual stock and tenant scoping. | The customer and owner can complete a request without lost messages. | C16 browser real HTTP journey + UAT, PASS. |
| **P0 Pilot** | Owner confirmation -> existing POS with suggested physical IMEI units; require human-selected checkout and receipt. | Faster next action, no second product search or dangerous automatic sale. | Separate acceptance gate, NOT INCLUDED in C16. |
| **P0 Pilot** | Visual A/B/C match, operational full-day tests, safe public trial URL. | Demo can be judged by a real phone-shop owner. | Owner review pending, production disabled. |
| **P1** | Customer self-service order/repair status tracking using reference and proof of phone ownership. | Reduces status calls; increases trust. | Authorization/privacy threat model; no PII exposure via reference alone. |
| **P1** | Permissioned customer consent + templated bilingual SMS/WhatsApp event updates. | More informed customers with fewer manual calls. | Explicit opt-in, licensed provider, anti-spam. |
| **P2** | Shortage detection and supplier purchase shortcuts. | Fewer out-of-stock surprises. | Validate stock and supplier data. |
| **P2** | Analytics: most requested/sold/returned models, pending repairs, aging inventory. | Better purchasing decisions. | Reliable data before graphs. |

## Active product differentiation

**Three connected experiences without a cluttered all-in-one screen:**
A — product discovery and merchant signup;
B — actual merchant product catalog and transparent customer request;
C — clear daily action inbox, real device/IMEI movement, repair, invoice, cash.

**Guardrails:** No false orders/payments, no unsupported customer testimonials or statistics, no commercial quantities based on demo data, no public product images that misrepresent actual SKUs, no copying competitor UI verbatim, no expanding the critical path with AI features.

## Current work and acceptance

- **C16 customer request -> branch inbox -> owner confirms:** production compile PASS, TypeScript PASS; UAT 9/9 targeted regressions PASS; actual Chrome 9-step journey PASS on desktop/mobile.
- Synthetic fixture only. Phone-specific storefront is gated by environment and explicitly enabled per branch. Not enabled for any real merchant.
- **Known remaining:** C16 owner-to-POS prefill, merchant product image mapping, offline resilience, notifications, complete C operational walkthrough, deployment verification and owner visual sign-off.
- Never send the prototype link `127.0.0.1` to outside customers as a public trial.
