$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$node = (Get-Command node).Source
$wrangler = Join-Path $PSScriptRoot "node_modules/wrangler/bin/wrangler.js"
$config = Join-Path $PSScriptRoot "wrangler.jsonc"
$state = Join-Path $PSScriptRoot ".wrangler/phase1c-state"
$env:XDG_CONFIG_HOME = Join-Path $PSScriptRoot ".wrangler/phase1c-config"
$dataDir = Join-Path $PSScriptRoot ".wrangler/phase1c-test-data"
$devVars = Join-Path $PSScriptRoot ".dev.vars"
$stdout = Join-Path $PSScriptRoot ".wrangler/phase1c-worker.stdout.log"
$stderr = Join-Path $PSScriptRoot ".wrangler/phase1c-worker.stderr.log"
$worker = $null
$workerTestUrl = "http://127.0.0.1:8787"

function New-LocalSecret {
  $randomBytes = New-Object byte[] 32
  $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
  $randomGenerator.GetBytes($randomBytes)
  $randomGenerator.Dispose()
  return [Convert]::ToBase64String($randomBytes)
}

function Invoke-WranglerLocal {
  param([string[]]$Arguments)
  & $node $wrangler @Arguments
  if ($LASTEXITCODE -ne 0) { throw "Wrangler local command failed with exit code $LASTEXITCODE." }
}

function Stop-LocalWorker {
  if ($script:worker -and -not $script:worker.HasExited) {
    & taskkill.exe /PID $script:worker.Id /T /F | Out-Null
    $script:worker.WaitForExit(10000) | Out-Null
    $script:worker = $null
  }
}

function Start-LocalWorker {
  $script:worker = Start-Process -FilePath $node `
    -ArgumentList @($wrangler, "dev", "--local", "--ip", "127.0.0.1", "--port", "8787", "--config", $config, "--persist-to", $state) `
    -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $stdout -RedirectStandardError $stderr

  for ($attempt = 0; $attempt -lt 45; $attempt++) {
    if ($script:worker.HasExited) {
      $workerError = if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Raw } else { "" }
      throw "Local Worker exited during startup. $workerError"
    }
    try {
      $health = Invoke-RestMethod -Uri "$workerTestUrl/health" -TimeoutSec 2
      if ($health.persistence -eq "d1+r2") { return }
    } catch {}
    Start-Sleep -Milliseconds 500
  }
  throw "Local Worker did not become healthy. Check the local Wrangler logs under .wrangler/."
}

try {
  if (-not (Test-Path -LiteralPath $devVars)) {
    @(
      "JWT_SECRET=$(New-LocalSecret)"
      "JWT_REFRESH_SECRET=$(New-LocalSecret)"
      "ASSET_URL_SECRET=$(New-LocalSecret)"
      "RATE_LIMIT_SECRET=$(New-LocalSecret)"
      "AUTH_RATE_LIMIT=100"
    ) | Set-Content -LiteralPath $devVars -Encoding utf8
  }

  $secretNames = Get-Content -LiteralPath $devVars | Where-Object { $_ -match '^\s*[A-Za-z_][A-Za-z0-9_]*\s*=' } | ForEach-Object { ($_ -split '=', 2)[0].Trim() }
  foreach ($required in @("JWT_SECRET", "JWT_REFRESH_SECRET", "ASSET_URL_SECRET", "RATE_LIMIT_SECRET")) {
    if ($required -notin $secretNames) { throw "Local .dev.vars is missing $required; add a local test-only value and rerun." }
  }

  $portOwner = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue
  if ($portOwner) { throw "Port 8787 is already in use; stop that local process before running the isolated persistence test." }

  Invoke-WranglerLocal @("d1", "migrations", "apply", "anathel-mvp-local", "--local", "--config", $config, "--persist-to", $state)
  Start-LocalWorker

  $env:WORKER_TEST_URL = $workerTestUrl
  $env:WORKER_TEST_DATA_DIR = $dataDir
  & $node (Join-Path $PSScriptRoot "test-local.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Local D1/R2 integration phase failed with exit code $LASTEXITCODE." }

  Stop-LocalWorker
  Start-LocalWorker

  & $node (Join-Path $PSScriptRoot "test-persistence-after-restart.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Persistence-after-restart phase failed with exit code $LASTEXITCODE." }
  Stop-LocalWorker

  $manifestPath = Join-Path $dataDir "manifest.json"
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  foreach ($userId in @($manifest.owner.id, $manifest.other.id)) {
    if ($userId -notmatch '^[0-9a-fA-F-]{36}$') { throw "Refusing cleanup for unexpected synthetic user ID." }
  }
  $cleanupSqlPath = Join-Path $dataDir "cleanup.sql"
  @(
    "DELETE FROM users WHERE id IN ('$($manifest.owner.id)', '$($manifest.other.id)');"
    "DELETE FROM auth_rate_limits;"
  ) | Set-Content -LiteralPath $cleanupSqlPath -Encoding utf8
  Invoke-WranglerLocal @("d1", "execute", "anathel-mvp-local", "--local", "--config", $config, "--persist-to", $state, "--file", $cleanupSqlPath)
  Remove-Item -LiteralPath $manifestPath -Force
  Remove-Item -LiteralPath $cleanupSqlPath -Force

  Write-Output "RESULT: local Wrangler/workerd + D1 + R2 create/list/open/update, auth isolation, private asset retrieval and restart persistence all passed. Synthetic test rows and R2 files were cleaned from the dedicated local state."
} finally {
  Stop-LocalWorker
  Remove-Item Env:WORKER_TEST_URL -ErrorAction SilentlyContinue
  Remove-Item Env:WORKER_TEST_DATA_DIR -ErrorAction SilentlyContinue
}
