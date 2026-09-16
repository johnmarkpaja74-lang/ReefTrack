@echo off
setlocal

rem Always start ReefTrack from the folder that contains this launcher.
cd /d "%~dp0"

set "NPM_CMD="
for /f "delims=" %%I in ('where npm.cmd 2^>nul') do if not defined NPM_CMD set "NPM_CMD=%%I"

if not defined NPM_CMD (
  for /d %%I in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v*-win-x64") do (
    if exist "%%~fI\npm.cmd" set "NPM_CMD=%%~fI\npm.cmd"
  )
)

if not defined NPM_CMD if exist "%ProgramFiles%\nodejs\npm.cmd" set "NPM_CMD=%ProgramFiles%\nodejs\npm.cmd"

if not defined NPM_CMD (
  echo.
  echo Node.js and npm were not found.
  echo Install the Node.js LTS version, then open a new terminal.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\.bin\vite.cmd" (
  echo Installing ReefTrack dependencies...
  call "%NPM_CMD%" install
  if errorlevel 1 exit /b %errorlevel%
)

echo Starting ReefTrack...
echo Secure local address: https://localhost:5173
echo On your phone, open the HTTPS network address shown by Vite.
echo Accept the local certificate warning once, then allow Camera access.
call "%NPM_CMD%" run dev
