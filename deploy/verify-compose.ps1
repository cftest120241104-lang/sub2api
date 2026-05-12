param(
  [string]$ComposeFile = "docker-compose.local.yml",
  [string]$EnvFile = ".env.example"
)

$ErrorActionPreference = "Stop"

function Assert-True {
  param(
    [bool]$Condition,
    [string]$Message
  )
  if (-not $Condition) {
    throw $Message
  }
}

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $deployDir "..")).Path
$composePath = Join-Path $deployDir $ComposeFile
$envPath = Join-Path $deployDir $EnvFile

Assert-True (Test-Path -LiteralPath $composePath) "compose file not found: $composePath"
Assert-True (Test-Path -LiteralPath $envPath) "env file not found: $envPath"

Push-Location $deployDir
try {
  $rendered = docker compose --env-file $EnvFile -f $ComposeFile config
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose config failed"
  }
} finally {
  Pop-Location
}

$yaml = $rendered -join "`n"

Assert-True ($yaml -match "image:\s*pragmaticplay-admin:local") "admin image must be built from local source"
Assert-True ($yaml -match "context:\s*$([regex]::Escape($repoRoot))") "admin build context must point to repository root"
Assert-True ($yaml -match "VITE_GAME_SERVICE_BASE_URL") "game service frontend build arg is required"
Assert-True ($yaml -match 'published:\s*"?8090"?') "admin host port should default to 8090"
Assert-True ($yaml -notmatch "weishaw/sub2api:latest") "compose must not use upstream sub2api image"
Assert-True ($yaml -notmatch 'published:\s*"?5432"?') "postgres must not expose host port 5432 by default"
Assert-True ($yaml -notmatch 'published:\s*"?6379"?') "redis must not expose host port 6379 by default"

Write-Output "PASS admin compose verification: $ComposeFile"
