param(
  [string]$TaskName = 'RiskHRMS PM2 Startup',
  [switch]$Replace
)

$ErrorActionPreference = 'Stop'
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Run this script from an elevated PowerShell window (Run as administrator).'
}

$existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existingTask -and -not $Replace) {
  throw "Scheduled task '$TaskName' already exists. Inspect it first; use -Replace only when you intend to replace it."
}

$pm2 = Get-Command 'pm2.cmd' -ErrorAction SilentlyContinue
if (-not $pm2) { throw 'pm2.cmd is missing from PATH. Run Install-HRMS.ps1 first.' }
$serviceLauncher = Join-Path $PSScriptRoot 'Start-HRMS-Service.ps1'
$pm2Home = Join-Path $env:USERPROFILE '.pm2'
$defaultUser = if ($env:USERDOMAIN) { "$env:USERDOMAIN\$env:USERNAME" } else { $env:USERNAME }
$credential = Get-Credential -UserName $defaultUser -Message 'Enter the password of the dedicated RiskHRMS service account for the startup task.'
if (-not $credential) { throw 'Credential entry was cancelled.' }

$arguments = "-NoLogo -NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$serviceLauncher`" -Pm2Path `"$($pm2.Source)`" -Pm2Home `"$pm2Home`""
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arguments
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

$registration = @{
  TaskName = $TaskName
  Action = $action
  Trigger = $trigger
  Settings = $settings
  User = $credential.UserName
  Password = $credential.GetNetworkCredential().Password
  RunLevel = 'Highest'
  Force = $true
}
Register-ScheduledTask @registration | Out-Null

Start-ScheduledTask -TaskName $TaskName
Start-Sleep -Seconds 5
$taskInfo = Get-ScheduledTaskInfo -TaskName $TaskName
if ($taskInfo.LastTaskResult -ne 0 -and $taskInfo.LastTaskResult -ne 267009) {
  throw "Startup task returned code $($taskInfo.LastTaskResult). Inspect Task Scheduler and PM2 logs."
}

Write-Host "[OK] Registered and tested scheduled task: $TaskName" -ForegroundColor Green
Write-Host 'Run pm2 status and reboot during a maintenance window to complete startup verification.' -ForegroundColor Yellow
