# A1 Mobi — BRAND-15 | Global 20% Wordmark Scaling

Date: 2026-10-18
Device: Thaghr only, `C:\A1Hub\a1-mobi`
Branch: `feat/mobi-abc-continue-20261013`, PR #12 Draft.

## Approved size refinement
Uniform visual width reduction, with natural SVG aspect ratios kept and no source-image mutation:
- Light public header desktop: 184 -> 147 px.
- Light public header tablet: 148 -> 118 px.
- Light public header narrow mobile: 126 -> 101 px.
- Dark footer pure-white logo: 174 -> 139 px.
- Dark management sidebar pure-white full logo: 170 -> 136 px.
- Compact standalone icons, favicon, PWA icons and tenant-specific storefront brands unchanged.

Source of truth: CSS rules in `src/app/globals.css`. Old `>=140` sidebar visual assertion updated to a 125-140 px permitted box around the approved 136 px target.

This is a UI sizing refinement only. TypeScript, tests, lint, browser/CI evidence on the resulting commit are release gates; no merge or production deploy.
