#!/usr/bin/env bash
# ============================================================
#  start_frontend.sh — Arranca el servidor Vite (Linux/Mac)
#  Uso: bash scripts/start_frontend.sh
# ============================================================

# Ir a la raíz del proyecto desde cualquier ubicación
cd "$(dirname "$0")/.." || exit 1

PYTHON="backend/venv/bin/python"

# Mostrar splash animado
if [ -f "$PYTHON" ]; then
    "$PYTHON" scripts/splash.py frontend
fi

cd frontend || exit 1

# Verificar que npm esté instalado
if ! command -v npm &>/dev/null; then
    echo ""
    echo "  [ERROR] npm no encontrado."
    echo "  Instala Node.js desde https://nodejs.org (versión 18 o superior)"
    echo ""
    exit 1
fi

npm run dev
