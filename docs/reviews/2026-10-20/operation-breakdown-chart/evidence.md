# Demo operation breakdown checkpoint

Date: 2026-10-20. Machine: THAGHR. Branch: feat/mobi-abc-continue-20261013.

## Decision and source ledger

Owner supplied the P0 finding from an independent Claude Free review at https://claude.ai/chat/77593255-a13a-4932-b527-1099099eca2c . This task used that supplied finding; it did not perform or invent another Claude review.

Counts come strictly from unchanged `src/demo/data.ts::demoTransactions`: Sale 2/5 (40%), Repair 2/5 (40%), Top-up 1/5 (20%). The component does not read amounts. This is operational composition, not revenue, margin, or a particular day.

Discover/Inspect/Plan: PASS for this bounded correction. Build: renamed component, test and evidence script; updated dashboard import and scoped chart CSS; removed obsolete amount-chart files and generated evidence. Added semantic figure/list text, adjacent localized demo badge, empty state, readable counts/shares, RTL/LTR zero origins, and 0–100% axis. Exact widths are count/total*100. Largest-remainder whole-number labels total 100 for nonempty datasets, zero for empty datasets, with stable category-order tie breaks and a rounding caption.

Value: interpretable category activity with an explicit denominator. Rejected: unlike financial comparisons, disclaimer-only repairs, hardcoded totals, minimum-width distortion, invented trends. Deferred: unrelated financial KPIs, authenticated integration QA, real-data wiring. Opportunity: use explicit denominators and source semantics for future authorized operational summaries. Living intelligence/decision report updated.

## Verification

- `npm run lint`: exit 0; 0 errors, 1 existing `@next/next/no-img-element` warning at dashboard line 121.
- `npx tsc --noEmit`: first run exit 0. Final repeat recorded in local summary.
- `npx vitest run tests/operation-breakdown-chart.test.ts tests/demo-experience.test.ts tests/abc-visual-content.test.ts --maxWorkers=1`: final exit 0; 3 files, 12 tests passed. Initial run: 1 failed / 11 passed due to overly strict floating-point equality for thirds; corrected assertion to tight tolerance without changing ratio calculation.
- Coverage: fixture counts, zero-amount invariance, empty and single operation, absent categories, thirds, 729 varied distributions preserving count/share sums and bounds, localized semantic output, direction, no monetary output, empty text and zero widths.
- `git diff --check`: exit 0 before report creation.
- Chrome: AR/EN at 1440 and 390 widths, height 1000. Four captures pass direction, no horizontal overflow, zero origin, and 40/40/20 pixel ratios within 0.1 percentage point. Component heights: AR 246.8125/268.25 px; EN 248.3125/303.1875 px. Visually inspected Arabic desktop/mobile and English mobile: readable and compact. See screenshots and `browser-results.json` in this directory.

## Browser method and limits

`node scripts/operation-breakdown-evidence.mjs` renders the actual component, demo rows, global CSS and embedded local fonts to AR/EN HTML. With CHROME_BIN set, `node scripts/operation-breakdown-browser.mjs` opens http://127.0.0.1:3224 and inserts those generated documents into an isolated browser document for capture. These are real component screenshots, not authenticated full-dashboard evidence. Protected dashboard URLs redirect to login. Authentication and accounts were left untouched; full-dashboard visual integration remains pending. Attempted dev start failed with EADDRINUSE; existing server was left alone. No server configuration changed.

Focused implementation/test/component-visual gate: PASS. Full-dashboard visual gate: pending. No production/public-release gate claimed. No staging, commit, push or deployment. Existing unrelated B storefront work/media preserved; A/B flows, login, accounts and physical-left header/footer logos unchanged. Checkpoint only.
