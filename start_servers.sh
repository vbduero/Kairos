#!/bin/bash
# ================================================================
#  start_servers.sh — Equivalente Linux de start_servers.bat
#  Inicia backend y frontend en terminales separadas.
#  Pop!_OS / Ubuntu (GNOME): usa gnome-terminal
#
#  Uso:
#    chmod +x start_servers.sh   (solo la primera vez)
#    ./start_servers.sh
# ================================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Verificar entorno virtual del backend
if [ ! -f "$ROOT/backend/venv/bin/activate" ]; then
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

# Verificar que npm este disponible
if ! command -v npm &> /dev/null; then
    echo ""
    echo "  [ERROR] npm no encontrado. Instala Node.js:"
    echo "    sudo apt install nodejs npm"
    echo ""
    exit 1
fi

echo "Iniciando Servidor Backend..."
gnome-terminal \
    --title="Backend - Manos que Hablan" \
    -- bash -c "
        cd '$ROOT/backend'
        source venv/bin/activate
        echo '== Backend LSC iniciando =='
        uvicorn app.main:app --reload
        echo
        read -rp 'Presiona ENTER para cerrar...'
    "

echo "Iniciando Servidor Frontend..."
gnome-terminal \
    --title="Frontend - Manos que Hablan" \
    -- bash -c "
        cd '$ROOT/frontend'
        echo '== Frontend LSC iniciando =='
        npm run dev
        echo
        read -rp 'Presiona ENTER para cerrar...'
    "

echo ""
echo "===================================================="
echo "  Ambos servidores iniciados en terminales separadas."
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "===================================================="
