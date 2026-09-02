param(
  [string]$BackupDirectory = (Join-Path $env:ProgramData 'RiskHRMS\backups'),
  [switch]$IncludeUploads
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$environmentFile = Join-Path $projectRoot 'backend\.env'

function Get-EnvironmentValue([string]$Name) {
  if (-not (Test-Path -LiteralPath $environmentFile)) {
    throw "Missing environment file: $environmentFile"
  }
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

function Get-DatabaseDumpCommand {
  foreach ($candidate in @('mariadb-dump.exe', 'mysqldump.exe', 'mariadb-dump', 'mysqldump')) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
  }
  throw 'mariadb-dump or mysqldump was not found in PATH. Install MariaDB Client before deployment.'
}

$databaseUrl = Get-EnvironmentValue 'DATABASE_URL'
if (-not $databaseUrl) { throw 'DATABASE_URL is missing from backend/.env' }

try {
  $uri = [Uri]$databaseUrl
} catch {
  throw 'DATABASE_URL is not a valid mysql:// URL. The value was not printed for security.'
}

$userInfo = $uri.UserInfo -split ':', 2
$databaseUser = [Uri]::UnescapeDataString($userInfo[0])
$databasePassword = if ($userInfo.Length -gt 1) { [Uri]::UnescapeDataString($userInfo[1]) } else { '' }
$databaseName = [Uri]::UnescapeDataString($uri.AbsolutePath.TrimStart('/'))
$databasePort = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
if (-not $databaseUser -or -not $databaseName) { throw 'DATABASE_URL must include a database user and database name.' }

New-Item -ItemType Directory -Force -Path $BackupDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$dumpPath = Join-Path $BackupDirectory "riskhrms-db-$timestamp.sql"
$manifestPath = "$dumpPath.json"
$dumpCommand = Get-DatabaseDumpCommand
$previousMysqlPassword = $env:MYSQL_PWD

try {
  $env:MYSQL_PWD = $databasePassword
  & $dumpCommand @(
    '--single-transaction',
    '--routines',
    '--events',
    '--triggers',
    '--hex-blob',
    '--default-character-set=utf8mb4',
    "--host=$($uri.Host)",
    "--port=$databasePort",
    "--user=$databaseUser",
    "--result-file=$dumpPath",
    $databaseName
  )
  if ($LASTEXITCODE -ne 0) { throw "Database dump failed with exit code $LASTEXITCODE" }
} finally {
  if ($null -eq $previousMysqlPassword) { Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue }
  else { $env:MYSQL_PWD = $previousMysqlPassword }
}

$dumpFile = Get-Item -LiteralPath $dumpPath
if ($dumpFile.Length -lt 100) { throw "Database dump is unexpectedly small: $dumpPath" }
$checksum = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash
$commit = (& git.exe -C $projectRoot rev-parse HEAD).Trim()
$manifest = [ordered]@{
  created_at = (Get-Date).ToString('o')
  git_commit = $commit
  database_host = $uri.Host
  database_name = $databaseName
  dump_file = $dumpPath
  dump_bytes = $dumpFile.Length
  sha256 = $checksum
}
$manifest | ConvertTo-Json | Set-Content -LiteralPath $manifestPath -Encoding UTF8

if ($IncludeUploads) {
  $uploadDirectory = Get-EnvironmentValue 'UPLOAD_DIR'
  if ($uploadDirectory) {
    if (-not [IO.Path]::IsPathRooted($uploadDirectory)) {
      $uploadDirectory = [IO.Path]::GetFullPath((Join-Path (Join-Path $projectRoot 'backend') $uploadDirectory))
    }
    if (Test-Path -LiteralPath $uploadDirectory) {
      $uploadArchive = Join-Path $BackupDirectory "riskhrms-uploads-$timestamp.zip"
      Compress-Archive -LiteralPath $uploadDirectory -DestinationPath $uploadArchive -CompressionLevel Optimal
      Write-Host "[OK] Upload backup: $uploadArchive" -ForegroundColor Green
    } else {
      Write-Warning "UPLOAD_DIR does not exist; database backup is still valid."
    }
  }
}

Write-Host "[OK] Database backup: $dumpPath" -ForegroundColor Green
Write-Host "[OK] SHA-256: $checksum" -ForegroundColor Green
Write-Output $dumpPath
