@echo off
echo Starting Decentralized Health Management System
echo ==============================================
echo.

echo [1/3] Starting Flask Backend Server...
cd /d "%~dp0backend"
start "Flask Backend" cmd /k "python app.py"

echo.
echo [2/3] Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

echo.
echo [3/3] Starting React Frontend...
cd /d "%~dp0frontend"
start "React Frontend" cmd /k "npm run dev"

echo.
echo ==============================================
echo System is starting up...
echo.
echo Frontend will be available at: http://localhost:5173
echo Backend API will be available at: http://localhost:5000
echo.
echo Press any key to open the application in your browser...
pause >nul

start http://localhost:5173

echo.
echo Application started! Check the console windows for status.
echo Press Ctrl+C in each console window to stop the servers.
