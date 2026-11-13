# Mobi Reports — comparison date-boundary regression checkpoint (2026-10-21)

Device: Thaghr. Base: 6bbc301. Gate: comparison source dates.
Added regression tests covering each enabled rolling duration (1, 7, 30, 365 days), confirming identical inclusive-from/exclusive-to filter bounds for branch-and-tenant-scoped sales and posted returns. Added invalid-duration checks for 0, negative, fraction, over-limit and NaN; each must reject before database access.
Scoped Vitest: 14/14 PASS. Scope: tests only; no app source modification or production release.
Limitations: rolling UTC durations are not branch-local calendar periods; new report UI and sign-in still require clean build and human-reviewed screenshot after Prisma DLL lock issue.
