#!/usr/bin/env bash
# ============================================================
#  start_backend.sh — Arranca el servidor FastAPI (Linux/Mac)
#  Uso: bash scripts/start_backend.sh
# ============================================================

# Colour palette (ANSI 24‑bit) – fallback to basic colours if not supported
DARK_BLUE='\033[38;2;10;31;68m'
TURQUOISE='\033[38;2;111;216;240m'
MINT='\033[38;2;0;201;167m'
WHITE='\033[38;2;255;255;255m'
RED='\033[0;31m'
RESET='\033[0m'

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
    echo -e "  ${RED}[ERROR]${RESET} No se encontró el entorno virtual en backend/venv/"
    echo "  Instala las dependencias primero:"
    echo ""
    echo -e "    ${WHITE}cd backend${RESET}"
    echo -e "    ${WHITE}python3 -m venv venv${RESET}"
    echo -e "    ${WHITE}source venv/bin/activate${RESET}"
    echo -e "    ${WHITE}pip install -r requirements.txt${RESET}"
    echo ""
    exit 1
fi

source venv/bin/activate
# Inform user that server is starting with dark‑blue accent
echo -e "\n${DARK_BLUE}Iniciando servidor FastAPI...${RESET}\n"
uvicorn app.main:app --reload
