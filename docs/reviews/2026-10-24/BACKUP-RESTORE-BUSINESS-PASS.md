# A1 Mobi — Business-data backup/restore gate (2026-10-24)

Status: **PASS — Thaghr local PostgreSQL only**.

Command: `node scripts/backup-restore-smoke.mjs`

## Verified

- Temporary, uniquely named PostgreSQL restore database created from `pg_dump -Fc`; `pg_restore` completed successfully.
- Source and restored structures matched: **58 tables** and **14 completed Prisma migrations**.
- **20 business tables** matched in both exact row count and deterministic row-data MD5 digest (rows ordered by ID), including inventory, sales, returns, payments, repairs, customers, top-ups and audit events.
- Representative non-empty source records: 948 StockMovement, 232 Sale, 1,802 AuditEvent.
- Four ledger aggregates matched: StockMovement quantity, Sale total, Payment base amount, SaleReturn refund base.
- Process exited **0** and reported `status: PASS`.
- The script's `finally` removes only its own timestamped restore database and dump. Original local database remains unchanged.

## Boundaries

- No production database, remote server, external backup destination or real-world recovery-time objective tested.
- MD5 is used here for deterministic comparison of local source/restored rows, not for adversarial authenticity.
- This establishes database business-data recovery integrity, **not** complete 7/7 +1 product acceptance or release readiness.
