# A1 Mobi — Gate 6/7 Owner Journey Acceptance (Thaghr)

Date: 2026-10-26. Scope: local test against PostgreSQL 127.0.0.1:5437 and Chrome on Thaghr only. No production deployment, merge, or customer data mutation.

## Outcome

**Automated owner journey PASS (21/21 checks, exit 0)**. Exact generated evidence: `gate6-owner-ui-1792989681792/results.json`, Chrome protocol trace, screen captures and AR/EN print PDFs. This certifies the **tested owner operating path**, not a claim that every possible screen or device was visually inspected.

### Verified real operations

- Actual owner form login, HttpOnly cookie, session permission checks, unauthorized request rejection, tenant-scoped catalog.
- Inventory receive, barcode keyboard EAN entry, real POS sale invoice, customer return with reason, stock count and persisted audited movements. Idempotency replay, stale count and foreign-origin restrictions exercised.
- Barcode label PDFs: 3 pages at 80×40mm for Arabic and English, CSS and overflow assertions. Hardware printing and USB scanner intentionally deferred until client pilot.
- Storeowner product catalog create/edit/archive and audit, storefront publish, customer basket and submitted order, owner acknowledgment, storefront pause and 404 behavior; stock remained unchanged by online inquiry.
- Opening cash drawer from the owner interface and persisted session/audit; **full end-of-day cash settlement was not part of this browser path**.
- Repair workflow intake and diagnosis links open the intended panels.
- POS interface RTL/LTR at 390px and 1440px (four combinations), expanded/collapsed sidebar without horizontal overflow, with screenshots.
- Reports: day/month labels, chart two-series comparison and Arabic numerals handling; owner role localization and safe missing-billing state.
- No uncaught Chrome JavaScript exceptions.

### Evidence and caveats

First browser attempt exited on a 30s Chrome DevTools navigation timeout at the storefront, and the second on a 30s condition timeout while loading labels. A **separate** `scripts/gate6-owner-browser-uat.mjs` increased local test startup/navigation/condition tolerances without changing app business logic; final third run passed all checks. Earlier failed runs remain unmodified and were not re-labeled PASS.

The full visual review of every administrative route, accessible keyboard interactions, actual cash drawer closing/reconciliation, external configured billing, and physical barcode/label hardware are **not established by this 21-check run**. The hardware-specific tests remain deferred by explicit owner decision to live client pilot. Do not claim total product/release approval based on this report.

Previous owner QA screenshot sets exist under `docs/reviews/2026-10-21/qa-3226-resume-full/` but were not independently accepted in this run. Phase **6/7 core operational journey PASS; complete all-screen visual sign-off remains OPEN** until a broader route-by-route review.

## Commit boundaries

Only the new gate6 browser harness, this report and its PASS evidence should be committed. Preserve existing dirty user edits and all unrelated untracked reports and artifacts. Next: route-by-route owner visual acceptance, then Gate 7/7 backup and restore. Competitor research follows 7/7.
