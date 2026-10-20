# A1 Mobi — Marketing navigation, RTL and readability checkpoint

**Date:** 2026-10-20 | **Machine:** Thaghr only | **Scope:** A, signup, pricing, Arabic/English + mobile.

## Owner visual review addressed

- The official A1 Mobi wordmark is physically **left-aligned on all pages** in both Arabic and English.
- Arabic primary navigation flows right-to-left in actual geometric order; English primary navigation flows left-to-right. The links no longer share a forced LTR direction.
- Language switching appears on the **far-right edge of the desktop header**, alongside sign-in and getting started, not between the main navigation labels.
- Language switching **keeps the visitor on their current route** (home, pricing or signup), in either direction.
- Product menus and calls to action use consistent geometry between the homepage, pricing and registration, with the same max-width.
- Narrow screens use an accessible expandable menu instead of squeezing desktop links or hiding all entry points.
- Product sections share a 1340px maximum content width and more balanced spacing, correcting previously broad upper and narrow lower sections.
- Six feature cards now use larger body text (14px desktop), larger titles, and more comfortable height. The four benefit cards, proof strip and onboarding steps also have more readable text.
- Signup hero and registration form have improved proportions and padding; signup benefits describe merchant work instead of internal technical abbreviations. The pricing explanation likewise uses customer-facing language.
- English hero and repair-section text alignment are explicitly LTR, independent of the RTL Arabic version.

## Evidence from live browser in local UAT

**PASS — 12/12 visual routes** on isolated Thaghr browser (6 desktop + 6 phone):

- Arabic desktop: homepage, pricing, signup.
- English desktop: homepage, pricing, signup.
- Arabic 390px phone: homepage, pricing, signup.
- English 390px phone: homepage, pricing, signup.

Browser assertions validate: true visual right-to-left navigation order, fixed left logo when changing languages, far-right language control, matching language switch route, readable font sizes, balanced content widths, no horizontal overflow, and expandable mobile menu. Desktop logo X=43px; language switch X=1313px at 1440px; lower section width 1340px; feature-card descriptive text 14px.

**Source evidence:** `marketing-rtl-readability-result.json` and screenshots in the same folder.

## Approval and release state

- Developer run verified the routes and image snapshots locally. Owner visual approval is **pending**.
- The owner should compare `marketing-ar-home-desktop.png`, `marketing-en-home-desktop.png`, `marketing-ar-signup-desktop.png`, `marketing-ar-pricing-desktop.png` and phone images.
- **No production deployment, no customer public link, no PR merge.**
- This closes the specific nav/readability review, **not** the complete A/B/C retail pilot or production security gate.

## Signup review follow-up (2026-10-20)

- Changed the illustrative store-name placeholder to `A1 Mobi` in both languages and the suggested store identifier to `a1-mobi`.
- Registration stage eyebrow labels are now Arabic on Arabic pages and English on English pages, rather than showing the English `ORGANIZATION` marker on the Arabic form.
- Reduced the oversized signup headline and kept form text legible.
- Re-ran the marketing browser review across **6 desktop and 6 phone cases: PASS**; desktop/mobile signup screenshots were refreshed.
- Final account creation is not claimed; the owner is about to test the four-step signup together and confirm before any final submission.

## Final brand alignment review — 2026-10-20

Owner screenshot highlighted an inconsistent **physical logo position**: header left but footer right on Arabic marketing pages. This is now corrected in the shared product-site shell, rather than per-page workarounds. Header and footer wordmarks both stay physically left in **Arabic and English**. Footer links independently respect the locale (RTL Arabic, LTR English). The phone layout retains the brand on the left at narrow widths.

**Verified by actual browser coordinates on Thaghr:** 6 desktop + 6 mobile pages (home, pricing, signup; Arabic and English). The test asserts footer logo X close to the header logo X, footer text direction, no horizontal scrolling, and bilingual navigation consistency. Result: **12/12 PASS** with screenshots `marketing-ar-footer-desktop.png`, `marketing-en-footer-desktop.png`, `marketing-ar-footer-mobile.png` and `marketing-en-footer-mobile.png`; machine-readable result `marketing-rtl-readability-result.json`.

No deployment or PR merge; this is a pilot preview visual checkpoint pending owner's confirmation.
