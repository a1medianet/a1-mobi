# A1 Mobi C16 Pilot Customer Order Checkpoint

**20 October 2026 — Thaghr — UAT.**

The owner can activate a store link. A customer can select an available phone, submit a request, and receive a reference. The owner can view and confirm or decline the request. No purchase, invoice, or reserved stock is implied.

## Evidence

- Nine steps passed in a real-browser walkthrough on desktop and 390px phone.
- Nine regression tests passed across four suites.
- Production-mode build and TypeScript passed.
- The UAT database migration was applied only to the isolated test database.
- Access to customer requests requires management permission.
- Screenshots and machine-readable browser result are in this folder.

## Pending before release

- Better protection of public order forms before external deployment.
- Transition from confirmed order to existing POS and its selected physical IMEI.
- Real merchant product photography, consented messaging, final visual approval and full operational day test.
- Secure external pilot URL, release gate and owner approval.

The GitHub PR must remain Draft. No public deployment has been approved.
