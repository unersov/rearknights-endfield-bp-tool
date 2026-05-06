@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Starting Endfield BP Tool UI...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Please install Node.js first:
  echo https://nodejs.org/
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Opening browser when the dev server is ready...
call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --open

pause
