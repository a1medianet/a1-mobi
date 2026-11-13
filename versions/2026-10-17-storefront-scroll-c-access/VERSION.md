# A1 Mobi — Merchant Storefront Scroll & Owner Demo
Version label: `ABC-MERCHANT-SCROLL-2026-10-17`
Canonical workspace: `C:\A1Hub\a1-mobi` (Thaghr only)
Repository: `a1medianet/a1-mobi`
Branch: `feat/mobi-abc-continue-20261013`; PR #12 (Draft).
Baseline before this change: `5be9cdf99c121f64cae466c148159b8546510f5d`.
Release: **HOLD (not production / not merged)**.

## Decision
A = A1 Mobi SaaS product landing (`/product/ar`, `/product/en`).
B = real *scrollable merchant website* at `/store-preview`, no single-screen constraint.
C = protected owner/admin workplace at `/ar`, `/ar/admin` etc., requiring real login and RBAC.

## B implementation
- Removed 1440x900 desktop height lock and explicitly allowed vertical scrolling.
- Expanded sample catalog from 4 to 8 demo products, with a working search and illustrative basket.
- Added repair intake/diagnosis/estimate/delivery timeline (NOT a booking claim).
- Added independent store story, merchant value propositions, FAQs, contact/location, and multi-column footer.
- New responsive layout for desktop/mobile and AR/EN language toggle.
- Contact/WhatsApp/checkout/bookings remain disabled unless a real merchant configures the necessary service.
- Updated the browser QA gate to REQUIRE full merchant scroll and all sections.

## Local test-only C environment
- New isolated Docker PostgreSQL container `a1-mobi-techzone-uat-20261017`, loopback port `5438`.
- Data stays under `C:\A1Hub\a1-mobi\.local\postgres-techzone-uat`.
- Local-only `.env.local` and `.local\techzone-owner-login.txt` are **gitignored** and MUST NOT be committed.
- Test DB `mobi_uat` had all 13 Prisma migrations applied successfully.
- **Owner account status:** NOT VERIFIED / NOT BOOTSTRAPPED. The locally generated credentials file alone does not establish that an account exists; never claim the login works until authenticated API/session/role checks pass.
- Do not change any existing non-Mobi container or database. This UAT is NOT production.

## Gates and evidence
- TypeScript: PASS after Prisma generation.
- ESLint: PASS with pre-existing warning about a non-optimized C page image.
- New production build: PASS (Next 16.4.0, webpack, exit 0, 25/25 static pages).
- Browser B: PASS via Chrome DevTools emulation (1440x900 scrollHeight 5014px, phone innerWidth 390px / scrollWidth 375px), 8 products, sections, search, basket, menu and AR/EN; screenshot evidence in this version folder.
- Full CI/PostgreSQL and authenticated C browser: pending GitHub run on new commit.
- Physical UX signoff vs approved A/B/C references: pending.
- Application Foundation / backup/rollback / public deployment: HOLD.

## Version files
- `apply-merchant-site.py`: one-time source transformation (already applied; DO NOT run again).
- `setup-local-uat.py`: local isolated DB init; guard prevents overwriting an existing local account/env.
- `VERSION.md`: this change log.
- Future screenshots and test evidence are kept in this folder, not loose outside the project.

## Security & cleanup
No source copies, releases, code, credentials or documents outside `C:\A1Hub\a1-mobi` and official GitHub. Preserve earlier archived versions. No passwords in GitHub, reports or conversation. Do not merge/deploy without real C acceptance.
