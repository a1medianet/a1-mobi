# A1 Mobi — A Reference-Match Visual Checkpoint

**Owner visual reference:** screenshot A(1).jpeg supplied October 19, 2026. **Device:** Thaghr. **Branch:** `feat/mobi-abc-continue-20261013`. **PR #12 remains Draft.**

## Implementation (A only)

- Reconstructed A landing hero with logo on the left, broad bilingual navigation and right-side sign-in/trial action as in owner reference.
- Reordered the desktop marketing hero: Arabic copy on the left; retail scene with software laptop and mobile preview on the right. The existing approved logo and blue/orange visual tokens stay canonical.
- Tightened headline to two lines at 1440px; desktop hero height target 435px; feature cards appear immediately below the hero.
- Replaced decorative placeholder feature glyphs with six outlined SVG icons. Retained all six feature destinations and product tour/trial links.
- Matched compact cards, white/blue/orange palette, repair panel, evidence-based product capability strip and blue final CTA; responsive mobile layout remains naturally scrollable.
- Replaced customer-stories navigation label with **Why A1 Mobi?** and links to the existing capability explanation.

## Verified on Thaghr

- Targeted ESLint: PASS.
- TypeScript noEmit: PASS.
- Chrome A desktop Arabic and English plus mobile Arabic capture: **A_REFERENCE_BROWSER_PASS**. Measured desktop hero 435px and feature cards at 499px from top in 1440x900; six real SVG icons; A→B route and two CTAs exist; no horizontal overflow at desktop or 390px mobile.
- Screenshot images: `a-reference-ar-desktop.png`, `a-reference-ar-mobile.png`, `a-reference-en-desktop.png`. JSON: `a-reference-result.json`.
- The browser screenshots run in local development mode on Thaghr at 127.0.0.1:3223; **not a production build verification nor a public URL**.

## Visual differences still open

- The owner's screenshot contains a distinctive photographed phone-store scene (seller + customer + physical phone displays) as the hero background, and a more photo-realistic operating system overlay. This implementation currently uses the existing retail photograph and coded illustrative laptop/phone UI. A separate high-resolution background asset or authorized replacement is needed for exact image matching. Do not use the entire screenshot as a static page.
- The reference includes a named customer testimonial, customer rating and large adoption/transaction statistics. No evidence was supplied for these; intentionally not copied into the live marketing page. Current site uses clearly marked illustrative scenarios and product capability facts.
- Final exact-match approval requires owner visual review on desktop/mobile, and a production-mode build after merge gate approval.

## Release controls

No production deploy, no PR merge, no credentials changed. Do not confuse A visual QA with B/C functionality or full A/B/C customer pilot certification.
