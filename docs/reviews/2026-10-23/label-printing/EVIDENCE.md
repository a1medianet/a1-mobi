# Gate 7/1 label printing — local decision and evidence

Discovery/inspection PASS: reviewed AGENTS.md, local axis-1 status, barcode/POS evidence, scanner normalization/checksum utility, tenant-scoped live-01 GET and inventory UI. Thaghr / requested branch confirmed. No installed renderer found; npm registry access is denied by the environment. Decision: small dependency-free EAN-13 and Code128-B encoder, verified by independent decoding tests; reuse authenticated inventory.read catalog payload without adding a broader data endpoint. Scope: current first 100 active tenant products, no catalog mutation.

Plan PASS: printable SVG with quiet zones, exact human-readable identifier, AR/EN product name, quantity 1–100, isolated 80×40mm label pages, explicit print button. Prefer valid EAN-13, otherwise registered Code128-compatible identifier/SKU. Never silently repair checksum or invent identifiers. Reject unsupported or overlong identifiers to preserve module size. Value: reproducible local labels from authorized records. Deferred: printer calibration, hardware acceptance, large-catalog search and configurable media. Innovation: future calibrated printer/media profiles. No external superiority claims. No release or overall Gate 7/1 PASS.

## Implementation and source ledger

- src/modules/catalog/label-barcode.ts: standard EAN left/odd/even/right patterns, leading-digit parity, modulo-10 checksum validation reused from pilot scanner; Code128-B start 104, position-weighted modulo-103 checksum and stop 106. Code128 restricted to the scanner-supported identifier alphabet and 2–20 characters so 74mm bars including quiet zones retain >=0.269mm modules. EAN keeps 11 left / 7 right quiet modules; Code128 keeps 10 on each side. Invalid EAN is never corrected; selection tries another registered identifier then existing SKU.
- src/components/barcode-label-panel.tsx / barcode-labels.css: authenticated loaded catalog selection, keyboard-wedge Enter selection, exact LTR identifier text, localized name, bounded quantity, SVG preview and body portal for isolated print pages. window.print opens the normal browser print flow; this is not a printer driver. Inventory/live-01 integration only; no price/cost on labels and no stock mutation.
- Existing live-01 GET remains authority: inventory.read, active tenant products, no-store response, current first-100 limit. Authorization tests use route mocks, not real sessions or PostgreSQL.
- Source comparison: existing scanner normalizes input and validates EAN but does not render labels; existing POS resolves exact identifiers. Reused those semantics. Package/lock files unchanged after denied package-install attempts. No new external competitor or standards-certification claim. Standalone Charter and Master Brief were not re-extracted in this slice; existing local decision/evidence documents supplied the gate context.

## Validation boundaries

Encoder tests independently decode EAN bars, parity and guard patterns for four published-style fixtures; Code128 fixture decoder checks start, stop, symbol data and weighted checksum, then passes decoded text plus CR/LF through existing cart lookup. Additional golden ABC pattern, invalid checksum/input, fallback and quantity tests. These are software decoder/scanner simulations, not camera/laser/USB hardware tests. Static print-CSS assertions cover page size, app isolation, page breaks and SVG dimensions; they are not browser layout assertions.

Environment attempts: Docker API access denied. Direct loopback Prisma probe at the documented compose port 5437 failed with PrismaClientInitializationError. Existing HTTP ports 3000/3100/3226 were unreachable from shell. Started local Next dev on 127.0.0.1:3237 successfully; browser automation navigation to /en/inventory timed out and reset its kernel. Dev server stopped afterwards. No authenticated HTTP/browser E2E, browser keyboard-input simulation, print preview, PDF, actual printer or actual scanner PASS is claimed. No production, Assist, secret files, migrations, commit/push/merge/deploy. Next dev temporarily added its agent-rules block to AGENTS.md; removed that generated addition, restoring original content. Pre-existing tsconfig, stock-count changes and QA assets retained.

## Remaining acceptance checklist (Gate 7/1 stays OPEN)

1. With local DB accessible and live pilot enabled, sign in as Owner; open /en/inventory then /ar/inventory. Confirm only the authorized tenant catalog loads; test a reader without inventory.read and a second tenant.
2. Use browser automation keyboard events to type a known EAN and SKU followed by Enter. Check selected product, exact human-readable code, unknown/ambiguous rejection, quantities 1/3/100 and invalid 0/101/fraction; repeat AR/EN. This browser step remains unexecuted here.
3. Open print preview in both languages: choose 80×40mm stock, 100% actual size, no browser headers/footers, no margins; confirm requested page count, no navigation/forms, no clipped bars or human-readable code, and a single label per page. Check computed print CSS and save PDF evidence. This browser step remains unexecuted here.
4. Physical hardware: calibrate actual printer to 80×40mm media, print one EAN and one Code128 at native DPI without scaling, inspect quiet zones and contrast, then scan each physical label with the actual keyboard-wedge scanner into selection and the appropriate store workflow. Verify exact text and quantity accumulation. Serialized products still require IMEI checkout; product labels do not identify individual devices.
5. Print 3 labels and verify feed alignment, no skipped stock, first/last label readability, Arabic name rendering; document printer/scanner model, DPI, media and operator results. Obtain owner acceptance. No hardware success recorded.

## Final local checks

- Focused Vitest: 8 files / 63 tests PASS (label-barcode, label-catalog-scope, label-print-css, scanner-input, pos-scan-cart, c-live-01-sell-bulk, catalog-devices, pilot). No DB tests in this run.
- npm run lint PASS: zero errors; one existing next/no-img-element warning at src/app/[locale]/page.tsx:121. Targeted new-file ESLint also PASS.
- npx tsc --noEmit: earlier completed run PASS; final post-check rerun recorded below when complete.
- git diff --check PASS. Package/lock and AGENTS.md have no diff. Existing unrelated dirty files retained.
- HEAD advanced externally during this worker to 833675a (label implementation). This worker invoked no commit/push/merge/deploy; final encoder sizing and evidence refinements remain working-tree changes for orchestrator review.
- Software slice checks PASS; browser/HTTP authenticated integration and physical hardware remain unverified. Overall Gate 7/1 remains OPEN.

Final post-check npx tsc --noEmit rerun PASS (exit 0).
