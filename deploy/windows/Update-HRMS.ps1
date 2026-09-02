param(
  [string]$Branch = 'main',
  [string]$BackupDirectory = (Join-Path $env:ProgramData 'RiskHRMS\backups')
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$ecosystemFile = Join-Path $projectRoot 'deploy\ecosystem.config.cjs'
$runtimeRoot = Join-Path $env:ProgramData 'RiskHRMS'

function Invoke-Checked([string]$Program, [string[]]$Arguments, [string]$WorkingDirectory) {
  Push-Location $WorkingDirectory
  try {
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Program failed with exit code $LASTEXITCODE" }
  } finally {
    Pop-Location
  }
}

foreach ($command in @('node.exe', 'npm.cmd', 'npx.cmd', 'git.exe', 'pm2.cmd')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is missing from PATH." }
}
if (-not (Test-Path -LiteralPath (Join-Path $backendDir '.env'))) { throw 'backend/.env is missing.' }

$gitChanges = @(& git.exe -C $projectRoot status --porcelain)
if ($gitChanges.Count -gt 0) {
  throw 'Update cancelled: production worktree contains uncommitted changes. Preserve and commit/push them before updating.'
}
$currentBranch = (& git.exe -C $projectRoot branch --show-current).Trim()
if ($currentBranch -ne $Branch) { throw "Update cancelled: current branch is '$currentBranch', expected '$Branch'." }

$previousCommit = (& git.exe -C $projectRoot rev-parse HEAD).Trim()
Write-Host "Current production commit: $previousCommit" -ForegroundColor DarkGray
Write-Host '[1/9] Fetching approved release metadata...' -ForegroundColor Cyan
Invoke-Checked 'git.exe' @('fetch', '--prune', 'origin') $projectRoot
Invoke-Checked 'git.exe' @('rev-parse', '--verify', "origin/$Branch") $projectRoot
$counts = ((& git.exe -C $projectRoot rev-list --left-right --count "HEAD...origin/$Branch") -split '\s+')
$ahead = [int]$counts[0]
$behind = [int]$counts[1]
if ($ahead -gt 0) { throw "Update cancelled: production is $ahead commit(s) ahead of origin/$Branch. Push/reconcile those commits first." }
if ($behind -eq 0) {
  Write-Host "[OK] Production already matches origin/$Branch. No update was applied." -ForegroundColor Green
  exit 0
}

Write-Host '[2/9] Creating verified database backup...' -ForegroundColor Cyan
$backupPath = & (Join-Path $PSScriptRoot 'Backup-HRMS.ps1') -BackupDirectory $BackupDirectory | Select-Object -Last 1
if (-not $backupPath -or -not (Test-Path -LiteralPath $backupPath)) { throw 'Update cancelled: backup verification failed.' }

Write-Host "[3/9] Fast-forwarding to origin/$Branch..." -ForegroundColor Cyan
Invoke-Checked 'git.exe' @('pull', '--ff-only', 'origin', $Branch) $projectRoot
$targetCommit = (& git.exe -C $projectRoot rev-parse HEAD).Trim()

try {
  Write-Host '[4/9] Installing locked dependencies...' -ForegroundColor Cyan
  Invoke-Checked 'npm.cmd' @('ci', '--no-audit') $backendDir
  Invoke-Checked 'npm.cmd' @('ci', '--no-audit') $frontendDir
  Write-Host '[5/9] Generating Prisma client...' -ForegroundColor Cyan
  Invoke-Checked 'npx.cmd' @('prisma', 'generate') $backendDir
  Write-Host '[6/9] Building frontend and backend...' -ForegroundColor Cyan
  Invoke-Checked 'npm.cmd' @('run', 'build') $frontendDir
  Invoke-Checked 'npm.cmd' @('run', 'build') $backendDir
  Write-Host '[7/9] Applying reviewed database migrations...' -ForegroundColor Cyan
  Invoke-Checked 'npx.cmd' @('prisma', 'migrate', 'deploy') $backendDir
  Write-Host '[8/9] Reloading application with PM2...' -ForegroundColor Cyan
  Invoke-Checked 'pm2.cmd' @('startOrReload', $ecosystemFile, '--update-env') $projectRoot
  Invoke-Checked 'pm2.cmd' @('save') $projectRoot

  Write-Host '[9/9] Running production health check...' -ForegroundColor Cyan
  $deadline = (Get-Date).AddSeconds(60)
  $health = $null
  while ((Get-Date) -lt $deadline) {
    try {
      $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -Headers @{ Accept = 'application/json' } -TimeoutSec 3
      if ($health.status -eq 'ok') { break }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  if (-not $health -or $health.status -ne 'ok') { throw 'Updated service did not pass /health within 60 seconds.' }

  New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot 'state') | Out-Null
  [ordered]@{
    deployed_at = (Get-Date).ToString('o')
    previous_commit = $previousCommit
    deployed_commit = $targetCommit
    backup = $backupPath
    health = $health.status
  } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeRoot 'state\last-successful-deploy.json') -Encoding UTF8

  Write-Host "[OK] Deployed commit: $targetCommit" -ForegroundColor Green
  Write-Host "[OK] Backup: $backupPath" -ForegroundColor Green
  Write-Host '[OK] Health: database connected' -ForegroundColor Green
} catch {
  Write-Host "[FAILED] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "The updater did not perform an automatic database restore or Git reset. Backup: $backupPath" -ForegroundColor Yellow
  Write-Host "Previous running commit before reload was: $previousCommit" -ForegroundColor Yellow
  throw
}
