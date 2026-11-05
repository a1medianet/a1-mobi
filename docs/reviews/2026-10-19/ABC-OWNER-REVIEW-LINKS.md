# A1 Mobi — ABC Owner Review & Routes

**Date:** 2026-10-19 | **Device:** Thaghr only | **Branch:** `feat/mobi-abc-continue-20261013` | **PR:** #12 Draft.

This review is for an **isolated UAT build**, not a public production deployment. The browser links below work **only in the browser on Thaghr** while the local test server at 127.0.0.1:3221 is running. A1 Port provides conversation control, not network forwarding. For remote viewing from a different computer, use the GitHub screenshots or request an explicitly approved secured staging deployment.

## A — Product / Public Presentation

- AR: http://127.0.0.1:3221/product/ar
- EN: http://127.0.0.1:3221/product/en
- Tour: http://127.0.0.1:3221/product/ar/demo
- Signup: http://127.0.0.1:3221/product/ar/signup
- Pricing: http://127.0.0.1:3221/product/ar/pricing
- Help / security / privacy / terms / status: add `/help`, `/security`, `/privacy`, `/terms`, `/status` after `/product/ar`.

**Review together:** hero/official logo (blue/orange), Arabic and English, screen width, marketing copy with no internal tech, pricing truth, trial/sign-in, link to store B. **Do not sign off** until user approves exact visuals and CTA flow. Screenshot reference: `c15-abc/a-product-ar-desktop.png`, `a-product-ar-mobile.png`.

## B — Merchant Customer Store (TechZone illustrative preview)

- Store B: http://127.0.0.1:3221/store-preview
- Inspect search, product display/prices, basket quantities/total, responsive menus, AR/EN, services and contact.
- This is **illustrative only**. No real orders, customer payment, merchant WhatsApp or repair booking is established by this demo; a disabled action must not appear to be a working order.
- **Visual blocker:** current expanded B page is 5014px long at 1440×900; the Oct 13 approved route specification calls for a one-screen desktop composition. This is an explicit design decision required before exact-match sign-off.
- Screenshots: `c15-abc/b-techzone-desktop.png`, `b-techzone-mobile.png`.

## C — Protected Owner / Admin and Operations

- Login: http://127.0.0.1:3221/ar/login
- Dashboard (requires test account): http://127.0.0.1:3221/ar
- POS: http://127.0.0.1:3221/ar/pos
- Products: http://127.0.0.1:3221/ar/products
- Inventory: http://127.0.0.1:3221/ar/inventory
- Repairs: http://127.0.0.1:3221/ar/repairs
- Customers: http://127.0.0.1:3221/ar/customers
- Cash: http://127.0.0.1:3221/ar/cash
- Reports: http://127.0.0.1:3221/ar/reports
- Admin: http://127.0.0.1:3221/ar/admin
- Device trust: http://127.0.0.1:3221/ar/device-trust
- Team access: http://127.0.0.1:3221/ar/settings/team
- Security: http://127.0.0.1:3221/ar/settings/security

**Review together:** desktop single-screen goal, sidebar collapse, consistent typography and cards, no customer-facing engineering notes, login/logout, IMEI intake, multi-item POS, invoice/receipt, warranty/repair, debt/returns, cash close, reporting, permissions. C dashboard still contains explicit *illustrative demo metrics* rather than verified live aggregate KPIs in the tested pilot state. C15 multi-device sale and C14 cash close were proved separately on UAT DB, not as a full signed store-day pilot. Screenshots: `c15-abc/c-dashboard-authenticated-desktop.png`, `c-pos-cart-desktop.png`, `c-pos-cart-mobile.png`.

## Verified route audit (not visual sign-off)

- **A:** 11/11 HTTP 200; **B:** 1/1 HTTP 200; **C:** 15/15 HTTP 200 with authenticated test owner; guest users of C correctly redirected to login.
- Evidence: `abc-audit/route-audit.json` and `c15-abc/qa-result.json`. Previous ABC browser walkthrough PASS and screenshot evidence.
- The public URL `https://mobi.a1medianet.com/` returned HTTP 403 when checked from Thaghr on Oct 19, including subroutes; this may depend on public access controls. **Do not use it as a verified working reviewer link; do not publish or change access without approval.**

## Sign-off rule

Keep three independent approvals: **A visual**, **B customer journey + visual**, and **C operations + visual**. Only after these, execute global release security and true pilot day gates. No PR merge and no public deployment without explicit owner approval.
