@echo off
echo ========================================
echo   Invoice Guard - Starting Server
echo ========================================
echo.
echo Starting local server on port 8000...
echo.
echo Once started, open your browser to:
echo http://localhost:8000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

cd frontend
python -m http.server 8000

pause
