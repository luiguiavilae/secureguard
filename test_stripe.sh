#!/usr/bin/env bash
# test_stripe.sh — Prueba flujo completo: OTP → servicio → Stripe PaymentIntent
set -euo pipefail

BASE_URL="https://secureguard-production-7349.up.railway.app"
PHONE="994790943"
FECHA_INICIO="2026-03-25T10:00:00"

# Formatea JSON si jq está disponible, si no muestra raw
fmt() { command -v jq &>/dev/null && jq . || cat; }

echo "============================================"
echo " SecureGuard — Test Stripe (modo test)"
echo "============================================"
echo ""

# ── 1. Enviar OTP ──────────────────────────────
echo "[1/4] Enviando OTP al +51${PHONE}..."
curl -s -X POST "${BASE_URL}/auth/send-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\"}" | fmt
echo ""

# ── 2. Verificar OTP ───────────────────────────
printf "[2/4] Ingresa el OTP recibido por SMS: "
read -r OTP_CODE

VERIFY_RESP=$(curl -s -X POST "${BASE_URL}/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"${PHONE}\",\"otp\":\"${OTP_CODE}\",\"tipo\":\"CLIENTE\"}")
echo "Respuesta verify-otp: ${VERIFY_RESP}"
echo ""

TOKEN=$(echo "${VERIFY_RESP}" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
if [ -z "${TOKEN}" ]; then
  echo "✗ No se obtuvo token. Revisa la respuesta arriba."
  exit 1
fi
echo "✓ Token JWT obtenido: ${TOKEN:0:40}..."
echo ""

# ── 3. Crear solicitud de servicio ─────────────
echo "[3/4] Creando solicitud de servicio..."
SERVICE_RAW=$(curl -sL -w "\n--- HTTP %{http_code} ---" \
  -X POST "${BASE_URL}/services" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"tipo_servicio\":\"acompanamiento\",\"distrito\":\"Miraflores\",\"fecha_inicio_solicitada\":\"${FECHA_INICIO}\",\"duracion_horas\":3,\"agentes_requeridos\":1,\"descripcion\":\"Test Stripe desde script\"}")
echo "Respuesta create service:"
echo "${SERVICE_RAW}"
echo ""

SERVICE_RESP=$(echo "${SERVICE_RAW}" | head -1)
SERVICE_ID=$(echo "${SERVICE_RESP}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "${SERVICE_ID}" ]; then
  echo "✗ No se pudo obtener service_id. Revisa la respuesta arriba."
  exit 1
fi
echo "✓ Servicio creado: ${SERVICE_ID}"
echo ""

# ── 4. Crear PaymentIntent con Stripe ─────────
echo "[4/4] Creando PaymentIntent (STRIPE_TEST)..."
PAYMENT_RAW=$(curl -s -w "\n--- HTTP %{http_code} ---" \
  -X POST "${BASE_URL}/payments/create-intent" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"service_request_id\":\"${SERVICE_ID}\",\"metodo_pago\":\"STRIPE_TEST\"}")
echo "Respuesta create-intent:"
echo "${PAYMENT_RAW}"
echo ""

PAYMENT_RESP=$(echo "${PAYMENT_RAW}" | head -1)
CLIENT_SECRET=$(echo "${PAYMENT_RESP}" | grep -o '"client_secret":"[^"]*"' | cut -d'"' -f4)

echo "============================================"
if [ -n "${CLIENT_SECRET}" ]; then
  echo " ✓ client_secret:"
  echo "   ${CLIENT_SECRET}"
else
  echo " ✗ client_secret no encontrado — revisa respuesta arriba"
fi
echo "============================================"
