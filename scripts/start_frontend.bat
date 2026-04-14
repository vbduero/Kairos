@echo off
title FRONTEND - MQH
chcp 65001 > nul
cd /d "%~dp0\.."
backend\venv\Scripts\python.exe scripts\splash.py frontend
cd frontend
npm run dev
