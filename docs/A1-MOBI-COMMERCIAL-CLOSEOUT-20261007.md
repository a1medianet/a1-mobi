# A1 Mobi — Commercial Closeout Manifest

**Date:** 2026-10-07  
**Branch:** `closeout/pilot-visual-production-20261007`  
**Target:** `feat/operational-ui-shell`  
**Status:** ENGINEERING COMPLETE + VISUAL EVIDENCE PASS — OWNER USAGE UAT / PRODUCTION BINDING PENDING

## Product promise

A1 Mobi is a bilingual mobile-retail and repair operating system. The closeout candidate must be useful before the customer enters administration and must never present an empty demo.

## Commercial Product Experience Shell

- [x] Public AR/EN product landing
- [x] Clear value proposition and feature explanation
- [x] Populated product/demo experience
- [x] Plans & entitlement explanation
- [x] 7-day trial signup journey
- [x] Organization → Tenant → Branch → Owner provisioning contract
- [x] Sign-in path
- [x] Account Center
- [x] Branch management
- [x] Team/RBAC surfaces
- [x] Help Center
- [x] Security & Trust
- [x] Privacy
- [x] Pilot terms
- [x] Product status / version / integration readiness
- [x] A1 Billing Core client contract
- [x] A1 Assist integration hook
- [x] A1 Pulse integration hook
- [x] A1 Shared Services Integration Contract

## Populated pilot — non-empty requirement

The demo must remain populated and credible. Automated tests protect this requirement.

Current sample inventory includes:
- real-world phone models,
- accessories,
- repair parts,
- SKU/barcode identifiers,
- prices and stock levels,
- serialized inventory,
- sample customers,
- repair orders,
- top-up operations,
- cash movements,
- inventory movements,
- operational transactions,
- sample staff roles.

No production customer record is represented by this sample dataset.

## Operational workspaces

- [x] Dashboard
- [x] Point of Sale
- [x] Product catalog
- [x] Inventory & serialized devices
- [x] Repair
- [x] Customers / debt
- [x] Cash / currencies
- [x] Top-up
- [x] Device Trust / IMEI
- [x] Reports
- [x] Admin overview
- [x] Team & access
- [x] Account & subscription
- [x] AR / EN
- [x] RTL / LTR
- [x] Desktop and mobile layouts

## Security / Foundation baseline

- [x] Argon2 password handling
- [x] server-side sessions
- [x] tenant/branch context
- [x] RBAC
- [x] team administration
- [x] MFA/TOTP
- [x] recovery codes
- [x] account recovery
- [x] session/recovery abuse controls
- [x] same-origin mutation guards
- [x] audit/logging foundations
- [x] health/version surfaces
- [x] secrets remain environment-bound
- [x] subscription/entitlement dependency is fail-closed for protected commercial operations

## GitHub release evidence

Required before merge:
- [x] GitHub CI PASS on exact closeout HEAD
- [x] Production build PASS
- [x] Runtime dependency audit PASS at configured threshold
- [x] SBOM artifact generated
- [x] Product + Pilot Visual Evidence workflow PASS
- [x] Screenshot artifact generated from production build

## Manual-only remaining gate

After the automated evidence above passes, the intended remaining work is intentionally narrow:

1. Visual review of generated screenshots:
   - AR/EN landing
   - mobile landing
   - demo
   - pricing
   - signup desktop/mobile
   - Help / Security / Status
   - dashboard
   - products
   - POS
   - admin
   - mobile operations
2. Short manual usage walkthrough:
   - visitor → demo,
   - visitor → trial,
   - login,
   - POS/cart interaction,
   - products/inventory,
   - repair,
   - account/team/security,
   - branch limit behavior with Billing Core configured.
3. Production environment binding:
   - A1 Billing Core URL/token,
   - A1 Pulse endpoints/token,
   - A1 Assist endpoint/token,
   - database/secrets,
   - domain and deployment configuration.
4. Final A1 Application Foundation Production/Public gate.

No new feature scope is allowed inside this closeout unless a P0/P1 defect is found during visual/usage UAT.

## Release statement

When GitHub CI and Visual Evidence are green, A1 Mobi may be described as:

> **Engineering-complete commercial pilot candidate.**

It must **not** be described as Production/Public PASS until the final environment-bound Application Foundation evidence gate and manual visual/usage UAT pass.

## 2026-10-08 Acceptance update

- Exact closeout head CI: PASS.
- Production dependency audit: PASS after transitive dependency remediation.
- Production build: PASS.
- SBOM: generated.
- Product & Pilot Visual Evidence: PASS.
- Generated desktop/mobile AR/EN evidence was manually reviewed at engineering closeout level; no visual P0/P1 blocker was found.
- Commercial closeout PR #6 was merged into the canonical product branch.

**Decision:** A1 Mobi is accepted as an **engineering-complete, visually review-ready commercial pilot candidate**. Remaining work is limited to owner usage UAT and production environment binding/final public-release gate.
