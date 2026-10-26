$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$containerName = 'a1-mobi-business-uat-' + $PID
$password = [Guid]::NewGuid().ToString('N')
$started = $false
try {
  docker run -d --rm --name $containerName -e POSTGRES_DB=mobi_business_uat -e POSTGRES_USER=mobi_business_uat -e POSTGRES_PASSWORD=$password -p 127.0.0.1:5440:5432 postgres:17-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'ISOLATED_BUSINESS_DB_START_FAILED' }
  $started = $true
  $ready = $false
  for ($attempt=0; $attempt -lt 45; $attempt++) {
    docker exec $containerName pg_isready -U mobi_business_uat -d mobi_business_uat *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'ISOLATED_BUSINESS_DB_NOT_READY' }
  Write-Output 'PASS isolated-business-db'
  $env:DATABASE_URL = 'postgresql://mobi_business_uat:' + $password + '@127.0.0.1:5440/mobi_business_uat'
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'BUSINESS_MIGRATIONS_FAILED' }
  Write-Output 'PASS business-migrations'
  npx vitest run tests/cash-db.test.ts tests/sell-db.test.ts tests/reports-db.test.ts tests/owner-operational-journey-db.test.ts tests/excel-import-db.test.ts --maxWorkers=1
  if ($LASTEXITCODE -ne 0) { throw 'BUSINESS_DB_TESTS_FAILED' }
  Write-Output 'PASS business-end-to-end-postgres'
} catch {
  Write-Error ('FAIL business-isolated-uat: ' + $_.Exception.Message)
  exit 1
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  if ($started) { docker stop $containerName | Out-Null }
  Write-Output 'CLEANUP isolated-business-container'
}
