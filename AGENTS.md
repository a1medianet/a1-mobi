# A1 Mobi Engineering Rules

## Authority
- A1 Mobi Master Implementation Brief v1.0 is the product Source of Truth.
- A1 FIRST Sustainability/Superiority/Innovation Charter v1.2 is the mandatory product-evolution standard.
- Real-store workflows cannot be removed without explicit owner approval.
- Work follows A1 First + NAWA Way + One-Click Stage Gate.

## Workflow
- Discover/Compare → Inspect → Plan → Build → Test → Evidence → PASS → Commit → Evolve.
- Never begin a later Stage before the current Gate passes.
- Before a major Gate, update the A1 First intelligence/decision report, source ledger, value rationale, rejected/deferred reasons, and innovation opportunities.
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