# A1 Mobi — A Customer-Facing Copy & Layout Simplification

Date: 2026-10-20 | Thaghr UAT preview, not Production | Source: `a1medianet/a1-mobi`

## Changes made following annotated owner screenshots

- **Hero:** reduced to one heading, one short product explanation, and two actions. Removed English descriptive subline, verbose multi-module inventory list, mini trust badges and an intrusive technical B-interface reference. The storefront sample remains accessible below the features as a plain link.
- **Features:** kept all six essential categories and action links. Arabic cards have Arabic-only text; removed repeated English subtitles, numbered decorations and long feature descriptions.
- **Repair:** retained matching photo and journey action, but shortened the title and explanation.
- **Why A1 Mobi:** tightened the benefit descriptions, and used plain Arabic rather than unexplained device-tracking acronyms.
- **Removed redundant display-only sections:** pseudo-testimonial with sample counts, second duplicated capability strip, and multi-branch sales band repeating the final CTA. Does not remove any actual customer feature or signup flow.
- **Onboarding:** now reflects the real signup steps, organization -> branch -> owner -> review; no English ONBOARDING label appears on the Arabic page.
- **Final CTA:** a short trial message and two buttons; header and footer wordmark alignment and previous RTL/LTR fixes preserved.
- Brand names such as **A1 Mobi** and device brands in the *illustrative mockup* are retained. No unsupported social proof or sales metrics are introduced by these edits.

## Test evidence

- **PASS: 12/12 responsive browser checks:** marketing home, pricing, signup on 1440px and 390px, Arabic and English; screenshot and machine-readable result in this folder. Footer/header left-aligned logo and far-right language selector maintained in both languages; Arabic RTL and English LTR remain correct.
- **PASS: 5/5 focused unit tests** across `abc-visual-content.test.ts` and `product-experience.test.ts`.
- **PASS:** TypeScript / focused ESLint and local HTTP 200 on Arabic/English home page.
- Images: `marketing-ar-home-desktop.png`, `marketing-ar-home-mobile.png`, `marketing-en-home-desktop.png`, `marketing-ar-footer-desktop.png`, and other review screenshots.

## Gate

Owner's visual sign-off pending. Pilot customer operations / secure public launch still require separate approval. No deployment, no merge, and no production environment changes made.
