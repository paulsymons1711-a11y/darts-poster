@echo off
title Darts Poster
cd /d "%~dp0"
:loop
node src\index.js
echo Darts Poster stopped - restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop
