@echo off
echo ========================================================
echo   ROADVISION AI - FULL STACK LAUNCHER (v2.0 PRO)
echo   1. Python FastAPI AI Engine (Port 8000)
echo   2. Node.js Express + MongoDB Gateway (Port 5000)
echo   3. React + Vite Frontend (Port 5173)
echo ========================================================

start "RoadVision Python AI Engine (Port 8000)" cmd /k "cd /d "%~dp0" && python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

start "RoadVision Node.js & MongoDB Server (Port 5000)" cmd /k "cd /d "%~dp0server" && node src/index.js"

start "RoadVision React Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo All services launched!
echo Open your browser at: http://localhost:5173
echo.
pause
