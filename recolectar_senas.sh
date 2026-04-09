#!/bin/bash
# ================================================================
#  recolectar_senas.sh — Equivalente Linux de recolectar_senas.bat
#  Pipeline de recoleccion y entrenamiento de senas LSC.
#  Pop!_OS / Ubuntu (GNOME)
#
#  Uso:
#    chmod +x recolectar_senas.sh   (solo la primera vez)
#    ./recolectar_senas.sh
# ================================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$ROOT/backend/venv/bin/python"
ACTIVATE="$ROOT/backend/venv/bin/activate"

# Verificar entorno virtual
if [ ! -f "$ACTIVATE" ]; then
    echo ""
    echo "  [ERROR] No se encontro backend/venv/"
    echo "  Instala las dependencias primero:"
    echo "    cd backend"
    echo "    python3 -m venv venv"
    echo "    source venv/bin/activate"
    echo "    pip install -r requirements.txt"
    echo ""
    exit 1
fi

# Activar venv para todo el script
source "$ACTIVATE"

# ----------------------------------------------------------------
menu() {
    clear
    echo ""
    echo "  ============================================================"
    echo "   MANOS QUE HABLAN  Pipeline de Recoleccion de Senas"
    echo "  ============================================================"
    echo ""
    echo "   [1]  Recolectar senas"
    echo "        Abre la camara para capturar secuencias de 15 frames."
    echo "        Puedes repetir esta opcion en sesiones distintas."
    echo ""
    echo "   [2]  Procesar y entrenar"
    echo "        Ejecutar al terminar la recoleccion:"
    echo "        augmentar -> preprocesar -> entrenar -> verificar"
    echo ""
    echo "   [3]  Sesion completa (recolectar y luego entrenar)"
    echo ""
    echo "   [0]  Salir"
    echo ""
    read -rp "  Elige una opcion [0-3]: " OPCION

    case "$OPCION" in
        1) recolectar ;;
        2) procesar ;;
        3) todo ;;
        0) echo ""; echo "  Hasta luego."; echo ""; exit 0 ;;
        *) echo "  Opcion no valida."; sleep 1; menu ;;
    esac
}

# ----------------------------------------------------------------
recolectar() {
    clear
    echo ""
    echo "  ============================================================"
    echo "   Recoleccion de senas"
    echo "  ============================================================"
    echo ""
    echo "   - La ventana de la camara se abrira automaticamente"
    echo "   - Presiona ENTER en esta terminal para grabar cada sena"
    echo "   - Presiona N para saltar a la siguiente sena"
    echo "   - Presiona Q para guardar y salir"
    echo ""
    echo "   Los datos se guardan en: ai/datasets/sequences/"
    echo ""
    read -rp "  Presiona ENTER para continuar..."
    echo ""

    cd "$ROOT"
    python ai/scripts/recolectar_datos.py
    STATUS=$?

    echo ""
    if [ $STATUS -ne 0 ]; then
        echo "  [ERROR] La recoleccion termino con errores (codigo $STATUS)."
        echo "  Verifica que la camara este disponible:"
        echo "    ls /dev/video*"
        read -rp "  Presiona ENTER para volver al menu..."
    else
        echo "  [OK] Sesion guardada en ai/datasets/sequences/"
        echo ""
        echo "  Cuando termines TODAS las sesiones, elige la opcion [2]"
        echo "  para procesar y entrenar el modelo."
        read -rp "  Presiona ENTER para volver al menu..."
    fi

    menu
}

# ----------------------------------------------------------------
procesar() {
    clear
    echo ""
    echo "  ============================================================"
    echo "   Procesamiento y entrenamiento"
    echo "  ============================================================"
    echo ""
    cd "$ROOT"

    echo "  [1/4] Augmentando secuencias..."
    echo "  ----------------------------------------------------------------"
    python ai/scripts/augmentar_datos.py
    if [ $? -ne 0 ]; then
        echo ""
        echo "  [ERROR] augmentar_datos.py fallo."
        echo "  Verifica que existan secuencias en ai/datasets/sequences/"
        read -rp "  Presiona ENTER para volver al menu..."
        menu; return
    fi
    echo "  [OK] Augmentacion completada."
    echo ""

    echo "  [2/4] Preprocesando datos..."
    echo "  ----------------------------------------------------------------"
    python ai/scripts/preprocesar_datos.py
    if [ $? -ne 0 ]; then
        echo ""
        echo "  [ERROR] preprocesar_datos.py fallo."
        read -rp "  Presiona ENTER para volver al menu..."
        menu; return
    fi
    echo "  [OK] Preprocesamiento completado."
    echo ""

    echo "  [3/4] Entrenando modelo LSTM (puede tardar varios minutos)..."
    echo "  ----------------------------------------------------------------"
    python ai/scripts/entrenar_modelo.py
    if [ $? -ne 0 ]; then
        echo ""
        echo "  [ERROR] entrenar_modelo.py fallo."
        echo "  Verifica que tensorflow este instalado:"
        echo "    pip install tensorflow-cpu==2.17.0"
        read -rp "  Presiona ENTER para volver al menu..."
        menu; return
    fi
    echo "  [OK] Entrenamiento completado."
    echo ""

    echo "  [4/4] Verificando el clasificador..."
    echo "  ----------------------------------------------------------------"
    python ai/scripts/test_classifier.py
    if [ $? -ne 0 ]; then
        echo ""
        echo "  [AVISO] test_classifier.py reporto problemas. Revisa los resultados."
        read -rp "  Presiona ENTER para volver al menu..."
        menu; return
    fi
    echo "  [OK] Verificacion completada."
    echo ""

    echo "  ============================================================"
    echo "   Pipeline finalizado con exito."
    echo ""
    echo "   Modelos guardados en:"
    echo "     ai/models/saved/lsc_classifier.h5"
    echo "     ai/models/saved/lsc_classifier.tflite"
    echo ""
    echo "   Reinicia el backend para cargar el nuevo modelo:"
    echo "     ./start_servers.sh"
    echo "  ============================================================"
    echo ""
    read -rp "  Presiona ENTER para volver al menu..."
    menu
}

# ----------------------------------------------------------------
todo() {
    clear
    echo ""
    echo "  ============================================================"
    echo "   Sesion completa: recoleccion + entrenamiento"
    echo "  ============================================================"
    echo ""
    echo "   Primero se abrira la camara. Cuando termines (Q),"
    echo "   el pipeline de entrenamiento iniciara automaticamente."
    echo ""
    read -rp "  Presiona ENTER para continuar..."
    echo ""

    cd "$ROOT"

    echo "  -- FASE 1: Recoleccion ------------------------------------------"
    echo ""
    python ai/scripts/recolectar_datos.py
    if [ $? -ne 0 ]; then
        echo ""
        echo "  [ERROR] La recoleccion fallo. No se iniciara el entrenamiento."
        read -rp "  Presiona ENTER para volver al menu..."
        menu; return
    fi
    echo "  [OK] Recoleccion guardada."
    echo ""

    echo "  -- FASE 2: Procesamiento y entrenamiento ------------------------"
    echo ""

    echo "  [1/4] Augmentando..."
    python ai/scripts/augmentar_datos.py
    if [ $? -ne 0 ]; then echo "  [ERROR] augmentar_datos.py fallo."; read -rp "ENTER..."; menu; return; fi
    echo "  [OK] Listo."
    echo ""

    echo "  [2/4] Preprocesando..."
    python ai/scripts/preprocesar_datos.py
    if [ $? -ne 0 ]; then echo "  [ERROR] preprocesar_datos.py fallo."; read -rp "ENTER..."; menu; return; fi
    echo "  [OK] Listo."
    echo ""

    echo "  [3/4] Entrenando..."
    python ai/scripts/entrenar_modelo.py
    if [ $? -ne 0 ]; then echo "  [ERROR] entrenar_modelo.py fallo."; read -rp "ENTER..."; menu; return; fi
    echo "  [OK] Listo."
    echo ""

    echo "  [4/4] Verificando..."
    python ai/scripts/test_classifier.py
    if [ $? -ne 0 ]; then echo "  [AVISO] test_classifier.py reporto problemas."; read -rp "ENTER..."; menu; return; fi
    echo "  [OK] Listo."
    echo ""

    echo "  ============================================================"
    echo "   Sesion completa finalizada. Modelo actualizado."
    echo "   Reinicia el backend: ./start_servers.sh"
    echo "  ============================================================"
    echo ""
    read -rp "  Presiona ENTER para volver al menu..."
    menu
}

# ----------------------------------------------------------------
# Punto de entrada
menu
