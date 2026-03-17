@echo off
echo Starting Production & Logistics Tracking System
echo ===========================================

echo.
echo 1. Starting Backend Server...
cd backend
start "Backend Server" cmd /k "python main.py"

echo.
echo 2. Starting Frontend Server...
cd ../frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ===========================================
echo System is starting up...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173
echo API Docs: http://localhost:8000/docs
echo ===========================================
echo.
echo Press any key to exit...
pause >nul
