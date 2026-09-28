# Device Trust Network

## Decision

Every physical device entering a store workflow must complete an IMEI trust check before the operation continues. This includes purchase, trade-in, stock-in, sale, return, repair, present-device top-up, data transfer, and setup.

Remote top-up without a physical device is recorded as Device Not Present.

## Privacy and enforcement

- IMEI values are stored as SHA-256 hashes with only the last four digits visible.
- Store-only reports do not cross tenant boundaries.
- Network reports can match checks in another tenant.
- Active verified lost or stolen matches block the workflow.
- Disputed or pending evidence creates a review result.
- An override requires the device-trust.override permission, a documented reason, and audit before/after.
- Owner contact data is referenced, not exposed through match results.

## Gate

Automated domain and integration tests may pass. Public network activation remains blocked until Legal and Privacy Gate, physical store UAT, scanner verification, printer verification, and full-day close evidence pass.
