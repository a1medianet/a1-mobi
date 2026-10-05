# A1 Mobi — Pilot Demo Experience

Date: 2026-10-05
Branch: feat/pilot-demo-experience-20261005
Purpose: visual and interaction testing only. This branch does not authorize Production/Public Release.

## Included pilot surfaces

- /ar and /en — realistic store dashboard.
- /ar/products and /en/products — searchable/filterable product catalog.
- /ar/admin and /en/admin — owner/admin pilot view.
- /ar/pos and /en/pos — interactive local demo sale flow.
- Existing IMEI, repair, inventory, customer/debt, cash, top-up, reports, team/access, login and account-security surfaces remain reachable according to their current implementation state.

## Demo data rules

- Product names are real-world product names.
- Prices, stock quantities, sales, customers, staff identities, and transaction references are synthetic demo values.
- No demo value is a live market quote or production accounting record.
- The general catalog intentionally does not expose purchase cost or margin.
- POS completion persists only demo receipt/stock state in browser localStorage.
- Demo checkout does not create production Sale, Payment, Invoice, Cash, or StockMovement records.

## Pilot catalog

The catalog is centralized in src/demo/data.ts so dashboard, products, admin, and POS use one source of demo truth.

The current set includes representative devices, accessories, and repair parts from Apple, Samsung, Xiaomi, Anker, Baseus, A1 Select, and service stock.

## Safety / release boundary

This pilot branch is intentionally separate from the open Foundation Account Security work.

It must not be merged or deployed as Production/Public Release until:
1. Foundation Account Security gate passes.
2. Full Stage 1 Foundation consolidation passes.
3. A1-STD-APPLICATION-FOUNDATION@1.0.0 Pre-Launch Gate passes with evidence.
4. Operational modules are wired to authenticated, tenant/branch-scoped persistence.
5. Real store UAT reconciles stock, sales, repairs, debt, cash, top-up, reports, and daily close.

## Visual acceptance target

The owner should be able to open the application and immediately understand:
- what the store is doing today,
- what needs attention,
- how to start a sale,
- where products live,
- where admin/team/security controls live,
- which parts are still pilot/demo rather than production truth.

## Test evidence

tests/demo-experience.test.ts verifies:
- unique demo SKU and barcode identifiers,
- non-negative stock and positive prices,
- serialized products remain device products,
- dashboard/catalog counts derive from the same source,
- general demo catalog does not expose cost/margin/minimum-price fields.
