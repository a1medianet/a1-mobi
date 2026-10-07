# A1 Mobi — Secrets Rotation Runbook v1.0

**Effective:** 2026-10-07

## Secrets covered

- database credentials
- A1_MOBI_BOOTSTRAP_SECRET
- MFA encryption key material
- recovery delivery credentials
- A1_BILLING_SERVICE_TOKEN
- A1_PULSE_SERVICE_TOKEN
- A1_ASSIST_SERVICE_TOKEN
- A1_TELEMETRY_HASH_SALT

Real values must never be committed to Git. .env.example contains names only.

## Rotation sequence

1. Create a new credential in the owning service/secret manager.
2. Add the new value to the deployment secret store without exposing it in logs, issues or screenshots.
3. When the upstream service supports overlap, accept old and new credentials during a short migration window.
4. Deploy A1 Mobi with the new credential.
5. Verify health/readiness and one authenticated integration request.
6. Revoke the old credential at the owning service.
7. Re-run verification after revocation to prove the old credential is no longer required.
8. Record only the secret name, rotation timestamp, operator/evidence reference and outcome — never the value.

## Emergency rotation

For suspected exposure:
- revoke the affected credential first when doing so is safer than maintaining service;
- disable the dependent capability fail-closed where applicable;
- rotate all credentials sharing the same trust boundary;
- invalidate sessions when session/authentication material could be affected;
- preserve incident evidence without copying secrets into the evidence pack.

## MFA encryption-key note

Changing the MFA encryption key requires an explicit migration/reenrollment plan. Do not replace encryption material blindly if existing encrypted MFA credentials depend on it.

## Telemetry hash salt

Rotating A1_TELEMETRY_HASH_SALT deliberately breaks pseudonymous continuity. This is acceptable and should be recorded as a telemetry identity epoch change.

## Evidence

A release evidence pack records secret names expected by the release and verification status, never secret values.
