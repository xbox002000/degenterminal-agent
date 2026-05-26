@echo off
title ProfitEngine AI - Automation Launcher
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -NoProfile -File "launcher.ps1"
pause
