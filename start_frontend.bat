@echo off
echo ========================================================
echo   ROADVISION AI - FRONTEND WEB APPLICATION
echo ========================================================
echo.
echo Launching React + Vite Frontend on http://localhost:5173...
echo.
cd /d "%~dp0frontend"
timeout /t 2 /nobreak >nul
start http://localhost:5173
npm run dev -- --host
pause
