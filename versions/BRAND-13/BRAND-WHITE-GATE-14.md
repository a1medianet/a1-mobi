# A1 Mobi — BRAND-14 / Pure-White Dark Identity Finalization

Date: 2026-10-18
Scope: Thaghr only — `C:\A1Hub\a1-mobi`
Repository: `a1medianet/a1-mobi` — branch `feat/mobi-abc-continue-20261013`, PR #12 Draft.
Policy: A1 First / NAWA Way / Evidence First / One-Click Stage Gate.

## Final approved brand rule

Use **the complete supplied A1 Mobi logo** whenever the surface can contain it. Never place separate text "Mobi" or "A1 Mobi" beside an emblem to imitate a logo. Do not change the shape, proportions or colors of the user-approved source mark.

- Light header/section: complete official blue-and-orange vector logo `/brand/a1-mobi-logo.svg`.
- Dark footer/sidebar/section: complete **pure white** logo `/brand/a1-mobi-logo-white.svg` (both original SVG paths white; no retained orange accent).
- Narrow responsive/compact surfaces only: emblem alone, white in the dark collapsed sidebar `/brand/a1-mobi-icon-white.svg`, official colored emblem in the mobile header on white.
- Merchant storefront B retains its own TechZone identity; the platform must not overwrite client brands.

## Concrete source changes

- Product shell footer uses `a1-mobi-logo-white.svg` on navy; light header keeps `a1-mobi-logo.svg`.
- Authenticated owner C desktop sidebar replaces the emblem + separately typed "Mobi" with **one pure white full SVG logo**. Collapsed sidebar uses only the pure white icon; narrow mobile topbar uses only the colored icon, with no separately typed brand name.
- Shared SVG paths were reused; one minimal pure-white emblem asset generated from existing `a1-mobi-icon.svg`. CSS responds at narrow sidebar and mobile breakpoints. No API, schema, customer data, login, subscriptions or production settings were changed.
- Legacy interim `a1-mobi-logo-on-dark.svg` remains historical evidence only and is **not selected by the app**; its white+orange treatment is superseded.

## Verified acceptance

- `tests/brand-identity.test.ts` + `tests/abc-visual-content.test.ts`: **10/10 PASS**.
- `npx tsc --noEmit`: PASS.
- Focused ESLint on app shell, product shell and tests: PASS.
- `git diff --check`: PASS.
- Local authenticated Chrome (read only), via `brand-white-14-browser.mjs`:
  - `/product/ar` desktop colored full logo 184px, pure white transparent footer full logo 174px, no horizontal overflow: PASS.
  - `/product/en` mobile colored full logo 126px, pure white transparent footer full logo 174px, no horizontal overflow: PASS.
  - `/ar` authenticated owner desktop pure white full sidebar logo 170px, no duplicate separate text: PASS.
  - `/en` authenticated owner mobile color icon alone 33px with no separate "Mobi" text: PASS.
  - Manifest, favicon, app and Apple icons: first-party HTTP 200 PASS.
- Evidence images: `brand-14-a_ar.png`, `brand-14-footer-a_ar.png`, `brand-14-a_en.png`, `brand-14-footer-a_en.png`, `brand-14-c_ar.png`, `brand-14-c_en.png`.
- Browser gate initially needed a correction to wait for the **visible** image rather than a hidden lazy image; final full repeat succeeded. Tests do not assert hidden icons are loaded.

## Release constraints

Brand identity is closed locally for these placements, **not** final acceptance for A/B/C. Full local PostgreSQL regression on the preceding brand stage was blocked by loopback database unavailability; do not claim it passed in this gate. GitHub CI and visual evidence on the final commit still require verification.

Other open gates include POS returns/reconciliation, multi-product checkout, warranty claims, real owner pages, B merchant storefront integration, signup/subscription/recovery, independent Claude review, Foundation 1.0.0, Pre-Launch and production rollback.

**NO merge, no Hostinger redeploy, no auto-deploy.**

## CI visual assertion follow-up (same stage)

The first GitHub Visual Evidence workflow after the BRAND-14 logo commit **failed** at its screenshot capture assertion, because `scripts/abc-browser-qa.mjs` still required the superseded `a1-mobi-logo-on-dark.svg` path. This is a stale test expectation, not authorization to restore the orange-accented asset. The gate script now asserts the approved full pure-white footer logo; in authenticated C it also asserts one full pure-white desktop sidebar logo (no duplicate "Mobi" text) and a pure-white emblem in collapsed dark sidebar.

The original GitHub failure remains recorded in run `39157785352`. The next pushed commit must pass a fresh Visual Evidence workflow before this stage can be signed off. `npm run build` had passed before that screenshot step. No production site was modified.
