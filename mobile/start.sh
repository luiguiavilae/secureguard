#!/bin/bash
# Aumenta el límite de archivos abiertos para evitar EMFILE
ulimit -n 65536
# --no-dev desactiva el modo dev para entornos sin cuenta EAS
# Quitar --no-dev si quieres hot reload en modo desarrollo
npx expo start --android --go
