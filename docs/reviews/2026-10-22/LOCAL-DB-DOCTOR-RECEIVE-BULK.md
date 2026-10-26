# Local DB doctor and receiveBulk evidence

Scope: Thaghr workspace, branch `feat/mobi-abc-continue-20261013`. Local tooling and route unit tests only; no release gate, commit, push, migration, or production change.

## Discovery / inspection / decision gate: PASS

Source ledger: `prisma/schema.prisma` declares PostgreSQL and DATABASE_URL; `src/server/db.ts` constructs Prisma without explicit environment loading; `src/app/api/ops/live-01/route.ts` implements transactional receiveBulk; `tests/c-live-01-route-db.test.ts` covers serialized intake and sales but has no bulk receipt assertions. Package scripts and Vitest configuration were inspected. No external research or servers were used.

Value rationale: distinguish local process configuration from server, credentials, TLS, database existence, and unclassified engine initialization failures without disclosing connection details. Exercise existing stock receipt safeguards while PostgreSQL is unavailable.

Plan/build decision: add a standalone doctor and mocked route tests. Only literal IPv4/IPv6 loopback targets are accepted, with an allowlist of connection options and short connection/socket timeouts. Production mode is refused. The only SQL is SELECT 1. Error output uses fixed classifications and actions; no raw errors, URL, host, database, or credentials are printed. Exit 0 means connected; exit 1 means refusal or diagnostic failure. Importing the doctor does not execute it.

Rejected/deferred: reading or editing .env; external targets; migrations; automatic credential repair; application route refactoring; destructive DB tests. Existing dirty tsconfig and QA artifacts remain untouched. Innovation opportunity: use this redacted preflight before future explicitly authorized local integration gates.

## Diagnostic result

`npm run db:doctor` returned exit 1, CONFIG_MISSING, queryAttempted=false. DATABASE_URL is absent from this shell's inherited environment. No connection was attempted. This is not evidence that the earlier SELECT 1 initialization failure was a network failure.

To diagnose the original failing process, run `npm run db:doctor` in an approved local development shell with the same local DATABASE_URL supplied through its process environment. Do not put the URL in command arguments, logs, or this report. A `localhost` target must be privately changed to literal `127.0.0.1` or `[::1]` for this conservative doctor. Never use a forwarded production endpoint even if its address is loopback. P1000 indicates authentication, P1001 reachability, P1002 timeout, P1003 missing database, P1010 access, P1011 TLS, P1013 connection syntax, and P2024 pool timeout. An initialization exception without a recognized structured code remains INITIALIZATION_UNCLASSIFIED; privately verify generated client/engine compatibility and local service configuration. Do not infer a destructive migration is necessary.

## Validation

Focused tests: 30 passed across the doctor and receiveBulk suites. A subprocess test confirms external-target refusal, exit 1, no SQL attempt, no stderr, and no credential/URL disclosure. Mocked route tests verify tenant/branch query filters, movements and audit in one transaction callback, replay without writes, replay conflicts, input validation, authorization, and sanitized failures. These tests do not establish actual PostgreSQL rollback, uniqueness races, or connectivity. Live integration tests were not run because no local DB target is configured and those suites create records.

`npm run lint`: PASS, zero errors, one existing `@next/next/no-img-element` warning at `src/app/[locale]/page.tsx:121`. `npx tsc --noEmit --incremental false`: PASS after correcting the new parameterized test data shape. Incremental state and the existing dirty tsconfig were not modified. Script syntax check and `git diff --check`: PASS. This is local implementation evidence, not a database-connectivity or production-release PASS.
