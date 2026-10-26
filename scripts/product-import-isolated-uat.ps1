$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..'))
$containerName = 'a1-mobi-import-uat-' + $PID
$password = [Guid]::NewGuid().ToString('N')
$started = $false
try {
  docker run -d --rm --name $containerName -e POSTGRES_DB=mobi_import_uat -e POSTGRES_USER=mobi_import_uat -e POSTGRES_PASSWORD=$password -p 127.0.0.1:5439:5432 postgres:17-alpine | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'LOCAL_DOCKER_START_FAILED' }
  $started = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    docker exec $containerName pg_isready -U mobi_import_uat -d mobi_import_uat *> $null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'LOCAL_POSTGRES_NOT_READY' }
  Write-Output 'PASS isolated-import-database'
  $env:DATABASE_URL = 'postgresql://mobi_import_uat:' + $password + '@127.0.0.1:5439/mobi_import_uat'
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'LOCAL_SCHEMA_MIGRATION_FAILED' }
  Write-Output 'PASS isolated-import-migrations'
  npx vitest run tests/excel-import-db.test.ts tests/reports-db.test.ts --maxWorkers=1
  if ($LASTEXITCODE -ne 0) { throw 'IMPORT_DB_TEST_FAILED' }
  Write-Output 'PASS catalog-import-db'
} catch {
  Write-Error ('FAIL isolated-import-gate: ' + $_.Exception.Message)
  exit 1
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  if ($started) { docker stop $containerName | Out-Null }
  Write-Output 'CLEANUP isolated-import-container'
}
