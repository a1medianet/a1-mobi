# Stage 2 Catalog Devices Inventory

Status: Implementation complete pending Gate
Authority: A1 Mobi Master Implementation Brief v1.0

## Implemented
- Tenant-scoped categories, products, parts and accessories
- External and internal barcodes
- Manufacturer, family, model and variant hierarchy
- IMEI and serial tracked devices
- Manual part compatibility with source and confidence
- Suppliers, purchases and purchase lines
- Stock locations and append-only movements
- Stock counts, variances and mandatory reasons
- Low-stock threshold evaluation
- Idempotency keys on stock movements
- Audited serialized-device receipt service

## Invariants
- Serialized movement quantity is exactly one
- IMEI passes a Luhn check and is unique per Tenant
- Barcode uniqueness is Tenant-scoped
- Cross-Tenant inventory operations are rejected
- Adjustments and count variances require a reason
- Purchase serialized count must equal received quantity

## Gate
PASS requires database migration, integration tests, lint and production build.
Stage 3 Sell must not begin until this Gate passes.