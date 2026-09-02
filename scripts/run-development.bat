@echo off
setlocal
cd /d "%~dp0\.."
where node >nul 2>nul || (
  echo ERROR: Node.js is not installed or not in PATH.
  pause
  exit /b 1
)
if not exist node_modules call npm install
call npm start
