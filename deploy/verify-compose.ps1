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

function Read-EnvValues {
  param([string]$Path)
  $values = @{}
  foreach ($line in [System.IO.File]::ReadLines($Path)) {
    $trimmed = $line.Trim()
    if ($trimmed.Length -eq 0 -or $trimmed.StartsWith("#")) { continue }
    $index = $trimmed.IndexOf("=")
    if ($index -lt 1) { throw "invalid env line: $line" }
    $values.Set_Item($trimmed.Substring(0, $index), $trimmed.Substring(($index + 1)))
  }
  return $values
}

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $deployDir "..")).Path
$composePath = if ([System.IO.Path]::IsPathRooted($ComposeFile)) {
  $ComposeFile
} else {
  Join-Path $deployDir $ComposeFile
}
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
  $EnvFile
} else {
  Join-Path $deployDir $EnvFile
}

Assert-True (Test-Path -LiteralPath $composePath) "compose file not found: $composePath"
Assert-True (Test-Path -LiteralPath $envPath) "env file not found: $envPath"

$envValues = Read-EnvValues $envPath
$expectedServerPort = if ($envValues.ContainsKey("SERVER_PORT") -and -not [string]::IsNullOrWhiteSpace([string]$envValues.SERVER_PORT)) {
  [string]$envValues.SERVER_PORT
} else {
  "8090"
}

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

Assert-True ($yaml -match "admin-web:") "admin compose must expose admin-web service"
Assert-True ($yaml -match "container_name:\s*pragmaticplay-admin-web") "admin web container must use pragmaticplay-admin-web"
Assert-True ($yaml -match "image:\s*pragmaticplay-admin-web:local") "admin image must be built from local source"
Assert-True ($yaml -match "context:\s*$([regex]::Escape($repoRoot))") "admin build context must point to repository root"
Assert-True ($yaml -match "VITE_GAME_SERVICE_BASE_URL") "game service frontend build arg is required"
Assert-True ($yaml -match "VITE_GAME_SERVICE_PROXY_BASE_URL") "game service proxy frontend build arg is required"
Assert-True ($yaml -match "GAME_SERVICE_BASE_URL") "game service server-side base url is required"
Assert-True ($yaml -match "GAME_SERVICE_ADMIN_API_KEY") "game service admin api key is required"
Assert-True ($yaml -match "published:\s*""?$([regex]::Escape($expectedServerPort))""?") "admin host port should match SERVER_PORT=$expectedServerPort"
Assert-True ($yaml -notmatch "weishaw/sub2api:latest") "compose must not use upstream sub2api image"
Assert-True ($yaml -notmatch 'published:\s*"?5432"?') "postgres must not expose host port 5432 by default"
Assert-True ($yaml -notmatch 'published:\s*"?6379"?') "redis must not expose host port 6379 by default"

Write-Output "PASS admin compose verification: $ComposeFile"
