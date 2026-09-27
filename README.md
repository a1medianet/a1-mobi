# A1 Mobi

A1 Mobi is a specialized operating platform for mobile retail and repair shops.

## Authority
The Arabic and English Master Implementation Brief v1.0 files in this repository
are the Source of Truth. Real-store workflows may be staged, but not deleted.

## Current gate
Stage 1 Foundation: Next.js, TypeScript, PostgreSQL, Prisma, Auth, Tenant/Branch,
RBAC, Audit, AR/EN direction, feature flags, health, and domain boundaries.

## Local start
1. Copy `.env.example` to `.env`.
2. Run `docker compose up -d`.
3. Run `npx prisma migrate dev`.
4. Run `npm run dev`.

## Quality gate
Run `npm run db:validate`, `npm run lint`, `npm test`, and `npm run build`.

No later Stage begins without a documented PASS.