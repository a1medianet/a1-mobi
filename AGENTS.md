# A1 Mobi Engineering Rules

## Authority
- A1 Mobi Master Implementation Brief v1.0 is the Source of Truth.
- Real-store workflows cannot be removed without explicit owner approval.
- Work follows NAWA Way and One-Click Stage Gate.

## Workflow
- Inspect → Plan → Build → Test → PASS → Commit → Next Stage.
- Never begin a later Stage before the current Gate passes.
- Prefer small, reversible, testable changes.

## Architecture
- Next.js + TypeScript + PostgreSQL + Prisma.
- Modular Monolith with strict server-side RBAC and tenant isolation.
- Preserve domain boundaries: Catalog, Devices, Inventory, Sell, Repair,
  Customers, Debt, Cash, Top-up, Reports.
- Corrections use reversal/adjustment records, not silent destructive edits.
- Sensitive actions require before/after audit evidence.

## Safety
- Never expose secrets or commit .env files.
- Never deploy or change production without explicit approval.
- Do not copy immature shared-core code into Mobi.
- Report test failures and risks honestly.