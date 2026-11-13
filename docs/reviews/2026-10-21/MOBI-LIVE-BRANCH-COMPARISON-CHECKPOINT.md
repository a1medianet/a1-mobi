# A1 Mobi — First live branch comparison implementation (2026-10-21)

Host: Thaghr only. Branch: feat/mobi-abc-continue-20261013. No production deployment or PR merge.

Implemented a compact comparison panel in the existing permission-gated branch reports view. It uses the existing tenant+branch-scoped reporting service and exposes Day (1 day), Week (7 days), Month (rolling 30 days), and Year (rolling 365 days), comparing equal-duration adjacent windows. Current and previous values are both net recorded sales after posted returns, displayed as USD and an absolute difference plus a percentage only when previous positive. The two comparison bars scale with one common max and have no artificially raised zero bar. Date windows remain UTC rolling durations, not yet branch-timezone aligned calendar periods.

Evidence: TypeScript PASS; five branch report gate tests PASS; real PostgreSQL tenant/branch isolation test 1 PASS; focused ESLint PASS; diff check PASS. New interface has NOT had a fresh complete production build or visual Chrome UAT. This is a source-level candidate and must not be labeled released. Existing server previews may still serve older code.

Remaining: branch timezone calendar days/months, explicit posted-return semantics at boundaries, source reconciliations by series and currency, responsive screenshot review, full Foundation prelaunch and owner approval.
