# A1 Mobi — Release & Supply-Chain Policy v1.0

**Effective:** 2026-10-07

## GitHub source of truth

Production candidates originate from the canonical GitHub repository and an evidence-backed release branch/commit. Local workstation state is not a release source.

## Required software gate

Every release candidate must pass:
- SQL migration BOM check
- database migrations on a fresh PostgreSQL service
- Prisma validation
- ESLint
- TypeScript
- automated tests
- production build
- runtime dependency audit at HIGH or CRITICAL severity
- CycloneDX SBOM generation

Visual evidence is generated from the production build by GitHub Actions for the public Product Experience Shell and populated Pilot workspace.

## Source maps

Production browser source maps are explicitly disabled in next.config.ts. A future observability provider may use private server-side source maps only after a separate security decision.

## Dependency policy

Direct runtime dependencies remain version-pinned in the lockfile. High/Critical production dependency findings block release unless a documented, tested exception is explicitly approved. Major upgrades require their own migration/test gate.

## SBOM

CI generates a CycloneDX SBOM artifact from the exact lockfile/commit. The SBOM belongs to the release evidence pack; it is not required to be committed back into Git.

## Build provenance

Evidence must record Git commit SHA, workflow run ID, Node/runtime version, migration result, lint/typecheck/test/build result, runtime audit result, SBOM artifact reference, visual artifact reference and Application Foundation gate decision.

## Web update policy

A1 Mobi web releases are server-deployed:
- current: no user action;
- recommended: in-app refresh banner;
- required: in-app required-update banner when current version is below the configured minimum.

Rollback is a deployment operation to a previously evidenced commit. A1_MINIMUM_SUPPORTED_VERSION marks unsupported clients logically; dangerous releases should additionally be removed or rolled back at deployment level.

## Desktop/Tauri

Desktop code signing, signed update feeds and staged auto-update are not applicable to the current web release and become mandatory before shipping the Tauri distribution.

## Physical Pilot gate

Software PASS does not replace:
- physical barcode/IMEI scan,
- target thermal-printer receipt check,
- one complete real-store operating day and owner close.

Those remain the final operational Pilot evidence.
