@echo off
setlocal
cd /d "%~dp0\.."
echo =============================================
echo Fleet ^& Machinery Desktop v0.1.2 - Windows Build
echo =============================================
where node >nul 2>nul || (
  echo ERROR: Node.js is not installed or not in PATH.
  echo Install Node.js LTS, reopen Command Prompt, then run this file again.
  pause
  exit /b 1
)
call npm install || goto :error
call npm run check || goto :error
call npm test || goto :error
call npm run build:win || goto :error
echo.
echo Build completed. See the release folder.
explorer "%cd%\release"
pause
exit /b 0
:error
echo.
echo Build failed. Read the error above.
pause
exit /b 1
