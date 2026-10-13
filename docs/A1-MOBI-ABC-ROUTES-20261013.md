# A1 Mobi — A / B / C Visual Routes

Date: 2026-10-13
Branch: feat/mobi-abc-continue-20261013
Authority: approved A/B/C visual direction for A1 Mobi.

## A — Product Landing
Route: /product/ar and /product/en

Purpose:
- Public A1 Mobi product landing.
- Scrollable marketing/product page.
- Realistic mobile retail / repair imagery.
- Clear coverage of POS, repair, inventory, customers, purchasing and reports.
- Product CTA, guided demo, pricing, help/security/privacy/status surfaces.

Current rule:
- Keep the live approved A route stable while B/C continue in a review branch.

## B — TechZone Customer Store Preview
Route: /store-preview

Purpose:
- Customer-facing one-page store example powered by A1 Mobi.
- Desktop target: one screen without vertical scrolling at standard desktop heights.
- Realistic hero, priced sample products, repair services, visit/store information and contact state.
- Demo truth remains explicit: TechZone is illustrative; images/prices are not a real store offer.

2026-10-13 continuation:
- Desktop composition constrained to 100dvh for >=1000px width and >=740px height.
- Small/mobile screens remain naturally scrollable.
- Search and product cards stay interactive.

## C — Internal Admin / Operations Dashboard
Primary route: /ar and /en
Admin detail route: /ar/admin and /en/admin

Purpose:
- Full operational dashboard after sign-in.
- Sidebar navigation for POS, repair, inventory, customers/debt, cash, top-up, IMEI, reports, admin, team/access and account.
- Quick actions, metrics, chart/activity table and operational summaries.
- Sidebar must be explicitly collapsible on desktop.

2026-10-13 continuation:
- Added a desktop sidebar collapse/expand control.
- Existing responsive compact/mobile navigation remains unchanged.

## Visual Evidence Gate

The visual evidence workflow captures:
- A product landing desktop/mobile
- B TechZone store preview desktop
- C dashboard/admin/products/POS desktop + mobile

No A/B/C visual PASS authorizes Production/Public Release by itself. A1-STD-APPLICATION-FOUNDATION@1.0.0 and the project release gates remain mandatory.
