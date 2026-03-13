#!/usr/bin/env bash
# get_token.sh — Genera un JWT de desarrollo para SecureGuard
# Uso: ./get_token.sh [puerto]     (puerto por defecto: 8001)

set -euo pipefail

PORT="${1:-8001}"
BASE="http://localhost:${PORT}"
PHONE="987654321"

echo "🔑 SecureGuard — generador de token de desarrollo"
echo "   Servidor: ${BASE}"
echo "   Teléfono: ${PHONE}"
echo ""

# 1. Solicitar OTP
echo "▶ Solicitando OTP..."
SEND_RESP=$(curl -sf -X POST "${BASE}/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"${PHONE}\"}" 2>&1) || {
  echo "❌ No se pudo conectar al servidor en ${BASE}"
  echo "   Asegúrate de que el backend está corriendo:"
  echo "   cd backend && uvicorn main:app --port ${PORT} --reload"
  exit 1
}

echo "   Respuesta: ${SEND_RESP}"
echo ""
echo "📋 Revisa el log del servidor para ver el OTP:"
echo "   INFO: routers.auth — 🔐 [MOCK] OTP para ${PHONE}: XXXXXX"
echo ""

# 2. Pedir el OTP al usuario
read -rp "✏️  Ingresa el OTP que aparece en el log del servidor: " OTP

if [[ ! "${OTP}" =~ ^[0-9]{6}$ ]]; then
  echo "❌ OTP inválido. Debe ser exactamente 6 dígitos numéricos."
  exit 1
fi

# 3. Verificar OTP y obtener token
echo ""
echo "▶ Verificando OTP..."
VERIFY_RESP=$(curl -sf -X POST "${BASE}/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"${PHONE}\", \"otp\": \"${OTP}\", \"tipo\": \"CLIENTE\"}" 2>&1) || {
  echo "❌ Error al verificar el OTP. Respuesta: ${VERIFY_RESP}"
  exit 1
}

# 4. Extraer el token (requiere python3 o jq)
if command -v python3 &>/dev/null; then
  TOKEN=$(echo "${VERIFY_RESP}" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
elif command -v jq &>/dev/null; then
  TOKEN=$(echo "${VERIFY_RESP}" | jq -r '.access_token')
else
  echo "✅ OTP verificado. Copia el access_token manualmente:"
  echo "${VERIFY_RESP}"
  exit 0
fi

# 5. Exportar y mostrar resultado
export TOKEN

echo ""
echo "✅ TOKEN listo. Úsalo con:"
echo ""
echo "   export TOKEN=\"${TOKEN}\""
echo ""
echo "   curl -H 'Authorization: Bearer \$TOKEN' ${BASE}/agents/available?distrito=miraflores&tipo_servicio=personal&fecha=2025-01-01&hora=10:00"
echo ""
echo "   # Probar el perfil de salud:"
echo "   curl ${BASE}/health"
