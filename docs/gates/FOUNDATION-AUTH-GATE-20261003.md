# A1 Mobi — Foundation Authentication Lifecycle Gate

Date: 2026-10-03
Branch: feat/foundation-auth-20261003
Baseline: 2b68776ba960dcfdccdba877d52429a1192fccc2

## Gate scope

This PASS applies only to the persisted authentication lifecycle checkpoint. It does not mark the complete Foundation stage as PASS.

Covered here:
- tenant-scoped Argon2 password login
- opaque hashed 8-hour sessions
- persisted logout revocation and audit
- DB-backed login-attempt budget
- request body, JSON, origin and cookie protections
- Arabic/English store account UI
- session endpoint and branch/tenant session resolution

## Evidence

- Test suite: 68/68 tests PASS across 26/26 files with database tests enabled.
- ESLint: PASS.
- TypeScript: PASS.
- Optimized production build: PASS.
- HTTP smoke: login lifecycle, origin rejection, Secure/HttpOnly cookie attributes and server revocation PASS.
- Real browser gate on local production preview:
  - successful form login PASS
  - persisted session check PASS
  - logout PASS
  - invalid-login feedback PASS
  - temporary fixture cleanup PASS
- Visual QA:
  - Arabic desktop PASS
  - Arabic 390px mobile PASS
  - English 390px mobile PASS
  - no horizontal overflow observed
  - RTL/LTR layout PASS
- Claude visual review: VISUAL_GATE_PASS with no concrete blockers for this narrow checkpoint.
- Claude source review: PASS for the narrow authentication lifecycle gate.
- Gemini review was unavailable because the client returned UNSUPPORTED_CLIENT; no Gemini review is claimed.

## Gate verdict

PASS — Foundation Authentication Lifecycle checkpoint.

## Foundation remains open

The following are explicitly outside this PASS and remain required before full Foundation PASS:
- account provisioning and lifecycle administration
- recovery / reset flows and MFA policy
- full route-level authorization coverage
- dependency remediation
- global abuse controls and AuthAttempt retention/cleanup policy
- backup/restore verification
- health, logging, monitoring and CI operational checks

Operational dashboard/POS data is still sample data; six generic operational modules remain placeholders; IMEI UI remains format-only. Tauri and production deployment are not complete. Stage 9 physical pilot remains BLOCKED until the applicable gates pass.
