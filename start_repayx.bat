@echo off
title RepayX Launcher
echo ========================================================
echo               Starting RepayX Full Stack
echo ========================================================
echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000 ...
start "RepayX Backend (FastAPI)" cmd /k "cd /d %~dp0 && backend\.venv\Scripts\python.exe -u backend\run.py"

echo Waiting for backend initialization...
timeout /t 3 /nobreak >nul

echo [2/2] Starting React Frontend on http://localhost:3000 ...
start "RepayX Frontend (Vite)" cmd /k "cd /d %~dp0 && npm --prefix frontend run dev"

echo.
echo ========================================================
echo All services launched!
echo Frontend UI : http://localhost:3000
echo Backend API : http://127.0.0.1:8000
echo API Docs    : http://127.0.0.1:8000/docs
echo ========================================================
