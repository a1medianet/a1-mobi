# A1 Mobi — 5/7 Pricing & Permissions Gate — PASS

Date: 2026-10-26. Device: Thaghr only. Repository: a1medianet/a1-mobi.
Scope: server-side pricing role authorization, persisted approved discounts, audit, stock and invoice invariants for the Pilot release.

## Evidence and acceptance
- Isolated temporary PostgreSQL 17 at localhost port 5441; schema migrations applied successfully; UAT container removed after run.
- `scripts/pricing-roles-isolated-uat.ps1` runs `tests/price-override-roles-db.test.ts`: **PASS 1/1**.
- Cashier without `sell.price.override` permission: selling below price floor rejects, with no sale or invoice committed.
- Foreign-tenant actor with a similarly named authorized role: cross-tenant checkout rejects.
- Manager granted `sell.price.override` but missing override reason: rejects.
- Manager with permission and reason: discounted sale persists; stored override actor and reason, invoice, cash payment, and checkout audit verified.
- Cashier selling above floor: succeeds without override marker. Stock movements and sale counts match exactly.
- Complementary pricing, bulk sales, authentication tests: **27/27 PASS**.
- TypeScript `tsc --noEmit --incremental false` and lint on the newly added test: **PASS**.

## Stage decision
**5/7 = PASS (pricing authorization and data-integrity acceptance).** Reproducible fixture-based evidence; no changes to live production data. Role-specific interface rendering, keyboard/nav/AR-EN visual coverage belong to **6/7 owner/admin UI review**, not 5/7.
Physical barcode scanners and printers are separately **deferred to client Pilot UAT** under the recorded owner decision.
Next gate: **6/7 — admin/owner full visual and functional journey**, followed by **7/7 — backup/restore final acceptance**; competitor +1 after both gates.
