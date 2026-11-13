# A1 Mobi — pilot dashboard chart proportionality review (Thaghr, 2026-10-21)

Inspected authenticated dashboard and /admin source. `OperationBreakdownChart` on /ar and /en dashboard uses five explicit demo operations (sale 2, repair 2, top-up 1); this is not a live business KPI. `/admin` summary also uses demo fixtures and clearly labels Pilot Demo. No claim of production financial truth.

Changed the operation-breakdown visualization from horizontal tracks to vertical columns. Column heights are exact count/total percentages (40%, 40%, 20% in the current demo), not fake fixed minimum heights or rounded display figures. The labels continue to show exact operation count and rounded shares, with zero-height bars when count is zero. Responsive layout preserves three columns on mobile. Same source for Arabic and English.

Evidence: operation-breakdown-chart.test.ts: 6 PASS including hundreds of distributions, 0 counts, exact proportions and locale render assertions. TypeScript, focused ESLint, git diff --check PASS. Build/browser visual screenshot on newly built source not yet verified, so final UI visual gate remains pending. Do not deploy or merge without approval.
