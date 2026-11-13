# A1 Mobi — Compatibility API Gate (2026-10-25)

Scope: catalog PART-to-DeviceVariant compatibility, Thaghr only.

## Decision
Use existing ProductCompatibility join table without altering shared model/variant names. Product has no direct variant relation, so renaming shared DeviceModel based on Product edits risks corrupting other device references. Defer a separate explicit model-binding migration and user-facing catalogue editor.

## Built
- GET /api/ops/catalog/compatibility?productId=... (inventory.read, tenant-scoped PART only).
- POST link/unlink (same-origin, JSON-only, foundation.manage, strict request schema).
- Transactionally verify both product and variant belong to session tenant.
- Reject cross-tenant IDs, duplicate links and missing links; record audit with before/after.
- Existing categories, DeviceModel names and Product identities untouched.

## Test Evidence
- Vitest focused: tests/tenant-catalog.test.ts, tests/catalog-compatibility.test.ts, tests/catalog-devices.test.ts.
- Result: 3 test files PASS; 25 tests PASS; exit code 0.
- Typecheck: see execution gate; must pass before promoting to release.
- Browser/admin UI and real DB e2e: not covered by focused tests.

## Remaining
- Safe Product-to-DeviceVariant identity mapping and update semantics.
- UI flow to select manufacturer/family/model/variant and compatible parts.
- Real DB end-to-end across two tenants.
- Full 7/7 +1 and owner release approval remain open.
