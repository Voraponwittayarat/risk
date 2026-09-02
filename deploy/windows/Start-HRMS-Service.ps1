param(
  [Parameter(Mandatory = $true)][string]$Pm2Path,
  [Parameter(Mandatory = $true)][string]$Pm2Home
)

$ErrorActionPreference = 'Stop'
$env:PM2_HOME = $Pm2Home
& $Pm2Path resurrect
exit $LASTEXITCODE
