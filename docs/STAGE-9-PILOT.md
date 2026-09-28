# Stage 9 — Pilot Gate

## Software evidence

| Acceptance scenario | Automated evidence |
|---|---|
| Stock entry and serialized IMEI purchase | inventory-db.test.ts |
| Barcode/IMEI sale, mixed USD/LBP, invoice | sell-db.test.ts |
| Return/exchange workflow | sell-db.test.ts |
| Repair intake to delivery, parts and profit | repair-db.test.ts |
| Debt charge and partial repayments | customer-debt-db.test.ts |
| Top-up and provider settlement | topup-db.test.ts |
| Cash close and documented variance | cash-db.test.ts |
| Seller cannot view cost/profit | foundation.test.ts |
| Sensitive actions audited | domain DB integration tests |
| Reports reconciled from source records | reports-db.test.ts |
| Keyboard-wedge scanner parsing | pilot.test.ts |
| 80mm print document generation | pilot.test.ts |

## One-Click Gate

The gate remains **BLOCKED** until these physical evidences are recorded:

- Physical barcode/IMEI scan on the store workstation.
- Printed receipt verified on the target thermal printer.
- One complete real-store operating day and close signed by the owner.

This is a mandatory operational gate, not optional MVP scope. Automated tests cannot replace it.

## Execution

Run `npm run gate:pilot` with the configured PostgreSQL database. Record each physical result in the pilot evidence file using a timestamp, operator, device model, and evidence reference.
