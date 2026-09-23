@echo off
title KHOI DONG HE THONG TASKMASTER AI
chcp 65001 >nul

cd /d "%~dp0"

echo ===================================================
echo      DANG KHOI DONG HE THONG (NHOM 4)
echo ===================================================
echo.

:: ------ 1. XU LY BACKEND ------
echo [1/2] Kiem tra Backend...
if exist "backend\venv\Scripts\activate.bat" goto start_backend

echo =^> May moi: Dang tao moi truong Backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

:start_backend
echo =^> Dang bat server Backend...
start "Backend Server (FastAPI)" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"


:: ------ 2. XU LY FRONTEND ------
echo.
echo [2/2] Kiem tra Frontend...
if exist "frontend\node_modules" goto start_frontend

echo =^> May moi: Dang tai thu vien Frontend (mat khoang 1-2 phut)...
cd frontend
call npm install
cd ..

:start_frontend
echo =^> Dang bat server Frontend...
start "Frontend Server (React)" cmd /k "cd /d "%~dp0frontend" && npm run dev"


:: ------ 3. MO TRINH DUYET ------
echo.
echo ===================================================
echo Hoan tat! Trinh duyet se tu dong mo sau 8 giay...
echo ===================================================
timeout /t 8 /nobreak >nul
start http://localhost:5173