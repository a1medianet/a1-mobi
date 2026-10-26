# A1 Mobi — 7/6 owner acceptance decision and 7/7 local recovery refresh

Date: 2026-10-26. Device: Thaghr only. Branch: `feat/mobi-abc-continue-20261013`.

## Owner decision: defer exhaustive UI matrix

The product owner explicitly authorized moving past the **exhaustive** administrative screen visual sweep for Arabic and English at mobile and desktop sizes. It will be performed before production go-live or as part of online launch inspection. This is a **DEFERRED ACCEPTANCE**, not a claimed completed visual test.

Already-evidenced Gate 6 subsets:
- Owner operational browser journey: 21/21 PASS. See `GATE6-OWNER-JOURNEY-ACCEPTANCE.md`.
- Home/admin launcher for AR/EN at 390px and 1440px: 8/8 PASS after responsive task grid fix. See `GATE6-OWNER-VISUAL-FOLLOWUP.md`.
- Authenticated cash API and persisted ledger lifecycle: 7/7 PASS. See `GATE6-CASH-API-ACCEPTANCE.md`.
- Unverified: cash drawer click-through from the browser and every admin screen at all 4 visual combinations. A prior wide sweep/CDP stall is *not* an application PASS.
- Physical barcode scanner and printer: owner-authorized deferral until client pilot.

**7/6 decision:** CONDITIONALLY ADVANCED by owner; complete visual sign-off remains OPEN. Do not describe it as unconditional PASS.

## 7/7: backup and restore — renewed evidence

Executed `node scripts/backup-restore-smoke.mjs` against the Thaghr local Docker PostgreSQL instance on 2026-10-26. Exit code 0, JSON `status: PASS`:
- 58 source tables = 58 restored tables.
- 14 completed source migrations = 14 restored migrations.
- 20 named business tables matched by row count and deterministic row-data digest.
- Nonempty source examples: 1,071 StockMovement; 265 Sale; 2,076 AuditEvent.
- Four reconciled aggregates: movement quantity, sale total, payment base amount, refund base amount.
- Unique temporary restore database and dump cleaned by script; original local database not altered.

Previously recorded import evidence: `GATE7-EXCEL-IMPORT-VERIFICATION.md`, `import-http-1792988278995/results.json`: authenticated local HTTP upload of genuine XLSX and CSV, owner permission and origin checks, persisted upsert, invalid input rejection and rollback all PASS.

**7/7 status:** Local recovery and authenticated import technology **PASS**; full client-facing acceptance still **CONDITIONAL** until an owner performs the complete browser import/download/recover drill and the eventual deployment environment has verified storage, retention, access controls and restore instructions. Do not infer that local PostgreSQL restore tests certify a live Hostinger restore or external backup durability.

## Release boundary

These results approve continued *pilot preparation*, not production deployment. Prior to public release, complete A1 Application Foundation pre-launch gate, backend/local-to-host environment checks, critical route regression and agreed online visual acceptance. Explicit owner authorization is required for production writes.
