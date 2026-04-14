#!/usr/bin/env bash
# ============================================================
#  start_backend.sh — Arranca el servidor FastAPI (Linux/Mac)
#  Uso: bash scripts/start_backend.sh
# ============================================================

# Ir a la raíz del proyecto desde cualquier ubicación
cd "$(dirname "$0")/.." || exit 1

PYTHON="backend/venv/bin/python"

# Mostrar splash animado (mismo que Windows)
if [ -f "$PYTHON" ]; then
    "$PYTHON" scripts/splash.py backend
fi

cd backend || exit 1

# Activar entorno virtual
if [ ! -f "venv/bin/activate" ]; then
    echo ""
    echo "  [ERROR] No se encontró el entorno virtual en backend/venv/"
    echo "  Instala las dependencias primero:"
    echo ""
    echo "    cd backend"
    echo "    python3 -m venv venv"
    echo "    source venv/bin/activate"
    echo "    pip install -r requirements.txt"
    echo ""
    exit 1
fi

source venv/bin/activate
uvicorn app.main:app --reload
