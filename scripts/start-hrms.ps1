param([switch]$NoBrowser)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $projectRoot 'backend'
$frontendDir = Join-Path $projectRoot 'frontend'
$backendUrl = 'http://127.0.0.1:3000/api'
$frontendUrl = 'http://localhost:5173'

function Get-LanIPv4Address {
  try {
    $defaultRoutes = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
      Sort-Object RouteMetric, InterfaceMetric
    foreach ($route in $defaultRoutes) {
      $address = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
        Select-Object -First 1
      if ($address) { return $address.IPAddress }
    }
  } catch {
    # Fall back to DNS-based interface discovery on older Windows versions.
  }

  return [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
    Where-Object {
      $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
      $_.IPAddressToString -notlike '127.*' -and
      $_.IPAddressToString -notlike '169.254.*'
    } |
    Select-Object -First 1 |
    ForEach-Object IPAddressToString
}

$lanIp = Get-LanIPv4Address
$lanUrl = if ($lanIp) { "http://${lanIp}:5173" } else { $null }

function Write-Step([string]$Message) {
  Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-TcpPort([int]$Port) {
  $client = [System.Net.Sockets.TcpClient]::new()
  try {
    $result = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    if (-not $result.AsyncWaitHandle.WaitOne(800)) { return $false }
    $client.EndConnect($result)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Test-HttpUrl([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    return $false
  }
}

function Wait-HttpUrl([string]$Name, [string]$Url, [int]$TimeoutSeconds = 120) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-HttpUrl $Url) {
      Write-Host "[OK] $Name is ready: $Url" -ForegroundColor Green
      return
    }
    Start-Sleep -Seconds 1
  }
  throw "$Name did not become ready within $TimeoutSeconds seconds. Check its console window for the error."
}

function Start-NodeConsole([string]$Title, [string]$Directory, [string]$NpmCommand) {
  $escapedDirectory = $Directory.Replace("'", "''")
  $command = "Set-Location -LiteralPath '$escapedDirectory'; `$host.UI.RawUI.WindowTitle = '$Title'; npm.cmd $NpmCommand"
  Start-Process -FilePath 'powershell.exe' -ArgumentList @(
    '-NoLogo', '-NoProfile', '-NoExit', '-ExecutionPolicy', 'Bypass', '-Command', $command
  ) | Out-Null
}

try {
  Write-Host 'RiskHRMS - safe local launcher' -ForegroundColor White
  Write-Host "Project: $projectRoot" -ForegroundColor DarkGray

  if (-not (Test-Path -LiteralPath $backendDir) -or -not (Test-Path -LiteralPath $frontendDir)) {
    throw "Project folders are missing. Run this file from: $projectRoot"
  }
  if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Node.js is not installed or is missing from PATH.' }
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw 'npm is not installed or is missing from PATH.' }
  if (-not (Test-Path -LiteralPath (Join-Path $backendDir 'node_modules'))) { throw 'backend\node_modules is missing. Run npm install in the backend folder.' }
  if (-not (Test-Path -LiteralPath (Join-Path $frontendDir 'node_modules'))) { throw 'frontend\node_modules is missing. Run npm install in the frontend folder.' }

  Write-Step 'Checking XAMPP MariaDB on port 3306'
  if (-not (Test-TcpPort 3306)) {
    throw 'MariaDB is not running on localhost:3306. Open XAMPP Control Panel, start MySQL, then run run.bat again.'
  }
  Write-Host '[OK] MariaDB is accepting connections.' -ForegroundColor Green

  Write-Step 'Checking backend API on port 3000'
  if (Test-HttpUrl $backendUrl) {
    Write-Host '[OK] Existing backend will be reused.' -ForegroundColor Green
  } elseif (Test-TcpPort 3000) {
    throw 'Port 3000 is occupied, but RiskHRMS API is not healthy. Close the program using port 3000 and try again.'
  } else {
    Start-NodeConsole 'RiskHRMS Backend :3000' $backendDir 'run start:dev'
    Wait-HttpUrl 'Backend API' $backendUrl
  }

  Write-Step 'Checking frontend on port 5173'
  if (Test-HttpUrl $frontendUrl) {
    if ($lanUrl -and -not (Test-HttpUrl $lanUrl)) {
      throw 'Frontend on port 5173 is running in localhost-only mode. Close that frontend window and run run.bat again to enable LAN access.'
    }
    Write-Host '[OK] Existing LAN-enabled frontend will be reused.' -ForegroundColor Green
  } elseif (Test-TcpPort 5173) {
    throw 'Port 5173 is occupied, but RiskHRMS frontend is not healthy. Close the program using port 5173 and try again.'
  } else {
    Start-NodeConsole 'RiskHRMS Frontend LAN :5173' $frontendDir 'run dev -- --host 0.0.0.0 --port 5173 --strictPort'
    Wait-HttpUrl 'Frontend' $frontendUrl
  }

  Write-Step 'Opening RiskHRMS'
  if (-not $NoBrowser) {
    Start-Process $frontendUrl | Out-Null
  }
  Write-Host "`nRiskHRMS is ready: $frontendUrl" -ForegroundColor Green
  if ($lanUrl) {
    Write-Host "Other devices on this network: $lanUrl" -ForegroundColor Green
  } else {
    Write-Host 'LAN IP could not be detected. Run ipconfig and use http://<IPv4>:5173.' -ForegroundColor Yellow
  }
  Write-Host 'If Windows Firewall asks for permission, allow access on Private networks.' -ForegroundColor Yellow
  Write-Host 'You can close this launcher window. Keep newly opened server windows running.' -ForegroundColor DarkGray
  exit 0
} catch {
  Write-Host "`n[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  Write-Host 'Nothing was force-killed. Existing services and data were left unchanged.' -ForegroundColor Yellow
  exit 1
}
