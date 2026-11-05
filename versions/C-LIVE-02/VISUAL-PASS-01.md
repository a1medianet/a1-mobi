# A1 Mobi — C-LIVE-02 / VISUAL-PASS-01

Date: 2026-10-17
Device: Thaghr only
Canonical root: C:\A1Hub\a1-mobi
Source: GitHub a1medianet/a1-mobi, branch feat/mobi-abc-continue-20261013, Draft PR #12

## Visual acceptance issue
User screenshot on localhost:3197 shows a working but vertically fragmented repairs UAT: cash opening dominated the beginning; intake and diagnosis began well below the fold, with an unnecessarily tall six-field intake panel. The page needs clearer hierarchy compared to agreed Owner visual reference C.

## Scope — presentation only
- Intake and diagnosis first, before the cash drawer.
- Cash opening as a compact native expand/collapse detail, preserving the existing permission and validation requirements.
- Four *working* anchor shortcuts to intake, diagnosis, tickets, and cash/settlement; keyboard focus styles.
- Two-column intake form on desktop, single column on narrow mobile.
- Reduced spacing and adjusted hierarchy; scoped blue #1265E8 / orange #FF7A1A.
- Existing Arabic/English copy and the UAT-only warning are preserved.
- Zero modifications to payment, data persistence, IMEI logic, tenancy checks, or live routes in this visual pass.

## Evidence
- ESLint + TypeScript (initial presentation patch): PASS exit 0.
- C-LIVE-02 PostgreSQL route test: 4/4 PASS exit 0.
- Isolated preview: http://127.0.0.1:3198/ar/live-02 (Next.js dev; only on Thaghr; separate from production-style preview 3197).
- Workflow navigation patch and final GitHub CI pending check.
- Browser pixel-level comparison with the approved C reference and real click-through financial stage are NOT yet certified.
- Overall product remains Draft / nonproduction; no merge or public deployment.

## Next stage gate
1. Review new screenshot at 1440x900, 390px mobile, and English locale.
2. Verify each step anchor by clicking; no visual overflow.
3. Finish cash payment/repair pickup end-to-end browser test under authorized session.
4. Close degraded health recovery delivery config, then broader commercial readiness.
