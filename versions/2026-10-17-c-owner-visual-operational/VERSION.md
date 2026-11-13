# A1 Mobi — C Owner/Admin Visual & Operational QA

**Version:** `C-OWNER-VISUAL-UAT-2026-10-17`
**Machine:** Thaghr
**Sole local project root:** `C:\A1Hub\a1-mobi`
**GitHub:** `a1medianet/a1-mobi`, branch `feat/mobi-abc-continue-20261013`, PR #12 (Draft)
**Base SHA:** `e5aaeaac13ec54f535a7a39052e5f6050ddc2ad3`
**Release:** HOLD; no public deployment, no PR merge.

## User screenshot validation
Owner screenshot shows authenticated `/ar` dashboard, right-hand sidebar, four blue/orange action tiles, sample KPIs, low-stock/repairs, and links to operations. This is no longer the login page.

## CDP browser visual/operational QA (Thaghr local UAT)
- Authenticated dashboard rendered `/ar` with 4 spotlight actions, four KPIs, chart, repair/low-stock cards; sidebar toggle collapse and expand passed.
- All **9** owner routes navigated in a real authenticated browser, matched requested paths, and highlighted the correct sidebar link:
  `/ar/pos`, `/ar/products`, `/ar/inventory`, `/ar/repairs`, `/ar/customers`, `/ar/cash`, `/ar/reports`, `/ar/admin`, `/ar/settings/team`.
- C dashboard 1440px width: document scrollWidth 1425px, no horizontal overflow. Vertical scroll 2149px at 1000px viewport; expected for lower detail panels. Do not hide sections solely to force one screen.
- Mobile 390px width: scrollWidth 375px, no horizontal overflow; mobile nav visible, desktop sidebar hidden.
- Images: iPhone 16 Pro `naturalWidth=1000`, Galaxy S25 Ultra `naturalWidth=1000`, A56 `naturalWidth=2765`; decoded successfully. Earlier empty photo in fast screenshot was a capture timing issue, not a missing asset.
- Screenshots `c-*-desktop.png`, `c-dashboard-mobile.png` are retained **inside this version directory locally**.
- Repeatable test: `c-owner-browser-qa.mjs` (requires safe local UAT server, Chrome, private bootstrap secret from environment). Do not commit any credentials.

## Code polish in this version
- Neutral Arabic dashboard header **«إدارة متجرك من مكان واحد»** instead of a morning-only greeting.
- Static dashboard demo capabilities on Admin page now read **«تجريبي / DEMO»** instead of unsupported green **PASS**. This explicitly distinguishes illustrative data from live acceptance.
- QA waits for decoding POS product images before capture, preventing early blank screenshot artifacts.
- `patch-admin-clarity.py` records source transforms and is idempotent.

## Prior baseline
- A: Product Landing remains `/product/ar` and `/product/en`.
- B: Merchant `/store-preview` is scrollable and separately branded, with 8 example products and multiple sections; scrollHeight 5014px at 900px desktop viewport. No real checkout/booking/WhatsApp unless configured.
- Isolated local database migrated and HTTP owner smoke passed in prior gate.

## Not covered / still blocking release
- Browser screenshots prove rendering, navigation, and visual interaction, **not** real persisted sale/IMEI/repair/payment end-to-end or multi-tenant authorization under negative tests.
- Reference-by-reference owner visual signoff across all A/B/C surfaces remains open.
- Full `A1-STD-APPLICATION-FOUNDATION@1.0.0`, UAT, rollback/backup, hosting and privacy gates remain open.
- No merge and no Production/Public deploy from this version.

**Workflow:** Inspect → Fix only verified defects → Browser & unit QA → Evidence → Git Commit → GitHub PR → Review. Preserve prior versions under `versions/`.

## Local validation of updated source
- npx tsc --noEmit: PASS.
- ESLint: exit 0, one existing next/no-img-element warning.
- Vitest: **98 passed / 19 skipped / 0 failed**, test process exit 0 (DB-specific tests skipped locally).
- The initial Prisma DLL EPERM was resolved by stopping only the local Mobi server before regeneration; no code test failed.
- Production build after these changes: PASS, Next.js 16.4.0 webpack exit code 0, 25/25 static pages.
