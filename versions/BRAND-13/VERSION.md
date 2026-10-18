# A1 Mobi — BRAND-13 | Approved Logo, Favicon & App Identity

**Date:** 2026-10-18
**Device:** Thaghr only
**Canonical root:** `C:\A1Hub\a1-mobi`
**Repository:** `a1medianet/a1-mobi`
**Branch:** `feat/mobi-abc-continue-20261013` | **PR #12 Draft / unmerged**
**Method:** NAWA Way — reuse, preserve source of truth, tests, evidence, no premature release

## Approved identity

User-supplied official A1 Mobi horizontal logo: geometric interlocking blue/orange emblem, followed by blue “A1 Mobi” wordmark. Derived vector assets were traced directly from the approved PNG geometry at project-local coordinates; the shape and two-color identity are preserved, with web-safe smooth blue/orange gradients and transparent backgrounds. No alternative brand was created.

**Usage:**
- **A — product site:** complete wordmark in the public bilingual navbar and footer.
- **C — merchant management:** compact emblem in authenticated sidebar and mobile header, replacing the temporary square “A1” badge. Owner workspace navigation/access rules are unchanged.
- **B — merchant example:** retains the client’s independent TechZone storefront branding, with the A1 Mobi platform identity reserved for favicon/metadata. Do not replace a merchant's identity with A1 brand without explicit product/white-label policy.
- **Tab/device identity:** favicon.ico, Next App Router icon.png, Apple icon 180×180, manifest PNGs 192×192 and 512×512 and `/manifest.webmanifest`. Offline operation is not claimed and no service worker was introduced.

## Source and generated files

- `public/brand/a1-mobi-logo.svg` — trace of approved horizontal logo.
- `public/brand/a1-mobi-icon.svg` — same emblem with a square icon viewBox.
- `public/brand/a1-mobi-logo-on-dark.svg` — **recommended dark-background variant**: exact shared geometry, white wordmark and white blue-side emblem with original orange accent retained. Used directly on navy product footer, fully transparent background.
- `public/brand/a1-mobi-logo-white.svg` — **pure white monochrome fallback** for special single-color applications. Not used automatically on light backgrounds.
- `src/app/favicon.ico`, `src/app/icon.png`, `src/app/apple-icon.png` — officially served metadata icons.
- `public/brand/icon-64.png`, `icon-192.png`, `icon-512.png` — generated from one SVG source for web and manifest usage.
- `versions/BRAND-13/generate-brand-assets.mjs` — repeatable generation script using the existing Sharp package; no dependency was added.
- `src/app/manifest.ts` — brand name, origin-relative icons and start URL; no offline promise.
- `tests/brand-identity.test.ts` — geometry, icon pixel dimensions, ICO header, manifest paths and asset safety.

## Verification recorded

- **Focused automated tests:** 10/10 PASS (8 identity including exact negative/pure-white source equivalence + 2 existing A/B visual content).
- **TypeScript, ESLint and `git diff --check`:** PASS on Thaghr.
- **Browser screenshots:** `brand-13-a_ar.png`, `brand-13-a_en.png`, `brand-13-c_ar.png`, `brand-13-c_en.png` — authenticated local UAT Chrome test, desktop and mobile.
- **Browser verified:** public A /product/ar width 184px, /product/en mobile width 126px; authenticated C Arabic sidebar icon 43px and English mobile icon 33px; correct source URLs, loaded source-backed SVGs, no horizontal overflow. All four **PASS**.
- **Dark-footer verification:** /product/ar and /product/en footer both load `/brand/a1-mobi-logo-on-dark.svg`, width 174px, transparent logo wrapper with no white box; visually inspected Arabic screenshot confirms strong white/orange contrast against dark navy. Both **PASS**.
- **New captured evidence:** `brand-13-footer-a_ar.png` and `brand-13-footer-a_en.png`.
- **HTTP 200:** `/manifest.webmanifest`, `/favicon.ico`, `/icon.png`, `/apple-icon.png`.
- A historical 38px span rule initially narrowed the public logo. Fixed with a specific selector; the rerun then passed. Unloaded offscreen lazy footer imagery is not misreported as missing brand assets.
- The first full PostgreSQL regression attempt was **NOT PASS**: local `127.0.0.1:5438` became unreachable during execution, causing database initialization errors and timeout failures in DB-backed security/sales tests. This is recorded as an environmental blocker, not silently treated as a success. Focused brand tests, TypeScript, ESLint, and browser visual tests were PASS. Recheck database stability and CI independently before final production acceptance; no earlier green results are inherited.

## GitHub visual workflow follow-up

- GitHub CI for `b69ce00`: **SUCCESS**.
- GitHub Product & Pilot Visual Evidence initially **FAILED** at an outdated QA assertion that searched for the retired textual `.mobi-wordmark`. The underlying build succeeded. This is an automated test selector mismatch after replacing the text with the official image logo.
- Updated `scripts/abc-browser-qa.mjs` to assert the official header SVG is loaded and labelled, and the footer uses the transparent white-on-dark SVG, rather than weakening or deleting visual assertions. `node --check`: PASS.
- The corrected GitHub workflow needs its own successful run before brand visual CI is considered closed.

## Remaining and release policy

The new brand gate does **not** certify C financial refunds/warranty claims, B order/storefront operations, A subscription/recovery email, new independent Claude review, A1 Application Foundation v1.0.0 or overall Pre-Launch.

**PR #12 remains Draft; no merge, no public Hostinger redeploy, no changes outside canonical local project.**
