# A1 Mobi — Repair section audit, 2026-11-13
Environment: **mobi.a1medianet.com — Hostinger Business Plan, NOT VPS**. Production version at review: `161decc` / `versions/01a1d421-2c1c-7039-a611-f770609a8d19`. No production transactions were created.

## Gate decision: NOT CLOSED — P0
Evidence:
- Connected browser tab `https://mobi.a1medianet.com/ar/repairs` displays: **"تعذّر تحميل بيانات الصيانة. تحقق من تسجيل الدخول ثم أعد المحاولة."** Despite this it also shows zero repair totals and empty orders. **Do not present zeros as actual totals on API failure.**
- Public unauthenticated GET `/api/ops/live-02` responded 404; the API has `enabled() => process.env.A1_MOBI_C_LIVE_02_ENABLED === "1"`. The configuration file examined did not contain the flag, but hPanel/process injection is a possible alternative. Diagnose the actual runtime setting, authenticated API access and DB schema before enabling.
- The browser captures provided this turn depict **A1 Count** navigation, not Mobi repairs; repair-specific visual observation came from the connected browser page text, not supplied screenshots.
- Existing focused tests: 22 pass, 1 DB integration test skipped. A test pass does not prove a live transaction or production API availability.
- Previous uncommitted local modifications already exist to `src/components/repair-live-operations.tsx`, `src/modules/repairs/repair-service.ts`, `src/app/api/ops/live-02/route.ts`, and repair tests. Do not reset, overwrite or stage them without independent review.

## Functional/visual findings
1. **P0 READ**: Fix live repair API availability/auth/schema; show truthful unavailable state; prevent posting while current state unknown. An unsaved intake must not appear committed.
2. **P1 UX**: Remove duplicate headings for intake and diagnosis and internal text; compact intake, case list, timeline and cash access. Verify RTL and mobile viewport with *actual screenshot* before closure.
3. **P0 CUSTOMER LINK**: Front-end intake submits customerName/Phone, not customerId. The service supports customerId; verify and implement customer lookup/select/create with tenant scoping.
4. **P0 DEVICE LINK**: Front-end intake submits IMEI but no serializedDeviceId. Service supports serializedDeviceId and device-trust gate. Ensure matching serial device history and repair ownership constraints.
5. **P1 INTAKE EVIDENCE**: Front-end submits accessories:[] regardless of accessories accepted by DB/service. Add received accessories, condition evidence/photos, agreed intake document, and return check.
6. **P0 STOCK PARTS**: `addRepairPart` exists in service but live-02 API/UI does not expose a complete inventory-part consumption path. Validate branch/stock/price/serial and audit.
7. **P0 FINANCE**: Repair payment path currently posts USD only (rate=1); link to A1 Currency quote/snapshot before supporting LBP and other currencies. Preserve payment/cash double-entry reconciliation, strict permissions and idempotency.
8. **P1 TECHNICIAN**: API `start` implicitly assigns current actor as technician; provide permitted technician assignment or explicit "self" action.
9. **P1 STATUS/APPROVAL**: Review signed approval evidence, decline/reestimate, cancellation, rework from READY, and permissions per transition. Test concurrency and audit trail.
10. **P1 WARRANTY**: Delivery service creates warranty and status in a transaction and requires payment/pickup. Test actual printable client receipt and warranty display.
11. **P0 HISTORY/SEARCH**: Confirm paginated search across customer, ticket, IMEI; filter/branch isolation in live browser.
12. **P1 TRANSLATION**: Verify every AR/EN label, icon, form error and status code; local dirty changes are not necessarily deployed.

## End-to-end acceptance
- Authenticated manager and employee with appropriate permissions, real tenant+branch, no injected dummy records.
- Check status of list in actual browser and server logs; validate empty/unavailable separation and no fake balances.
- Create authorized repair intake for a real consenting customer, verify linked customer and IMEI record.
- Diagnose → estimate → documented approval → assign technician → consume tracked parts → mark READY → settle in allowed currencies → deliver → warranty.
- Re-open same ticket and verify immutable trail, receipts, stock changes, cash ledger and reports; test bad input, duplicate submission, wrong branch, missing permission.
- Validate desktop and mobile screenshots, keyboard navigation and RTL; EN parity. Save evidence/rollback before closing Stage Gate.

**Current status**: Repair API and full journey unresolved. Do NOT mark repaired, production-ready or visually accepted based solely on code/test inspection.
