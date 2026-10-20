@echo off
title GRizal Soundboard Launcher
cd /d "%~dp0"
echo ======================================================
echo           Starting GRizal Stage Soundboard...
echo ======================================================
echo.
powershell.exe -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
