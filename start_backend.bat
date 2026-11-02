@echo off
echo ========================================================
echo   ROADVISION AI - BACKEND SERVICES LAUNCHER
echo   1. Python FastAPI AI Engine (Port 8000)
echo   2. Node.js Express & MongoDB Gateway (Port 5000)
echo ========================================================

start "RoadVision Node.js & MongoDB Server (Port 5000)" cmd /k "cd /d "%~dp0server" && node src/index.js"

echo Starting RoadVision Python FastAPI Backend on port 8000...
cd /d "%~dp0"
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
