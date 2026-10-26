# A1 Mobi — ASSIST-01 | Recovery & Integration Contract (Discovery Gate)

Date: 2026-10-18
Owner scope: Thaghr only. Mobi canonical repository `a1medianet/a1-mobi`, local `C:\A1Hub\a1-mobi`.
Method: A1 First / NAWA Way / One-Click Stage Gate / Evidence First.

## Existing A1 Assist history and recovery blocker

This stage deliberately **does not introduce a new assistant subsystem** into Mobi.

Historical source: `C:\Dev\A1-Assist`, initially intended as a standalone multi-tenant, white-label AI assistant serving MAPLEN Decor and MADA Al Raeda before Mobi. Previous planned packages/apps: `apps/server` (Express/TypeScript), `apps/web` (React/Vite/TypeScript), `packages/core`, tenant profiles, provider adapters, and tests/docs. A mock provider was used for deterministic local development, with secrets server side.

A1Hub migration evidence (October 16, 2026):
- `_migration/moves.json` reports `C:\Dev\A1-Assist -> C:\A1Hub\a1-assist` as `MOVED_VERIFIED`, local status clean.
- Recorded branch `fix/v0.3b1-regression-coverage`, commit `5666bf13f1d59a2f4044c9fcc01b5a3b8af643ba`.
- `_migration/fresh-github-verification.json`: remote `NONE`; organization repo `a1medianet/a1-assist` was not accessible during consolidation.
- Current Thaghr check: neither `C:\Dev\A1-Assist` nor `C:\A1Hub\a1-assist` exists; `_archive` has no Assist folder. No matching deleted-folder metadata was found in the accessible recycle bin. The historical `chadiatwi/a1-assist` endpoint returns "Repository not found" under current credentials; this does not prove whether an inaccessible private backup exists.
- **Recovery must precede reconstruction.** Search external encrypted backups, historical Git bundles/objects, and other authorized account archives. Do not silently generate an empty project and claim the historical code is restored.

Existing surviving customized logic:
- `C:\A1Hub\maplen-decor-site\app\assistant-adapter.ts` is a bilingual site-specific intent/reply adapter.
- `C:\A1Hub\mada-alraeda-site\src\lib\chat-knowledge.ts` contains a much richer bilingual public/technical intent/knowledge route bank.
- MADA `src/app/api/chat/log/route.ts` records minimized intent/action telemetry, not raw visitor chat text, and enforces request validation, same-origin and rate limiting.
- These are **reference adaptations**, not evidence that a standalone Assist Core currently runs. Never make bulk modifications to these live-site repositories for this stage.

## Architecture proposal — reusable platform, one core

Restore and review existing core, then adopt canonical independent root `C:\A1Hub\a1-assist` and **only after verifying the recovered history**, an authorized repository in `a1medianet`. Reuse old `apps/server`, `apps/web`, `packages/core` where sound. No duplicate API within `a1-mobi`.

Server-side A1 Assist Core:
- tenant resolver `tenant_id + application_id` (Mobi/MADA/MAPLEN) from verified identities/domains, never a free-form client-supplied role;
- per-tenant approved knowledge, brand, language, policy, retrieval citations, model/provider strategy, analytics and entitlements;
- provider adapters through existing approved shared infrastructure where possible. A1 TriAssistant concerns routing/providers/cost; A1 Assist concerns grounded customer- or staff-facing interaction. Their roles remain distinct;
- versioned `/v1/assist/chat`, `/v1/assist/context`, `/v1/assist/health`, with an authenticated server-to-server SDK, signed context, rate limits, scoped audit traces and fail-closed outages;
- tool allowlist, output redaction, no AI prompts as authorization and **no direct database connections from the browser/assistant**.

Mobi plugin:
- **A / public:** plans, product FAQs, guided signup/tour, approved pricing only; anonymous public knowledge only.
- **B / customers:** help find products and repair service info; actual stock/prices require a public-safe, scoped Mobi API; no private customer status without authentication.
- **C / owners & staff:** contextual help, navigation, read-only permitted inventory/repair/invoice facts from existing Mobi tenant+branch-scoped APIs and role permission checks; no raw SQL or broad tenant dump.
- Initial release is **advice-only**. Transactional write tools, refunds, price edits, messaging, bookings and warranty claims are explicit HOLD until separate approvals, human confirmation, idempotency and audit.
- Keep the existing Guide/Help Center available without the assistant. Use an explicit kill switch per tenant/app, and deterministic non-generative fallback when AI services are unreachable.
- Never copy client credentials/PII into a model prompt unnecessarily; use purpose limitation, data minimization, bounded retention, safe retrieval, and tenant isolation tests.

## Gates and acceptance

ASSIST-01 R0: verified source recovery or explicit "rebuild necessary" finding, inventory of historical packages/commits, secrets scan, dependency/security scan and source baseline tests. **Current status: BLOCKED — source folder missing.**

ASSIST-01 R1: standalone core/tenant fixture health, per-tenant knowledge tests and routing isolation.

ASSIST-01 R2: Mobi A/B/C read-only SDK contract, localized help widget and user-role + branch-scoped integration tests in isolated UAT.

ASSIST-01 R3: complete permission/security/PII/abuse tests, independent UI review and production gate. No production and no merge in this discovery gate.

This file is a **discovery/contract artifact**, not implementation, recovery, deploy or release acceptance.
