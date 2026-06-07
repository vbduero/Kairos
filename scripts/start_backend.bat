5@echo off
title BACKEND - MQH

chcp 65001 > nul
cd /d "%~dp0\.."
backend\venv\Scripts\python.exe scripts\splash.py backend
cd backend
call venv\Scripts\activate
uvicorn app.main:app --reload
