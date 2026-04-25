#!/bin/bash
# Script de instalaciÃ³n forzada de Java (JRE 17) para el Apktool
echo "[SYSTEM] Verificando entorno Java..."

# Crear carpeta para Java portÃ¡til
mkdir -p .jre
cd .jre

# Descargar JRE de Adoptium (Linux x64) si no existe
if [ ! -f "bin/java" ]; then
  echo "[SYSTEM] Descargando JRE portÃ¡til (Linux x64)..."
  curl -L https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.7%2B7/OpenJDK17U-jre_x64_linux_hotspot_17.0.7_7.tar.gz -o jre.tar.gz
  echo "[SYSTEM] Extrayendo archivos de Java..."
  tar -xzf jre.tar.gz --strip-components=1
  rm jre.tar.gz
  chmod +x bin/java
  echo "[SYSTEM] InstalaciÃ³n de Java completada en $(pwd)/bin/java"
else
  echo "[SYSTEM] Java ya estÃ¡ instalado en la carpeta local .jre"
fi

cd ..
echo "[SYSTEM] Proceso de verificaciÃ³n finalizado."
