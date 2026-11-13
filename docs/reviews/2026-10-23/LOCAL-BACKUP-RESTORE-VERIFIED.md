# Mobi local backup and restore verification

Thaghr, 2026-10-23. Local A1 Mobi PostgreSQL only. No production backup or restore.

- Executed existing scripts/backup-restore-smoke.mjs with its isolated temporary restore database.
- Result PASS: 58 source tables and 58 restored tables; 14 completed source migrations and 14 restored migrations.
- Script cleans up its temporary restore database and temporary dump in finally; the source a1mobi database is unchanged.
- This verifies schema/table and migration parity; it does not alone prove application data row-for-row parity or remote disaster recovery.
- Axis 7 remains OPEN until import/export, restore recovery drill and owner acceptance are fully validated.
