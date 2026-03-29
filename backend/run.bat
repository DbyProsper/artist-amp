@echo off
REM Artist Amp Backend Startup Script for Windows

echo.
echo ================================
echo  Artist Amp Backend Startup
echo ================================
echo.

REM Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python.exe -m venv venv
    echo.
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Check dependencies
echo Checking dependencies...
python -m pip show fastapi >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies (this may take a few minutes)...
    python -m pip install -r requirements.txt
    echo.
)

REM Start server
echo.
echo ================================
echo   Starting Backend Server
echo ================================
echo.
echo Server will be available at http://127.0.0.1:8000
echo Documentation available at http://127.0.0.1:8000/docs
echo Press CTRL+C to stop the server
echo.

python -m uvicorn main:app --host 127.0.0.1 --port 8000

pause
