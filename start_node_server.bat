@echo off
echo ========================================================
echo Starting RoadVision AI - Node.js Express & MongoDB Gateway
echo Port: 5000 | Storage: MongoDB
echo ========================================================
cd /d "%~dp0server"
node src/index.js
pause
