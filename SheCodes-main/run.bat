@echo off
title NeuroAid - Launch Platform
echo ========================================================
echo   Starting NeuroAid AI Platform (Backend + Frontend)
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking FastAPI Backend...
netstat -ano | findstr :8000 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo       Backend is ALREADY running on port 8000.
) else (
    echo       Starting FastAPI backend on port 8000...
    start "NeuroAid Backend (Port 8000)" cmd /k "cd /d "%~dp0backend" && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && python -m uvicorn main:app --reload --port 8000"
)

echo.
echo [2/3] Checking Vite Frontend...
netstat -ano | findstr :5173 | findstr LISTENING >nul
if %errorlevel% equ 0 (
    echo       Frontend is ALREADY running on port 5173.
) else (
    echo       Starting Vite frontend dev server on port 5173...
    start "NeuroAid Frontend (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"
)

echo.
echo [3/3] Opening application in your browser...
ping 127.0.0.1 -n 3 >nul
start http://localhost:5173

echo.
echo ========================================================
echo   NeuroAid is live at: http://localhost:5173
echo   Backend API is at:   http://localhost:8000
echo ========================================================
echo.
pause
