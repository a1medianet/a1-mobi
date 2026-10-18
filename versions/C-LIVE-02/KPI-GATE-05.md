# A1 Mobi — C-LIVE-02 / KPI-GATE-05

Checkpoint: 2026-10-18 | Dev node: Thaghr ONLY | Canonical root: C:\A1Hub\a1-mobi
Repository: a1medianet/a1-mobi; branch feat/mobi-abc-continue-20261013, PR #12 Draft

## Purpose
Owner screenshots showed an increasingly realistic repairs register. Following pagination (GATE-04), the four dashboard KPI cards were still derived from the CURRENT PAGE's orders, thus potentially misreporting totals and receivables whenever an owner searched or filtered more than 75 tickets. This is a data-integrity/UX problem, not merely cosmetic.

## Implemented
- GET /api/ops/live-02 computes branch-global, tenant-scoped status groups in PostgreSQL, regardless of q, page and status filters.
- Return overview {total,active,ready,balanceDue} from the server, plus existing matchedCount/totalOrders/pagination/cash-open fields.
- Ready receivables are the sum of balanceDue ONLY for READY repairs; other provisional estimates are excluded.
- Owner summary reads the branch-global server totals, and its first card explicitly says "إجمالي طلبات الفرع" / "Branch repair orders".
- Existing repair actions, idempotent payments, warranties, tenant authorization, filtering, server paging and A/B screens unchanged.

## Tests
- Focused ESLint PASS, TypeScript PASS (exit 0).
- Isolated PostgreSQL tests 8/8 PASS, including a synthetic 77-row pagination/search test that asserts global counts are identical before/after query and isolated across tenants.
- Browser verification: c-live-02-vp05-kpi-browser.mjs, PASS exit 0. Real branch overview from API matched 6 total / 3 active / 1 ready / USD 120.00 ready receivables; remained invariant under Customer B search and READY filter. Desktop 1440px and mobile 390px no overflow; ready ticket details and search passed.
- A Next dev-mode transient SERVICE_UNAVAILABLE occurred on FIRST screenshot automation while the development server was rebuilding; API returned HTTP 200 afterwards. Automation updated to require actual loaded rows and to retry Refresh rather than accepting empty stats.

## Remaining gates / safety
- Do not mark a new commit fully approved until GitHub CI + visual evidence both PASS.
- Current development is UAT-only, feature-flagged, NO production deployment and PR remains Draft.
- Remaining beyond repair KPI: cash close/returns/concurrency scenarios; warranty claims/expiry; email recovery health; ABC visual parity and commercial Foundation/Pre-Launch; performance tests for very large branch histories.

## Versioned browser evidence
- c-live-02-vp05-compact-desktop.png, c-live-02-vp05-table-desktop.png, c-live-02-vp05-desktop-opened-case.png
- c-live-02-vp05-compact-mobile.png, c-live-02-vp05-table-mobile.png, c-live-02-vp05-mobile-opened-case.png
- c-live-02-vp05-owner-search.png, c-live-02-vp05-owner-ready-filter.png
