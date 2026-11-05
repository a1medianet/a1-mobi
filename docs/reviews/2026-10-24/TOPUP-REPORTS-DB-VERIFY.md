# A1 Mobi — Top-up and reports PostgreSQL verification
Date: 2026-10-25; device: Thaghr; branch: feat/mobi-abc-continue-20261013.

## Method
Local Docker PostgreSQL database (127.0.0.1:5437) using development compose credentials; Vitest with DATABASE_URL set only in the process environment. No production data or deployment.

## Evidence
- `tests/topup-db.test.ts`: PASS 1/1. Posts a top-up service without fabricated stock and settles a provider against the cash session.
- `tests/reports-db.test.ts`: PASS 1/1. Imports a product CSV and derives owner summary and low-stock alerts from persisted database records.
- Combined test result: 2 test files PASS, 2 tests PASS, 0 skipped, exit code 0. Vitest v5.0.2. Verified at 23:28 local runtime clock on Thaghr.
- Initial run without DATABASE_URL returned 2 SKIPPED and was not counted as passing evidence. Re-run included real local PostgreSQL and executed both cases.

## Remaining acceptance
- Provider settlement reconciliation must still be verified across refunds, cash reversals and authorization boundaries in the owner browser.
- Reports require sales/repairs/cash ledger balance checks, timezone edges, chart UI and bilingual visual acceptance.
- This is a focused DB checkpoint, not release-wide approval.

## Reproduction
Set DATABASE_URL to the local PostgreSQL development URL documented by docker-compose.yml, then run `npx vitest run tests/topup-db.test.ts tests/reports-db.test.ts --maxWorkers=1`. Never commit database credentials.