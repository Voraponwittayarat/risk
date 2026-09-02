param(
  [switch]$SkipDatabaseMigration,
  [switch]$SkipPm2Install
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$environmentFile = Join-Path $backendDir '.env'
$environmentTemplate = Join-Path $projectRoot 'deploy\templates\backend.env.production.example'
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

function Get-EnvironmentValue([string]$Name) {
  $match = Get-Content -LiteralPath $environmentFile |
    Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } |
    Select-Object -Last 1
  if (-not $match) { return $null }
  $value = ($match -split '=', 2)[1].Trim()
  if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
    return $value.Substring(1, $value.Length - 2)
  }
  return $value
}

foreach ($command in @('node.exe', 'npm.cmd', 'npx.cmd', 'git.exe')) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) { throw "$command is missing from PATH." }
}
$nodeVersion = [Version]((& node.exe --version).Trim().TrimStart('v'))
if ($nodeVersion -lt [Version]'22.12.0') {
  throw "Node.js 22.12 or newer is required. Detected: $nodeVersion"
}

if (-not (Test-Path -LiteralPath $environmentFile)) {
  Copy-Item -LiteralPath $environmentTemplate -Destination $environmentFile
  throw "Created backend/.env from the safe template. Fill every CHANGE_ME value, then run this script again."
}
if (Select-String -LiteralPath $environmentFile -Pattern 'CHANGE_ME' -Quiet) {
  throw 'backend/.env still contains CHANGE_ME placeholders.'
}
$jwtSecret = Get-EnvironmentValue 'JWT_SECRET'
if (-not $jwtSecret -or $jwtSecret.Length -lt 32) {
  throw 'JWT_SECRET in backend/.env must contain at least 32 characters.'
}
$databaseUrl = Get-EnvironmentValue 'DATABASE_URL'
if (-not $databaseUrl -or $databaseUrl -notmatch '^mysql://') {
  throw 'DATABASE_URL in backend/.env must be a mysql:// URL.'
}

$gitChanges = @(& git.exe -C $projectRoot status --porcelain)
if ($gitChanges.Count -gt 0) {
  throw 'The Git worktree is not clean. Commit/push approved files or remove unintended files before installing production.'
}

New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot 'logs') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot 'backups') | Out-Null

Write-Host '[1/7] Installing locked backend dependencies...' -ForegroundColor Cyan
Invoke-Checked 'npm.cmd' @('ci', '--no-audit') $backendDir
Write-Host '[2/7] Generating Prisma client...' -ForegroundColor Cyan
Invoke-Checked 'npx.cmd' @('prisma', 'generate') $backendDir
Write-Host '[3/7] Installing locked frontend dependencies...' -ForegroundColor Cyan
Invoke-Checked 'npm.cmd' @('ci', '--no-audit') $frontendDir
Write-Host '[4/7] Building frontend and backend...' -ForegroundColor Cyan
Invoke-Checked 'npm.cmd' @('run', 'build') $frontendDir
Invoke-Checked 'npm.cmd' @('run', 'build') $backendDir

if (-not $SkipDatabaseMigration) {
  Write-Host '[5/7] Backing up database before migration...' -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot 'Backup-HRMS.ps1') | Out-Null
  Write-Host '[6/7] Applying reviewed Prisma migrations...' -ForegroundColor Cyan
  Invoke-Checked 'npx.cmd' @('prisma', 'migrate', 'deploy') $backendDir
} else {
  Write-Warning 'Database migration was skipped by operator request.'
}

$pm2 = Get-Command 'pm2.cmd' -ErrorAction SilentlyContinue
if (-not $pm2 -and -not $SkipPm2Install) {
  Write-Host 'Installing PM2 globally...' -ForegroundColor Cyan
  Invoke-Checked 'npm.cmd' @('install', '--global', 'pm2') $projectRoot
  $pm2 = Get-Command 'pm2.cmd' -ErrorAction SilentlyContinue
}
if (-not $pm2) { throw 'pm2.cmd is not available. Install PM2 or rerun without -SkipPm2Install.' }

Write-Host '[7/7] Starting RiskHRMS with PM2...' -ForegroundColor Cyan
Invoke-Checked $pm2.Source @('startOrReload', $ecosystemFile, '--update-env') $projectRoot
Invoke-Checked $pm2.Source @('save') $projectRoot

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
if (-not $health -or $health.status -ne 'ok') { throw 'RiskHRMS did not pass /health within 60 seconds. Check PM2 logs.' }

Write-Host '[OK] RiskHRMS production service is healthy at http://127.0.0.1:3000' -ForegroundColor Green
Write-Host 'Configure PM2 startup for the dedicated Windows service account and place HTTPS/reverse proxy in front before opening access beyond the trusted LAN.' -ForegroundColor Yellow
