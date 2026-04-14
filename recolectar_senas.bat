@echo off
title Manos que Hablan - Recoleccion LSC

cd /d "%~dp0"
set PYTHON=backend\venv\Scripts\python.exe
set PYTHONIOENCODING=utf-8
chcp 65001 > nul

if not exist "%PYTHON%" (
    echo.
    echo  [ERROR] No se encontro el entorno virtual en backend\venv\
    echo  Instala las dependencias primero con:
    echo    cd backend
    echo    python -m venv venv
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo    cd ..
    echo.
    pause
    exit /b 1
)

%PYTHON% ai\scripts\recolectar_datos.py
