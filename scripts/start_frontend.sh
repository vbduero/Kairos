#!/usr/bin/env bash
# ============================================================
#  start_frontend.sh — Arranca el servidor Vite (Linux/Mac)
#  Uso: bash scripts/start_frontend.sh
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

# Mostrar splash animado
if [ -f "$PYTHON" ]; then
    "$PYTHON" scripts/splash.py frontend
fi

cd frontend || exit 1

# Verificar que npm esté instalado
if ! command -v npm >/dev/null 2>&1; then
    echo ""
    echo -e "  ${RED}[ERROR]${RESET} npm no encontrado."
    echo -e "  ${WHITE}Instala Node.js desde https://nodejs.org (versión 18 o superior)${RESET}"
    echo ""
    exit 1
fi

echo -e "\n${DARK_BLUE}Iniciando servidor Vite...${RESET}\n"
npm run dev
