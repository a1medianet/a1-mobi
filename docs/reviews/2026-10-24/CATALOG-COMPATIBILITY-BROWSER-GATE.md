# A1 Mobi — Catalog compatibility browser gate

## Scope
Real local Chrome (CDP), Next.js development runtime on 127.0.0.1:3249, local PostgreSQL on port 5437, isolated synthetic tenant and authenticated store owner. No production deployment, payment, or physical device tests.

## Workflow under test
1. Bootstrap synthetic store and owner; sign in through the real authentication endpoint.
2. Navigate to store-owner Products in EN and AR.
3. Select a repair part and compatible device variant.
4. Save compatibility via the visible UI, then confirm PostgreSQL relation exists.
5. Remove compatibility via UI, then confirm relation was deleted.
6. Capture screenshots of each state in each language.

## Preliminary independent runs
- English link/unlink PASS in catalog-ui-1792961379361/results.json. Overall run was INCOMPLETE due to later Arabic CDP timeout. Do not claim whole run PASS.
- Arabic link/unlink PASS in catalog-ui-1792961596329/results.json (Arabic-only mode).
- Final combined bilingual gate PASS in catalog-ui-1792962095916/results.json after authenticated route prewarming: real owner login, English link/unlink and Arabic link/unlink all PASS; persisted relation verified in PostgreSQL after each UI action. Four screenshots document both locales before and after unlink.
- Earlier combined run catalog-ui-1792961804041/results.json was INCOMPLETE at Arabic page readiness; retained locally for diagnosis, not submitted as passing evidence.

## Safety and remaining release gates
- Generated owner is synthetic and sessions are revoked; dedicated app and Chrome processes are stopped.
- Test excludes Hostinger production deployment, production migration and physical barcode scanners/printers.
- The owner UI screenshot showed limited available content width next to the RTL sidebar; full responsive visual QA remains.
- Production release requires separate approval and customer acceptance.

## Reproduction (Thaghr)
Run from C:\A1Hub\a1-mobi: node scripts\catalog-compatibility-browser-gate.mjs
For Arabic-only diagnosis set CATALOG_BROWSER_LOCALE=ar.
The gate fails closed if dedicated ports are in use and writes evidence under docs/reviews/2026-10-24/catalog-ui-*/.