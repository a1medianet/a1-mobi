# A1 Mobi — ABC / Claude Visual UAT v2026.10.17

**Project:** A1 Mobi (MobiLine)
**Canonical local workspace (Thaghr):** `C:\A1Hub\a1-mobi`
**Canonical remote repository:** `https://github.com/a1medianet/a1-mobi`
**Branch:** `feat/mobi-abc-continue-20261013` / PR #12 (Draft)
**Baseline commit:** `1998409c1b0d4d60b7f4da9106edd36b50c9681d`
**Release status:** PARTIAL VISUAL UAT / PRODUCTION HOLD. The candidate is **not** a Production release.

## Claude review carryover (11 October 2026)

- A: CHANGES REQUIRED — hero, logo, feature cards and reference matching; no invented reviews or success metrics.
- B: CHANGES REQUIRED — images including AirPods, search, cart, navigation, mobile UX.
- C: NOT VERIFIED — earlier reviewer saw login only; authenticated dashboard requires evidence.
- Reviewer judged screenshots, not E2E operations. Do not conflate styling with operational readiness.

## Changes in this stage

1. B TechZone: sample basket supports add, decrement/increment quantity, subtotal, clear and close, with an explicit notice that no order/charge happens. **No real checkout or booking is enabled.**
2. B repair CTA now takes the visitor to real preview service information rather than pretending to book.
3. B 390px mobile header: nav starts collapsed, explicit open/close works, search remains available.
4. A product header: restored proper horizontal A1 Mobi wordmark (old selector constrained wordmark to a 38×38 icon).
5. A marketing hero: blue/orange headline phrase groups coherently across lines.
6. Browser QA `scripts/abc-browser-qa.mjs`: added sample basket and mobile menu assertions.

## Completed evidence

- `npx prisma generate`: Prisma Client 6.19.3 created locally.
- `npx tsc --noEmit`: PASS (exit 0) after re-generation.
- `npm run lint`: PASS with one pre-existing Next.js image optimization warning in `src/app/[locale]/page.tsx`.
- `npm test`: **98 passed / 19 skipped / 0 failed** across 46 test files; skipped tests require test DB, not passed.
- Browser CDP, A/B: `aMobile.scrollWidth=375 <= 390`, `bMobile.scrollWidth=375 <= 390`; B `scrollHeight=900 = innerHeight=900` at 1440×900; B menu was **display:none** by default at 390px. Basket open/add/count/disclaimer and language/search assertions executed with no error (exit 0).
- HTTP: `/store-preview` and `/ar/login` 200; `/ar` unauthenticated -> 307 redirect. A loaded 200 in dev server logs, despite first-request timeout during slow initial compilation.
- `git diff --check` + `node --check scripts/abc-browser-qa.mjs`: PASS.

## Visual evidence files (local-only, not uploaded)

- `a-desktop-cdp.png`, `b-desktop-cdp.png` — 1440×900 Chrome DevTools capture.
- `a-mobile-cdp.png`, `b-mobile-cdp.png` — emulated **true** 390×844 viewport.
- `c-login-desktop.png` — login screenshot. **Not** an authenticated C dashboard screenshot.
- `abc-browser-a-b-only.mjs` / `generate-browser-gate.py` — reproducible non-DB A/B test.
- `apply-preview.py` / `patch-mobile-nav-wordmark.py` — original auditable changes, **do not re-run after applying**.

Original Chrome CLI files `a-product-mobile.png` / `b-store-mobile.png` used `--window-size` only and misleadingly cropped layout; **do not use as mobile QA evidence**. Corrected CDP screenshots supersede them.

## Remaining gates

- Full C authenticated dashboard, sidebar, POS, inventory and repair visual check with isolated DB tenant; PRIORITY P0.
- Full owner + customer real DB E2E, negative RBAC, IMEI sale, repair estimate/payment/delivery, cash & audit; P0.
- Production Next.js build: PASS (2026-10-17); Next.js 16.4 webpack compiled, TypeScript finished, 25/25 static pages generated, exit 0.
- A/B reference pixel review with user's original approved screenshots: visual direction checked, **strict reference matching NOT VERIFIED**.
- External integrations, UAT with actual customer, HTTPS staging, backup/restore, rollback, Pre-Launch `A1-STD-APPLICATION-FOUNDATION@1.0.0` gate: PENDING.
- Any new GitHub SHA should be recorded here after safe commit/push. Merge/deploy prohibited until gate PASS.

**Scope control:** all work is inside the single project root above. Previous versions remain under `versions/archive`, and GitHub is the sole remote source. No deletions of legacy archives, no work on Fanshine, no loose external project files, no secrets in Git.
