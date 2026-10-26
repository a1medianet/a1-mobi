$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$containerName = 'a1-mobi-c14-uat-' + $PID
$password = [Guid]::NewGuid().ToString('N')
$started = $false
try {
  docker run -d --rm --name $containerName -e POSTGRES_DB=mobi_uat -e POSTGRES_USER=mobi_uat -e POSTGRES_PASSWORD=$password -p 127.0.0.1:5438:5432 postgres:17-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'LOCAL_DOCKER_START_FAILED' }
  $started = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    docker exec $containerName pg_isready -U mobi_uat -d mobi_uat *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'LOCAL_POSTGRES_NOT_READY' }
  Write-Output 'PASS isolated-local-uat-database'
  $env:DATABASE_URL = 'postgresql://mobi_uat:' + $password + '@127.0.0.1:5438/mobi_uat'
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'LOCAL_SCHEMA_MIGRATION_FAILED' }
  Write-Output 'PASS isolated-local-migrations'
  npx vitest run tests/c14-cash-close-db.test.ts --maxWorkers=1
  if ($LASTEXITCODE -ne 0) { throw 'C14_CASH_CLOSE_TEST_FAILED' }
  Write-Output 'PASS c14-cash-close-db'
} catch {
  Write-Error ('FAIL isolated-c14-gate: ' + $_.Exception.Message)
  exit 1
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  if ($started) { docker stop $containerName | Out-Null }
  Write-Output 'CLEANUP isolated-synthetic-container'
}