@echo off
echo Iniciando Servidor Backend...
start cmd /k "cd backend && call venv\Scripts\activate && uvicorn app.main:app --reload"

echo Iniciando Servidor Frontend...
start cmd /k "cd frontend && npm run dev"

echo ====================================================
echo  Ambos servidores han sido iniciados en ventanas
echo  consola diferentes. Puedes cerrar esta ventana.
echo ====================================================
pause
