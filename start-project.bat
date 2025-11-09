@echo off
echo Starting Brisbane Stress Map...
echo.

REM Start backend server in new window
echo [1/3] Starting backend server...
start "Backend Server" cmd /k "cd backend && python server.py"

REM Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

REM Start frontend server in new window
echo [2/3] Starting frontend server...
start "Frontend Server" cmd /k "cd frontend && python -m http.server 8000"

REM Wait for frontend server to start
timeout /t 2 /nobreak >nul

REM Open browser
echo [3/3] Opening browser...
start http://localhost:8000

echo.
echo ========================================
echo   Brisbane Stress Map is now running!
echo ========================================
echo   Frontend: http://localhost:8000
echo   Backend:  http://localhost:5001/api
echo ========================================
echo.
