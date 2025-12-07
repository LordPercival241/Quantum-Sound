#!/bin/bash
# Cargar configuración de NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "=================================================="
echo "   INICIANDO QUANTUM SOUNDS"
echo "=================================================="
echo "1. Espera a que aparezca el enlace 'Local: http://localhost:5173/'"
echo "2. Mantén presionado Ctrl y haz clic en ese enlace."
echo "3. O abre tu navegador y escribe: http://localhost:5173"
echo "=================================================="

# Ejecutar Backend en segundo plano
echo "🚀 Iniciando Servidor Cuántico (Backend)..."
venv/bin/python3 backend/app.py &
BACKEND_PID=$!

# Esperar un momento
sleep 2

# Ejecutar Frontend
echo "🎨 Iniciando Interfaz (Frontend)..."
npm run dev

# Al cerrar, matar el backend
kill $BACKEND_PID
