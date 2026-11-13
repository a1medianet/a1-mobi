# A1 Currency — Shared Contract / NAWA Way (2026-11-13)

Status: **Core conversion prototype tested in A1 Mobi only. NOT deployed as a live money workflow.** Other A1 apps are NOT yet integrated.

## One shared source of truth
A1 Currency is an A1 Suite Core capability. All A1 apps (Mobi, Count, Execute, Clinic, Shikteer, and later products) must consume one versioned API/library; avoid independent rate calculations copied per application.

## Entity and country settings
- Tenant/organization: country, preferred locale, **base ledger currency** (ISO 4217), permitted settlement currencies, preferred display currency, precision/rounding.
- Branch: optional authorized override; tenant and branch scope enforced server-side.
- Each entity chooses MANUAL (owner-entered rate, optionally locked until changed) or AUTO (explicit provider + refresh cadence + age limit). No silent mode switching.
- All finance role changes, approvals, manual overrides, provider failures and historical revisions logged in append-only audit records.

## Rate convention
For a pair BASE/QUOTE, **1 BASE = rate QUOTE**. USD/LBP at 89500 implies $1 = LBP 89500 and LBP 89500 = $1. For cross-currency conversion use a verified base-currency route. No unsupported rate or silent default rate.
- Display source, last updated, effective timestamp, expiry, mode and pair for every administrative rate.
- Stale/unavailable AUTO rate **blocks a new priced transaction** or requires an explicitly authorized, audited manual override; never silently reuse a prior quote.
- Manual rates remain fixed until a permitted change or configured expiry.
- Preserve the exact applied rate, source, quote timestamp and base/quote currencies on every invoice, payment, return, debt receipt, repair settlement and cash ledger posting. Editing current rates never modifies posted records.
- Use decimal arithmetic and ISO minor units/explicit tenant rounding rules. Do not calculate money from JS floating-point numbers on financial write paths.
- Provider data is a **reference rate**, not automatically the Lebanon cash/shop rate. Managers may choose a trustworthy rate provider and a separate approved cash settlement rate/markup where legal and appropriate. No unauthorized market-rate claim.

## Required backend/domain stages
1. Database: CurrencyPolicy, RateProviderConfig, ExchangeRateQuote (versioned), ExchangeRateOverride + AuditEvent, transaction-level immutable FX snapshot. Backfill existing Mobi ExchangeRate, Payment and CashMovement without rewriting historic values.
2. RBAC: currency.view, currency.manage, currency.override; provider key held exclusively server-side; tenant/branch scoped.
3. Provider adapters: user-approved official/reference source and commercial FX provider; periodic fetch with retries, authentication, signed/public reference where available, provider publication time, staleness checks, anomaly thresholds, audit and monitoring. Explicit provider auto-update opt-in.
4. Settings UI: preferred currency, allowed pairs, live/manual mode, fixed rate editor, bidirectional calculator, provider selection and last update, history/rollback.
5. Mobi integration: POS, catalog prices, purchases, inventory cost, repairs, invoices, refunds, debts, cash drawer, reports; transaction-level server verification with FX quote snapshot.
6. Cross-app rollout one at a time: Count, Execute, Clinic, Shikteer, etc. Every application must pass its own currency scenario tests, not merely import the helper.

## Acceptance scenarios
- USD->LBP, LBP->USD, EUR->USD->LBP; precise rounding and reversal.
- Cross-tenant / cross-branch quote rejection; manual locked rate; AUTO provider freshness/expiry; provider outage without fabricated FX.
- Changing a current rate must not change a historical invoice or settled repair.
- Authorized override, permissions, branch and currency policy; no unauthenticated change.
- The owner can inspect an invoice's applied rate and its immutable provider/manual source.

Current code: `src/modules/currency/a1-currency.ts` and `tests/a1-currency.test.ts` in A1 Mobi. This is a pure foundation, **not** a finished FX settings page or financial posting integration.
