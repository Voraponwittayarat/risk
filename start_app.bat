@echo off
chcp 65001 > nul
title HRMS2026 - Hospital Risk Management System
echo ========================================================
echo   กำลังเริ่มต้นระบบ HRMS2026 (โรงพยาบาลวังเจ้า)
echo ========================================================
echo.

echo 1. กำลังเปิด Backend Server (Port 3000)...
start "HRMS Backend (NestJS)" cmd /k "cd /d %~dp0backend && npm run build && node dist/src/main"

timeout /t 3 /nobreak > nul

echo 2. กำลังเปิด Frontend Server (Port 5173)...
start "HRMS Frontend (Vite React)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak > nul

echo 3. กำลังเปิด Web Browser...
start http://localhost:5173

echo.
echo ========================================================
echo   ระบบพร้อมใช้งานแล้วที่: http://localhost:5173
echo ========================================================
