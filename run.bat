@echo off
title HRMS2026 - Development Server

echo ========================================================
echo   Starting HRMS2026 (Development Mode)
echo ========================================================
echo.

echo [1/3] Starting Backend (NestJS)...
start "HRMS Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"

echo [2/3] Starting Frontend (React/Vite)...
start "HRMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 /nobreak > nul

echo [3/3] Opening Web Browser...
start http://localhost:5173

echo.
echo ========================================================
echo   System is ready! 
echo   (Backend and Frontend opened in separate windows)
echo   You can close this window.
echo ========================================================
pause > nul
