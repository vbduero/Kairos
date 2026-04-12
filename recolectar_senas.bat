@echo off
title Manos que Hablan - Pipeline de Datos

:: ================================================================
::  recolectar_senas.bat
:: ================================================================

cd /d "%~dp0"
set PYTHON=venv\Scripts\python.exe
set PYTHONIOENCODING=utf-8
chcp 65001 > nul

if not exist "%PYTHON%" (
    echo.
    echo  [ERROR] No se encontro el entorno virtual en venv\
    echo  Instala las dependencias primero con:
    echo    python -m venv venv
    echo    venv\Scripts\activate
    echo    pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

:MENU
cls
echo.
echo  ============================================================
echo   MANOS QUE HABLAN  Pipeline de Recoleccion de Senas
echo  ============================================================
echo.
echo   [1]  Recolectar senas
echo        Abre la camara para capturar secuencias de 15 frames.
echo        Puedes repetir esta opcion en sesiones distintas.
echo.
echo   [2]  Procesar y entrenar
echo        Ejecutar al terminar la recoleccion:
echo        augmentar -> preprocesar -> entrenar -> verificar
echo.
echo   [3]  Sesion completa (recolectar y luego entrenar)
echo.
echo   [0]  Salir
echo.
set /p OPCION="  Elige una opcion [0-3]: "

if "%OPCION%"=="1" goto RECOLECTAR
if "%OPCION%"=="2" goto PROCESAR
if "%OPCION%"=="3" goto TODO
if "%OPCION%"=="0" goto FIN
echo  Opcion no valida.
timeout /t 2 > nul
goto MENU


:: ----------------------------------------------------------------
:RECOLECTAR
cls
echo.
echo  ============================================================
echo   Recoleccion de senas
echo  ============================================================
echo.
echo   Se abrira una nueva terminal con la camara.
echo   - Presiona ENTER en esa terminal para grabar cada sena
echo   - Presiona N para saltar a la siguiente sena
echo   - Presiona Q para guardar y salir
echo.
pause > nul

start "Recoleccion LSC" /WAIT cmd /c "%PYTHON% ai\scripts\recolectar_datos.py & echo. & pause"

echo.
echo  [OK] Sesion finalizada. Los datos quedan en ai/datasets/sequences/
echo.
echo  Cuando termines TODAS las sesiones, elige la opcion [2]
echo  para procesar y entrenar el modelo.
echo.
pause
goto MENU


:: ----------------------------------------------------------------
:PROCESAR
cls
echo.
echo  ============================================================
echo   Procesamiento y entrenamiento
echo  ============================================================
echo.

echo  [1/4] Augmentando secuencias...
echo  ----------------------------------------------------------------
"%PYTHON%" ai\scripts\augmentar_datos.py
if errorlevel 1 (
    echo  [ERROR] augmentar_datos.py fallo. Verifica que existan secuencias en ai/datasets/sequences/
    pause
    goto MENU
)
echo  [OK] Augmentacion completada.
echo.

echo  [2/4] Preprocesando datos...
echo  ----------------------------------------------------------------
"%PYTHON%" ai\scripts\preprocesar_datos.py
if errorlevel 1 (
    echo  [ERROR] preprocesar_datos.py fallo.
    pause
    goto MENU
)
echo  [OK] Preprocesamiento completado.
echo.

echo  [3/4] Entrenando modelo LSTM (puede tardar varios minutos)...
echo  ----------------------------------------------------------------
"%PYTHON%" ai\scripts\entrenar_modelo.py
if errorlevel 1 (
    echo  [ERROR] entrenar_modelo.py fallo.
    pause
    goto MENU
)
echo  [OK] Entrenamiento completado.
echo.

echo  [4/4] Verificando el clasificador...
echo  ----------------------------------------------------------------
"%PYTHON%" ai\scripts\test_classifier.py
if errorlevel 1 (
    echo  [AVISO] test_classifier.py reporto problemas. Revisa los resultados.
    pause
    goto MENU
)
echo  [OK] Verificacion completada.
echo.

echo  ============================================================
echo   Pipeline finalizado con exito.
echo.
echo   Modelos guardados en:
echo     ai\models\saved\lsc_classifier.h5
echo     ai\models\saved\lsc_classifier.tflite
echo.
echo   Reinicia el backend para cargar el nuevo modelo:
echo     start_servers.bat
echo  ============================================================
echo.
pause
goto MENU


:: ----------------------------------------------------------------
:TODO
cls
echo.
echo  ============================================================
echo   Sesion completa: recoleccion + entrenamiento
echo  ============================================================
echo.
echo   Primero se abrira la camara. Cuando termines (Q),
echo   el pipeline de entrenamiento iniciara automaticamente.
echo.
pause > nul

start "Recoleccion LSC" /WAIT cmd /c "%PYTHON% ai\scripts\recolectar_datos.py & echo. & pause"
if errorlevel 1 (
    echo  [ERROR] La recoleccion fallo. No se iniciara el entrenamiento.
    pause
    goto MENU
)

echo  [OK] Recoleccion guardada. Iniciando pipeline...
echo.

echo  [1/4] Augmentando...
"%PYTHON%" ai\scripts\augmentar_datos.py
if errorlevel 1 ( echo  [ERROR] augmentar_datos.py fallo. & pause & goto MENU )
echo  [OK] Listo.

echo  [2/4] Preprocesando...
"%PYTHON%" ai\scripts\preprocesar_datos.py
if errorlevel 1 ( echo  [ERROR] preprocesar_datos.py fallo. & pause & goto MENU )
echo  [OK] Listo.

echo  [3/4] Entrenando...
"%PYTHON%" ai\scripts\entrenar_modelo.py
if errorlevel 1 ( echo  [ERROR] entrenar_modelo.py fallo. & pause & goto MENU )
echo  [OK] Listo.

echo  [4/4] Verificando...
"%PYTHON%" ai\scripts\test_classifier.py
if errorlevel 1 ( echo  [AVISO] test_classifier.py reporto problemas. & pause & goto MENU )
echo  [OK] Listo.

echo.
echo  ============================================================
echo   Sesion completa finalizada. Modelo actualizado.
echo   Reinicia el backend: start_servers.bat
echo  ============================================================
echo.
pause
goto MENU


:: ----------------------------------------------------------------
:FIN
echo.
echo  Hasta luego.
echo.
exit /b 0
