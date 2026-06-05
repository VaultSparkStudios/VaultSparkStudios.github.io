param(
  [switch]$SkipWhoAmI,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$wrangler = "wrangler"

if (-not (Get-Command $wrangler -ErrorAction SilentlyContinue)) {
  throw "wrangler is not installed or not on PATH."
}

if (-not $SkipWhoAmI) {
  & $wrangler whoami
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler whoami failed. Log in before deploying."
  }
}

$deployArgs = @(
  "deploy",
  "--config", (Join-Path $PSScriptRoot "wrangler.toml"),
  "--env", "production"
)

if ($DryRun) {
  Write-Host "Dry run:"
  Write-Host "$wrangler $($deployArgs -join ' ')"
  exit 0
}

Push-Location $repoRoot
try {
  & $wrangler @deployArgs
  if ($LASTEXITCODE -ne 0) {
    throw "wrangler deploy failed."
  }
} finally {
  Pop-Location
}
