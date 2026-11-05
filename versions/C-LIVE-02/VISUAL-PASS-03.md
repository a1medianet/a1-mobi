# A1 Mobi C-LIVE-02 — VISUAL-PASS-03

Checkpoint: 2026-10-18 | Node: Thaghr | Canonical root: C:\A1Hub\a1-mobi
GitHub: a1medianet/a1-mobi | feat/mobi-abc-continue-20261013 | PR #12 Draft

## Scope
Real owner UAT screenshots showed a cash collection form embedded directly in a table cell. This stretched one repair row and hindered reading and selection.

## Changes
- Replace inline actions with Open ticket button per row, aria-expanded and aria-controls.
- Put all existing actions in a separate selected-case workspace below the compact list.
- Show ticket/customer/device/issue/status/estimate/balance/IMEI last four, with one appropriate action area.
- Close details never modifies server data; preserve original tenant/branch isolation, roles, money, warranty and repair status code.
- New scoped styling and keyboard focus, responsive detail grid, no changes to unrelated apps.

## Browser UAT evidence
- Authenticated API GET 200; synthetic PostgreSQL UAT data only.
- Five stored repair tickets on 1440x900 desktop and 390x844 mobile.
- Desktop scrollWidth 1425 <= 1440, mobile scrollWidth 375 <= 390.
- ZERO forms inside the repair table rows on desktop/mobile.
- READY case displays cash form only after clicking Open ticket in the detail workspace.
- Close hides detail panel; search and READY filter PASS.
- Script: c-live-02-vp03-browser.mjs.
- Screenshots: c-live-02-vp03-compact-desktop.png, c-live-02-vp03-table-desktop.png, c-live-02-vp03-desktop-opened-case.png, c-live-02-vp03-compact-mobile.png, c-live-02-vp03-table-mobile.png, c-live-02-vp03-mobile-opened-case.png.
- Focused ESLint and TypeScript: PASS exit 0.
- Focused PostgreSQL repair route + owner filters regression: 7/7 PASS in two files, exit 0.

## Open gates
Full financial action browser E2E, server-side pagination/search for >75 records, degraded recovery email health, A/B/C reference signoff, Foundation v1.0 and Pre-Launch OPEN. No PR merge or production deployment; keep flag OFF by default.
