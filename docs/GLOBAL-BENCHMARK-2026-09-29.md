# A1 Mobi — global product benchmark (2026-09-29)

Official product sources: [Square Retail](https://squareup.com/us/en/retail/capabilities), [Shopify POS](https://www.shopify.com/pos/retail-pos), [RepairDesk](https://www.repairdesk.co/features/). This is a feature benchmark, not a claim that A1 Mobi currently matches them.

| Product | Useful pattern | A1 Mobi implementation priority |
|---|---|---|
| Square Retail | Inventory across locations, purchase orders, customer directory, retail reporting | Connect existing inventory, purchasing, cash, and customer domain services to authenticated screens. |
| Shopify POS | One view of sales, inventory, and customers across channels | Make web and eventual desktop share authenticated tenant/branch data and sync policy. |
| RepairDesk | Repair tickets integrated with POS, parts, and customer history | Surface intake, diagnosis, approvals, parts, payment, and delivery as one tracked flow. |

## A1 Mobi distinction

- Keep the Master Brief's local store workflows, mixed USD/LBP, debt, top-up, repair, cash close, and IMEI trust guard intact.
- Before every physical-device service, require a real permissioned network trust check and audit event. A checksum is only input validation, never a CLEAR result.
- Expose only working capabilities as actions; label sample data and visual previews honestly.
- Keep the card-based visual hierarchy, responsive layouts, readable Arabic/English, and restrained interaction motion. Tenant branding changes colors and identity without changing workflow semantics.

## Current gap and next gate

Backend domain tests pass on PostgreSQL. UI screens beyond POS and IMEI preview are navigation shells; POS and IMEI preview are not transaction-capable. Next implementation priority is authenticated tenant/branch session, then source-backed inventory and trust screens, then connected POS/repair workflows. Stage 9 physical scanner, thermal receipt, and signed store-day evidence remain required.
