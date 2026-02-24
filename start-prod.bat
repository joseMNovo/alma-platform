@echo off
title Alma Platform - Production
echo Construyendo Alma Platform para produccion...
echo.
cd /d "%~dp0"
npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: El build fallo. Revisa los errores de arriba.
    pause
    exit /b 1
)
echo.
echo Build exitoso. Iniciando servidor de produccion...
echo.
npm start
pause
