# Stage 3 — Sell / POS

## Delivered
- Barcode/IMEI-ready cart rules.
- Base and minimum price guard with server-side permission lookup.
- Immutable override actor, delta context, and reason.
- USD/LBP mixed payments with per-payment historical FX snapshot.
- Partial payment and outstanding balance classification.
- Transactional checkout with serial/non-serial stock validation.
- Invoice snapshot, stock-out movement, IMEI SOLD status, and audit event.
- Idempotent checkout.
- Transactional returns with stock-in movement, IMEI RETURNED status, refund amount, and audit.
- Exchange link between the posted return and replacement sale.

## Gate
Prisma validate, migration, lint, unit/integration tests, and production build must all pass before commit.
