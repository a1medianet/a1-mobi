# GitHub Source of Truth

**Effective:** 2026-10-07

GitHub is the primary and authoritative source of truth for this project.

**Canonical branch:** `feat/operational-ui-shell`

Canonical approved baseline: feat/operational-ui-shell (current default branch). Pilot/security branches remain non-canonical until explicitly accepted/merged.

Rules:
- A local workstation copy is a working cache, not the authoritative source.
- Work is considered canonical only after it is pushed to this repository.
- Unmerged feature/draft branches are not production-approved unless an explicit project gate says otherwise.
- Before resuming work after a local session, fetch GitHub first and reconcile any local changes.
- Heavy evidence/artifacts should stay outside Git unless intentionally approved for source control.
