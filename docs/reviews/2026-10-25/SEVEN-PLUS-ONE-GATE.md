# A1 Mobi — 7/7 +1 evidence checkpoint (2026-10-25)

Scope: Thaghr `C:\A1Hub\a1-mobi`; development branch `feat/mobi-abc-continue-20261013`. No production deployment was authorized or attempted.

## Verified on Thaghr

- Full Vitest execution with the existing local PostgreSQL database on port 5437: 86 test files PASS; 438 tests PASS; one test SKIPPED intentionally by its isolation guard. Process exit 0. This covers branch/tenant isolation and owner workflows, POS, stock, repairs, cash, customers, reporting and security regressions.
- Independent C14 cash-variance approval database test: 1 file / 1 test PASS separately. Ran on ephemeral Docker PostgreSQL 17, bound to loopback port 5438, with synthetic `mobi_uat` database; Prisma applied 14 migrations. Docker test container was automatically stopped and removed after test.
- New repeatable command: `powershell -ExecutionPolicy Bypass -File scripts\c14-isolated-uat.ps1`. It generates a random synthetic password and cleans up its own temporary Docker container; does not access the standard development database.
- ESLint: 0 errors; one warning in `src/app/[locale]/page.tsx` on standard `<img>` performance optimization.
- TypeScript `npx tsc --noEmit --incremental false`: PASS (exit 0 after lint).

## Outstanding gates — do not mark release PASS yet

- Production build outcome: pending at writing of this checkpoint; inspect follow-up evidence before declaring success.
- Gate 71 end-to-end real browser, comprehensive owner visual review of A/B/C AR/EN on desktop/mobile and final regression acceptance are not certified by this test run alone.
- Hardware scanner, printer and real-store operator acceptance cannot be inferred from simulated tests.
- `+1` competitor/commercial positioning review and user pilot acceptance require distinct evidence.
- Hosting deployment `mobi.a1medianet.com`, database backup/migration rehearsal and production smoke test remain separately gated; no live changes during this checkpoint.

Decision: **HOLD public release / CONTINUE staged closure**, keeping prior unrelated edits and evidence untouched. Only explicitly scoped new C14 orchestration and this report should be staged for the checkpoint commit.
