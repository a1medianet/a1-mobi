$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$containerName = 'a1-mobi-roles-uat-' + $PID
$password = [Guid]::NewGuid().ToString('N')
$started = $false
try {
  docker run -d --rm --name $containerName -e POSTGRES_DB=mobi_roles_uat -e POSTGRES_USER=mobi_roles_uat -e POSTGRES_PASSWORD=$password -p 127.0.0.1:5441:5432 postgres:17-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'ROLES_POSTGRES_START_FAILED' }
  $started = $true
  $ready = $false
  for ($attempt=0; $attempt -lt 45; $attempt++) {
    docker exec $containerName pg_isready -U mobi_roles_uat -d mobi_roles_uat *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'ROLES_POSTGRES_NOT_READY' }
  Write-Output 'PASS isolated-pricing-roles-db'
  $env:DATABASE_URL = 'postgresql://mobi_roles_uat:' + $password + '@127.0.0.1:5441/mobi_roles_uat'
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'ROLES_MIGRATION_FAILED' }
  Write-Output 'PASS roles-migrations'
  npx vitest run tests/price-override-roles-db.test.ts --maxWorkers=1
  if ($LASTEXITCODE -ne 0) { throw 'PRICING_ROLES_TEST_FAILED' }
  Write-Output 'PASS pricing-roles-end-to-end'
} catch {
  Write-Error ('FAIL 5-of-7-pricing-gate: ' + $_.Exception.Message)
  exit 1
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  if ($started) { docker stop $containerName | Out-Null }
  Write-Output 'CLEANUP roles-container'
}
