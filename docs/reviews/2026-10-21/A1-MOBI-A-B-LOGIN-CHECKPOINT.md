# A1 Mobi — Owner feedback checkpoint, 2026-10-21

Device: Thaghr only. Repository: a1medianet/a1-mobi. Branch: feat/mobi-abc-continue-20261013. No production deployment or merge.

## Implemented
- Login AR/EN exposes its form immediately instead of waiting indefinitely for /api/auth/session. 3s session-check and 12s sign-in deadlines; failed session lookup is never treated as authentication. MFA/server authorization unchanged.
- Official A1 Mobi horizontal logo on the auth header; physically left in both languages. A page duplicate CTA removed, balanced cards and footer, RTL/LTR arrow direction adjusted.
- Pricing rewritten for customers in AR/EN. Distinct contact mailto subjects for single store and multiple branches, no fabricated subscription prices.
- Guided demo cards and KPI grid balanced; sample records and limitations retained as honest examples.
- TechZone storefront customer wording, product and repair imagery framing, FAQ/contact layout, compact dismissable mobile basket, and footer A1 Media Network; no invented live order/payment workflow.

## Verified
- PASS: Vitest 8 files, 34 tests.
- PASS: TypeScript --noEmit --incremental false.
- PASS: ESLint 0 errors (one pre-existing no-img-element warning).
- PASS: git diff --check.
- PASS: AR and EN login/home/pricing/demo/signup routes, B store-preview and SVG logo HTTP 200 on bounded retries; session API HTTP 401 without credentials. SSR login HTML contains form/password/logo.
- Initial local dev cold-compile page timeouts were seen; passing retries do not eliminate this performance issue.

## Pending
Actual browser hydration, interactive authenticated login and MFA tests, and responsive screenshot review remain unverified. Browser-origin access permission was declined; no workaround attempted. Emails were not sent. C admin journey to be inspected with user after successful sign-in. Product imagery rights, foundation gates and production release remain pending.

Gate: code/static/HTTP checkpoint PASS; user interactive UAT NOT PASSED; production NOT APPROVED.