@echo off
title Darts Poster setup
cd /d "%~dp0"
echo ==========================================
echo   Darts Poster - setup
echo ==========================================

rem ---- 1. Node.js ----
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js not found - installing it now...
  winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  echo.
  echo Node.js installed. CLOSE this window and double-click INSTALL.bat again.
  pause
  exit /b
)

rem ---- 1b. Remove the old background copy (pm2) from the first version ----
where pm2 >nul 2>nul
if not errorlevel 1 (
  echo Removing the old version that is still running...
  call pm2 delete darts-poster >nul 2>nul
  call pm2 save --force >nul 2>nul
  call pm2 kill >nul 2>nul
  call pm2-startup uninstall >nul 2>nul
)

rem ---- 2. App files ----
echo Installing app files (takes a minute or two)...
call npm install --omit=dev
if errorlevel 1 ( echo Install failed - check the internet and try again. & pause & exit /b )

rem ---- 3. Settings + password ----
node src\setup.js

rem ---- 4. Start with Windows ----
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
> "%STARTUP%\DartsPoster.bat" echo @echo off
>> "%STARTUP%\DartsPoster.bat" echo start "Darts Poster" /min "%~dp0run.bat"
echo Darts Poster will start automatically when the PC turns on.

rem ---- 5. Allow phones on the Wi-Fi ----
netsh advfirewall firewall delete rule name="Darts Poster" >nul 2>nul
netsh advfirewall firewall add rule name="Darts Poster" dir=in action=allow protocol=TCP localport=3060 profile=private,domain >nul 2>nul

rem ---- 6. Stop any copy already running, then start ----
powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'darts-poster|src\\index\.js' -and $_.ProcessId -ne $PID -and $_.Name -match 'node|cmd' -and $_.CommandLine -notmatch 'INSTALL' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>&1
timeout /t 2 /nobreak >nul
start "Darts Poster" /min "%~dp0run.bat"

echo.
echo ==========================================
echo  DONE. Open the dashboard on your phone (same Wi-Fi):
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do for /f "tokens=*" %%b in ("%%a") do echo     http://%%b:3060
echo  Away from home: add posts.bullseyebroadcast.xyz to your Cloudflare tunnel (see README)
echo ==========================================
timeout /t 4 >nul
start http://localhost:3060
pause
