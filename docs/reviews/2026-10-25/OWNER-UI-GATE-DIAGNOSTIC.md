# A1 Mobi — Owner UI closure gate diagnostic (2026-10-25)

Machine: Thaghr. Local database only, `127.0.0.1:5437`; no production deployment.

## Root-cause fix

`closure-browser-gate.mjs` started Next dev without `--webpack`. The Windows native SWC binding reports `not a valid Win32 application`, causing two runs to time out before `/en/login` became ready (one at 64s, one at 156s). The script is now aligned with the already successful Gate 71 harness: `next dev --webpack`. Cold-start readiness wait was bounded but widened to 300 attempts for slow WASM fallback. **The harness file itself pre-existed as an untracked local worktree file; its exact edit remains local and was deliberately not staged for GitHub without reconciling existing user-owned work.** Manual diagnostic `next dev --webpack --port 3244` reported Ready in 2.2s; that owned test listener was terminated after diagnosis.

## Third closure attempt after fix

Evidence `docs/reviews/2026-10-23/owner-ui-1792965722245/results.json` and `browser-trace.json`:

- PASS local database preflight.
- PASS local dev server.
- PASS real synthetic tenant bootstrap, login, HttpOnly auth, permissions/isolation.
- PASS HTTP stock receive/sale/return/count and idempotency/audits.
- BLOCKED_OR_FAILED `authenticated-browser-journey`: Chrome DevTools Protocol `Runtime.evaluate` timed out. Last recorded trace call is `Runtime.evaluate` with status `TIMEOUT`, not a specific UI business assertion; browser failure must not be labeled product PASS. Script exit 1. Synthetic fixture owner sessions are revoked during teardown.

The previous `gate71-local-e2e.mjs` did independently pass 12/12 stages on the same device and database, including real Chrome login, sales and barcode-label PDF rendering. It is distinct evidence and does **not** prove the broader `closure-browser-gate.mjs` acceptance path.

## Next targeted action

Record exact page and `Runtime.evaluate` wait diagnostic in the owner-UI harness without collecting credentials. Separate UI assertion failure from CDP response starvation, and retry only after the local Chrome/headless session is demonstrably stable. Then manually sign off mobile/desktop AR/EN owner UI, followed by physical scanner/printer and business-owner UAT. Do not deploy or mark 7/7+1 closed before this.
