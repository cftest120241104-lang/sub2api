param(
  [string]$EnvFile = ".env"
)

$ErrorActionPreference = "Stop"

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

function Assert-Required {
  param(
    [hashtable]$Values,
    [string[]]$Keys
  )
  foreach ($key in $Keys) {
    if (-not $Values.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$Values[$key])) {
      throw "missing required env: $key"
    }
  }
}

function Assert-StrongSecret {
  param(
    [string]$Name,
    [string]$Value,
    [int]$MinLength = 32
  )
  $weakValues = @(
    "password",
    "change-me",
    "change_this_secure_password",
    "replace-with-at-least-24-random-chars",
    "replace-with-at-least-32-random-chars",
    "dev-game-service-admin-key-change-before-production"
  )
  if ($Value.Length -lt $MinLength -or $weakValues -contains $Value) {
    throw "$Name must be a strong fixed secret with at least $MinLength chars"
  }
}

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$envPath = if ([System.IO.Path]::IsPathRooted($EnvFile)) {
  (Resolve-Path -LiteralPath $EnvFile).Path
} else {
  (Resolve-Path -LiteralPath (Join-Path $deployDir $EnvFile)).Path
}

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "env file not found: $EnvFile"
}

$values = Read-EnvValues $envPath
$required = @(
  "SERVER_PORT",
  "VITE_GAME_SERVICE_BASE_URL",
  "VITE_GAME_SERVICE_PROXY_BASE_URL",
  "GAME_SERVICE_BASE_URL",
  "GAME_SERVICE_ADMIN_API_KEY",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "JWT_SECRET",
  "TOTP_ENCRYPTION_KEY"
)
Assert-Required $values $required

$serverPort = 0
if (-not [int]::TryParse([string]$values.SERVER_PORT, [ref]$serverPort) -or $serverPort -le 0 -or $serverPort -gt 65535) {
  throw "SERVER_PORT must be a valid TCP port"
}

$gameServiceUri = $null
$gameServiceBaseUrl = ([string]$values.VITE_GAME_SERVICE_BASE_URL).TrimEnd("/")
if (-not [System.Uri]::TryCreate($gameServiceBaseUrl, [System.UriKind]::Absolute, [ref]$gameServiceUri)) {
  throw "VITE_GAME_SERVICE_BASE_URL must be an absolute URL"
}
if ($gameServiceUri.Scheme -ne "https" -and $gameServiceUri.Host -notin @("127.0.0.1", "localhost")) {
  throw "VITE_GAME_SERVICE_BASE_URL must use https except localhost: $gameServiceBaseUrl"
}

$proxyBaseUrl = [string]$values.VITE_GAME_SERVICE_PROXY_BASE_URL
if (-not $proxyBaseUrl.StartsWith("/api/v1/admin/game-service")) {
  throw "VITE_GAME_SERVICE_PROXY_BASE_URL must point to the protected admin proxy"
}

$serverGameServiceUri = $null
$serverGameServiceBaseUrl = ([string]$values.GAME_SERVICE_BASE_URL).TrimEnd("/")
if (-not [System.Uri]::TryCreate($serverGameServiceBaseUrl, [System.UriKind]::Absolute, [ref]$serverGameServiceUri)) {
  throw "GAME_SERVICE_BASE_URL must be an absolute URL"
}

$email = [string]$values.ADMIN_EMAIL
try {
  [void][System.Net.Mail.MailAddress]::new($email)
} catch {
  throw "ADMIN_EMAIL must be a valid email address"
}

Assert-StrongSecret "POSTGRES_PASSWORD" ([string]$values.POSTGRES_PASSWORD) 24
Assert-StrongSecret "ADMIN_PASSWORD" ([string]$values.ADMIN_PASSWORD) 12
Assert-StrongSecret "JWT_SECRET" ([string]$values.JWT_SECRET) 32
Assert-StrongSecret "TOTP_ENCRYPTION_KEY" ([string]$values.TOTP_ENCRYPTION_KEY) 32
Assert-StrongSecret "GAME_SERVICE_ADMIN_API_KEY" ([string]$values.GAME_SERVICE_ADMIN_API_KEY) 32

if ($values.ContainsKey("SECURITY_URL_ALLOWLIST_ENABLED") -and [string]$values.SECURITY_URL_ALLOWLIST_ENABLED -ne "true") {
  Write-Warning "SECURITY_URL_ALLOWLIST_ENABLED is not true; enable it before public production exposure."
}

Push-Location $deployDir
try {
  docker compose --env-file $envPath -f docker-compose.local.yml config --quiet
  if ($LASTEXITCODE -ne 0) {
    throw "docker compose config failed"
  }
} finally {
  Pop-Location
}

Write-Output "PASS admin production env: $envPath"
