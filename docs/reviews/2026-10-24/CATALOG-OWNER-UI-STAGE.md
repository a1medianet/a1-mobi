# A1 Mobi — 7+1 Catalog Owner UI Stage (2026-10-25)

Previous gate: e930cff, catalog PART-to-DeviceVariant API, 25 focused tests and TypeScript PASS.

## Scope
- Add a bilingual part compatibility editor to the existing live catalog management page.
- List device variants tenant-scoped and show manufacturer, family, model, variant.
- Select a PART product, view its current compatibility links, and link/unlink variants.
- Server verifies tenant ownership of both related records, manager RBAC and before/after audit.
- Preserve archived records, inventory identity, and pre-existing unrelated changes.

## Tradeoffs and rejected choices
- Do not rename shared DeviceModel or DeviceVariant on Product updates: Product does not own a direct model/variant reference; doing so would affect other products/serialized stock.
- No automatic compatibility inference or broad matching from model names.
- The editor uses explicit manual links; further live multi-tenant DB and visual/browser acceptance are required.

## Evidence
- Focused tests: catalog-compatibility and tenant-catalog.
- TypeScript static check.
- No production deployment. Gate remains pending actual tenant DB and browser owner journey.
