# A1 Mobi — HOME-01 / HOME-02 / HOME-12 live closeout

Date: 2026-11-12 (Asia/Beirut)
Scope: Production at https://mobi.a1medianet.com, old Hostinger Business hosting.
Hostinger SSH host: 92.113.24.4:65002
Active build: 01a1c9d9-176c-73ce-801f-5cc51754097b

## Evidence First results

- HOME-01 **PASS**: percentage labels shown as a vertical axis (100%, 50%, 0%), rather than horizontal. Verified in a signed-in Chrome window screenshot.
- HOME-02 **PASS**: bars visually proportional at 40%, 40%, and 20%. The representative DOM fixture computed 68 px, 68 px, and 34 px heights.
- HOME-12 **PASS for duplicate shortcuts**: the top spotlight retains Sale, Repair, Inventory, Customer; the "Start here" panel now contains only Product, IMEI/device-trust, and Top-up, displayed in a compact row. Verified in signed-in Chrome.
- Both /ar and /en should refer to the same stylesheet; complete localized QA is tracked separately.
- No database migration and no Supabase production data mutation.

## Live deployment mechanism and rollback

The original Next.js CSS asset was cached as immutable for up to a year, therefore editing it in place did not update previously visited browsers.
A new CSS file was published using a new URL:
`/_next/static/css/a1mobi-home-20261112-r3.css`.
35 Next.js server client-reference manifest files were updated to point to it. Passenger was restarted using `tmp/restart.txt`.
The new public stylesheet and dashboard responded with HTTP 200, with the new CSS filename present in HTML.
Backups:
- hbuilds/cache/home20261112-css-versioned/ (manifest backups for r2)
- hbuilds/cache/home20261112-css-versioned/r3-backup/ (manifest backups for r3)
- Original CSS was not deleted; prior built CSS files remain available.
- Hostinger hbuilds/versions retains preceding immutable release.

## Visual files (local Thaghr)
- `docs/reviews/2026-11-12/mobi-versioned-wheel-chart.png`: vertical axis and scaled bars
- `docs/reviews/2026-11-12/mobi-home12-r3-visual.png`: condensed nonduplicated shortcuts and correct chart
- `docs/reviews/2026-11-12/css-fixture.png`: rendering fixture showing CSS and visual output

## Status
3 / first 77 register issues resolved and visually verified live.
Remaining work: keep source CSS in GitHub, validate /en, and continue remaining defect register items.
