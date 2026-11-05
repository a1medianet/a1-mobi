# A1 Mobi — Visual Media Roles, ABC

Date: 2026-10-20. Review machine: Thaghr. Customer pilot visuals only; no public publish or PR merge.

## Assigned by customer intent

- **A: Present the product** — the existing retail-service counter photograph remains with the genuine app preview as the marketing opening. The **repair story** now uses a locally hosted image of smartphone repair tools, not an unrelated retail device.
- **B: Choose actual displayed products** — the old, unrelated single-phone hero was replaced with a responsive presentation of **iPhone 16 Pro, Samsung Galaxy S25 Ultra and Galaxy A56** using the same product-specific pictures shown in the TechZone demo catalog. Selecting a phone takes visitors to the matching filtered product. No new product claims or pricing.
- **B: Explain repair** — a separate, clearly labeled smartphone repair illustration is in the service section.
- **B: Explain the physical store** — a retail customer-service picture appears in the about/store story, in place of a mock phone graphic.
- **C: Run the business** — no decorative marketing images were added to the administration screens; the inventory product photos remain tied to their actual items.

## Checks performed

- **B browser walkthrough PASS, 11 scenarios** including image loading with verified product-specific alt text, click to filter, section photo placement, mobile width (375px content within 390px viewport), product inquiry, basket and language switching.
- A repair image placement asserted from the browser. All screenshot files and machine-readable result saved in this directory.
- Code ESLint and TypeScript checks are separate gates and must be explicitly PASS before sign-off.

## Image sources and limitations

- `repair-service.webp` is a local, optimized copy of an Unsplash photograph from `https://images.unsplash.com/photo-1699550403361-27dee0f2a415`; use is subject to Unsplash License and rights of people/brands depicted.
- The A hero and B story use the **existing stock retail photo**. The AI-generated studio photographs selected in the conversation **have not yet been copied into the Thaghr repository**. Do not claim they appear in the live app. A photo match against the user-approved reference remains a separate visual approval gate.
- The TechZone catalog remains demonstrative and should not imply actual stock or orders; real merchant product media must match the sold SKU and be provided by that merchant.
- No customer production access, external staging link, PR merge, or deployment is authorized.

## Review

- B desktop: `b-showcase-desktop.png`
- B mobile: `b-showcase-mobile.png`
- A desktop: `a-retail-and-repair-desktop.png`
- B interaction: `b-inquiry-desktop.png` and `b-inquiry-mobile.png`

Owner approval is pending.
