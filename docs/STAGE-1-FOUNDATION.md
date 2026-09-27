# Stage 1 Foundation

Status: Implementation in progress
Authority: A1 Mobi Master Implementation Brief v1.0

## Scope
- Repository baseline and protected engineering rules
- Next.js and TypeScript application shell
- PostgreSQL and Prisma baseline
- Tenant and branch isolation model
- Authentication session and password primitives
- Server-side RBAC permission registry
- Append-only audit event model
- Arabic and English direction support
- Feature flags, health endpoint, and logging baseline
- Explicit domain boundaries for every later Stage

## Exclusions
Business workflows are preserved but intentionally not implemented in Stage 1.
No Catalog, Sell, Repair, Debt, Cash, Top-up, or Reports workflow is deleted.

## Gate
PASS requires lint, tests, Prisma validation, production build, and a commit SHA.