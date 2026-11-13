# A1 Mobi — CANONICAL-POS-INVENTORY-UI-GATE-12

Date: 2026-10-18
Device: **Thaghr only** — `C:\A1Hub\a1-mobi`
Repository: `a1medianet/a1-mobi`
Branch: `feat/mobi-abc-continue-20261013` | PR #12 remains **Draft / unmerged**
Method: A1 First / NAWA Way / One-Click Stage Gate / Evidence First

## Screenshots received and the real defects

The owner-provided screenshots of `/ar/pos` and `/ar/inventory` revealed large unused horizontal space, forms restricted to only one or two of three preallocated columns, and zero real devices or invoices in the authenticated synthetic store. Prior browser tests only proved correct routing, not customer-ready layout or an end-to-end state in the displayed store.

## Scoped changes

- Keep the existing authenticated, tenant-scoped `LiveOperationsPage`, database services and `A1_MOBI_C_LIVE_01_ENABLED=1` UAT gate. Do not build parallel POS or Inventory code.
- Set mode-specific `mobi-live01-pos` and `mobi-live01-inventory` CSS layouts, with two evenly sized workspace panels for the POS and two full-width inventory forms. Keep the former combined `/live-01` test alias supported.
- Optimize mobile layout, with one-column main forms below 700 px and no horizontal page overflow.
- After a successful product registration, preselect the newly created product, variant and branch stock location in the IMEI receipt form; after a successful sale, clear the selected device; after intake, clear the scanned IMEI field.
- Translate known persisted inventory and invoice state names in the UI (`IN_STOCK`, `SOLD`, `COMPLETED`, `CANCELLED`, `RETURNED`), leaving unknown status values unchanged. No database mutations occur for formatting.
- Preserve the clear test-environment warning. No production flag, domain, permissions, schema, stock or payment service changes.

## Safe UAT transaction evidence

- Local environment guard required `postgresql://127.0.0.1:5438/mobi_uat`, enabled UAT feature flag, and a locally authenticated **synthetic** tenant identifier matching `journey-[0-9]+`.
- Using actual first-party `/api/ops/live-01` HTTP operations against **only that isolated synthetic store**, created sample SKU `A1UAT-C12-SAMPLE`, received two generated 15-digit IMEI test devices, sold one for USD 240 and verified a persisted invoice. One unsold IMEI device remains available for owner UI inspection.
- Result: sample products=1, available=1, sold=1, invoices=1. No actual customer transaction, live financial balance, real mailbox, or production database was used.
- Script `c-live-01-uat-demo-flow-12.mjs` is guarded, idempotent for existing sample SKU and reads private local login credentials **without emitting/committing them**.
- The HTTP smoke script tests the business lifecycle; the browser visual script **does not post any new sales**.

## Visual evidence

The reproducible read-only authenticated browser regression `c-pos-inventory-layout-12-browser.mjs` checked four canonical routes:
- Arabic desktop `/ar/pos`: **PASS**, owner workspace width 1117px, both panels 549px; 1 invoice and 1 available IMEI.
- Arabic desktop `/ar/inventory`: **PASS**, workspace 1117px, intake and registration forms 550px each; 1 product and 1 available IMEI.
- English mobile `/en/pos`: **PASS**, 347px panel widths in a 390px viewport, source-backed metrics nonzero.
- English mobile `/en/inventory`: **PASS**, forms 347px across mobile width, source-backed metrics nonzero.
- All four navigation routes used authenticated first-party API HTTP 200, no raw demo table, and **no horizontal overflow**.
- Saved screenshots:
  - `c-canonical-12-ar-pos-1440.png`
  - `c-canonical-12-ar-inventory-1440.png`
  - `c-canonical-12-en-pos-390.png`
  - `c-canonical-12-en-inventory-390.png`

## Explicitly unresolved

- Local explicitly guarded PostgreSQL regression suite: **150/150 tests PASS, 54/54 files PASS, 0 skipped, 0 failed**. TypeScript `npx tsc --noEmit`, focused ESLint and `git diff --check` **PASS**, exit 0. GitHub CI/Visual Evidence must be checked on the new pushed commit.
- The POS still supports one serialized IMEI device paid in USD in this UAT path, not the richer multi-item/multi-currency customer checkout experience. It is not fully finished.
- Real refunds/returns settlement, warranty claim processing, remaining customer/cash/report owner screens, A/B journeys, new independent Claude visual review, HTTPS authenticated recovery and Foundation/Pre-Launch gates remain **HOLD**.
- No merge, no auto-deployment, no live Hostinger release, no source-control secrets.

**Stage decision:** UI layout and synthetic transactional UAT subgate only. Do not represent ABC as FINISHED.
