@echo off
echo ========================================================
echo   ROADVISION AI - FRONTEND WEB APPLICATION
echo ========================================================
echo.
echo For Laptop / Desktop Webcam:
echo   --> Open http://localhost:5173 (Recommended)
echo.
echo For Mobile Phone Camera across Wi-Fi:
echo   --> Open https://%COMPUTERNAME%:5173 or the Network HTTPS URL
echo.
cd /d "%~dp0frontend"
npm run dev -- --host
pause
