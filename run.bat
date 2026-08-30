@echo off
setlocal
chcp 65001 > nul
title RiskHRMS Launcher

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-hrms.ps1"
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo RiskHRMS could not be started. See the message above.
  pause
)

exit /b %EXIT_CODE%
