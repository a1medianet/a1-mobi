# A1 Mobi — B Customer Journey Review

**2026-10-20 | Thaghr | Customer-facing review checkpoint.**

## What the customer can do now

- Browse TechZone preview products, search the catalog and review illustrated prices.
- Add items to a sample basket, change quantities and see the illustrative total.
- Prepare an itemized sample inquiry summary and copy it, with a clear confirmation.
- Clear and close the basket without leaving an obsolete inquiry on screen.
- Access the existing store contact information and repair service explanation instead of encountering dead call-to-action controls.
- Switch Arabic/English and use the site on desktop or a 390px phone without horizontal overflow.

## Verified

- Chrome end-to-end customer scenarios: **7/7 PASS**, repeated after the final legibility correction.
- Desktop and mobile screenshots: `b-inquiry-desktop.png` and `b-inquiry-mobile.png`.
- The shop-owner UAT verification passed **8 checks** across inventory/sales, two-device invoice, independent cash approval, customer branch isolation, and a representative intake→sale→repair journey (after restoring the **test-only** data service).
- A source-content Arabic visual check also passed.

## Release limitations: do not hide these from the customer

- TechZone is an **illustrative preview** and not a configured real merchant. Preparing/copying an inquiry is not a submitted customer order.
- Live customer order submission, WhatsApp with the actual merchant, repair appointment booking and online payment are **not yet active**. The demo says so explicitly.
- Customer pilot acceptance still requires real merchant configuration, order lifecycle end-to-end, receipt/delivery confirmations and authenticated owner review from an accessible secure preview link.
- The public domain is not verified accessible for the latest changes, and there has been **no production publish or branch merge**.

## Review links

- This test build on Thaghr only: http://127.0.0.1:3224/store-preview
- Screenshots and this report are versioned under `docs/reviews/2026-10-20/b-customer/`.

## Owner sign-off

Pending. No marketing-ready or production-ready declaration until the user accepts the actual A/B/C experiences and the real-order journey is complete.
