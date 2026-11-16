param([switch]$Enroll)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$secretsDir = 'C:\A1Hub\_local-secrets'
$dbFile = Join-Path $secretsDir 'a1-mobi-platform-test-db.env'
$keyFile = Join-Path $secretsDir 'a1-mobi-platform-local-mfa.key'
if (-not (Test-Path -LiteralPath $dbFile)) { throw 'ISOLATED_DB_CONFIG_MISSING' }
$line = Get-Content -LiteralPath $dbFile | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
if (-not $line) { throw 'ISOLATED_DATABASE_URL_MISSING' }
$dbUrl = $line.Substring('DATABASE_URL='.Length).Trim('"')
$uri = [Uri]$dbUrl
if ($uri.Host -ne '127.0.0.1' -or $uri.Port -ne 55439 -or $uri.AbsolutePath -ne '/mobi_platform_test') {
  throw 'REFUSE_NON_ISOLATED_DATABASE'
}
if (-not (Test-Path -LiteralPath $keyFile)) {
  $key = (& node -p "require('node:crypto').randomBytes(32).toString('hex')").Trim()
  if ($LASTEXITCODE -ne 0 -or $key -notmatch '^[0-9a-f]{64}$') { throw 'KEY_GENERATION_FAILED' }
  [IO.File]::WriteAllText($keyFile, $key, [Text.Encoding]::ASCII)
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $acl.SetAccessRuleProtection($true, $false)
  $sid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
  $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, 'FullControl', 'Allow')
  $acl.AddAccessRule($rule)
  [IO.File]::SetAccessControl($keyFile, $acl)
  Write-Host 'LOCAL_MFA_KEY_CREATED (private file outside Git)'
}
$key = [IO.File]::ReadAllText($keyFile).Trim()
if ($key -notmatch '^[0-9a-fA-F]{64}$') { throw 'INVALID_LOCAL_MFA_KEY' }
$env:DATABASE_URL = $dbUrl
$env:A1_MOBI_MFA_ENCRYPTION_KEY = $key
$env:APP_ORIGIN = 'http://127.0.0.1:4327'
$env:A1_MOBI_DIST_DIR = '.next-platform-owner'
Set-Location -LiteralPath $root
if ($Enroll) {
  Write-Host 'PRIVATE ENROLLMENT on isolated test database only. Do not share the displayed TOTP secret.'
  & node scripts/bootstrap-platform-admin.cjs
  if ($LASTEXITCODE -ne 0) { throw 'PLATFORM_ADMIN_ENROLLMENT_FAILED' }
}
Write-Host 'Local platform login: http://127.0.0.1:4327/platform/login'
Write-Host 'Keep this terminal open while testing. Press Ctrl+C to stop.'
& node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 4327
if ($LASTEXITCODE -ne 0) { throw 'PLATFORM_LOCAL_SERVER_FAILED' }
