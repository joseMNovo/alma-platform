#!/bin/bash
echo "Construyendo Alma Platform para produccion..."
cd "$(dirname "$0")"

npm run build
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: El build fallo. Revisa los errores de arriba."
    exit 1
fi

echo ""
echo "Build exitoso. Iniciando servidor de produccion..."
npm start
