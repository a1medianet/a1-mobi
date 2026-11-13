# C-LIVE-02 — Authenticated Preview Return Gate

Date: 2026-10-17
Node: Thaghr; only local root C:\A1Hub\a1-mobi and canonical GitHub a1medianet/a1-mobi.
Branch: feat/mobi-abc-continue-20261013, PR #12 Draft.

## Screenshot assessment
User screenshot at 127.0.0.1:3198/ar/login was a real 307 redirect from /ar/live-02 by the Next.js auth proxy. It was NOT the repairs UI; unverified/new dev-session cookie is not accepted by the protected page. 3197 is production-mode local build (secure __Host cookie), 3198 is dev-mode (different cookie name), so same browser does not imply shared session.

## Change
- Keep fail-closed auth; no anonymous read of owner/repair data.
- Preserve original requested protected path using a **server-generated path-only** login next parameter, no arbitrary URL.
- After real login success, redirect within the same locale to the previously requested protected page.
- Existing authenticated login screen's Open Preview link uses same protected return path.
- Sanitizer rejects cross-origin, cross-locale, query strings, fragments, login/recover loops, traversal and malformed paths.
- No plaintext credentials, test session tokens, API keys, migrations, or customer data committed.

## Tests / gates
- Unit: tests/safe-return-path.test.ts (3 cases).
- Local HTTP: /ar/live-02 without a valid session yields 307 Location /ar/login?next=%2Far%2Flive-02. /ar/login is 200.
- Focused lint + TypeScript, GitHub CI: update based on actual outputs before claiming PASS.
- Authenticated browser successful login/automatic return is pending manual confirmation; no authorization bypass.
- Preview remains TEST/UAT; no PR merge or public release.

## How to inspect
Open http://127.0.0.1:3198/ar/live-02 ; sign in with the legitimate isolated UAT Store ID, email, password (and MFA if required). After sign-in, return to /ar/live-02. Do not send passwords in ChatGPT or GitHub.
## Local UAT verification
- Protected /ar/live-02 redirects to /ar/login?next=%2Far%2Flive-02 with HTTP 307 without session.
- Verified legitimate local TechZone UAT owner credentials from gitignored .local/techzone-owner-login.txt returned login HTTP 200 and authenticated repair page HTTP 200. No secret values printed or committed.
- The first CI run on 31df7b1 failed because bc-http-smoke.mjs had an old exact login-location check. Updated that smoke to require the login pathname AND the safe requested return path; rerun in CI required.
