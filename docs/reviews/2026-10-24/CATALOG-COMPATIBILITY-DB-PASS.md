# A1 Mobi — Catalog Compatibility Live PostgreSQL Gate (2026-10-25)

## Scope and source
- Thaghr only, branch feat/mobi-abc-continue-20261013, starting from ea07e19.
- Existing ProductCompatibility route and bilingual owner UI remain unchanged.
- Uses the project-local docker compose PostgreSQL on loopback 127.0.0.1:5437/a1mobi. Not production.
- New automated test creates fresh random two-tenant synthetic fixtures and exercises actual API handlers and Prisma database transactions.

## Environment recovery
- Initial test failed at Prisma P1001: local PostgreSQL was unavailable.
- docker compose ps showed no running containers; docker compose up -d postgres started a1-mobi-postgres-1.
- Initial post-recovery test reached final audit verification, but the test incorrectly sorted AuditEvent by nonexistent createdAt. Fixed test to use occurredAt.
- No schema migration, data reset, or production changes.

## Result: PASS
Command: vitest run tests/catalog-compatibility-db.test.ts tests/catalog-compatibility.test.ts --maxWorkers=1
- 2 files PASS, 9 tests PASS, exit code 0.
- Real PostgreSQL scenario PASS: create two tenants and their branch, actor, part, manufacturer, family, model, variant.
- Reject cross-tenant variant linking with 404; no compatibility row created.
- Link an in-tenant part and variant; verify stored manual notes; reject duplicate with 409.
- Read tenant-isolated variant list and product links; exclude second tenant variant.
- Unlink; verify relationship removed and ordered audit actions with before/after evidence.
- Verify foreign tenant has no compatibility audit.
- Test fixtures are synthetic and remain in the development database, consistent with existing DB test style.

## Limits
- This test mocks only session context/origin while using real Prisma and PostgreSQL. It does not prove browser login, UI clicks, or production deployment.
- Production and physical scanner/printer acceptance remain blocked by owner prelaunch gates.
