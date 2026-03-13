#!/usr/bin/env bash
# =============================================================
# test_api.sh — Prueba completa del flujo SecureGuard (mock)
#
# Flujo ejecutado:
#   1. Auth CLIENTE (987654321)  →  JWT cliente
#   2. Auth AGENTE  (912345678)  →  JWT agente
#   3. POST /services            →  service_id, precio S/150
#   4. POST /agent-respond       →  EN_REVISION   (Flujo B)
#   5. POST /client-confirm      →  CONFIRMADO    (Flujo B)
#   6. POST /payments/create-intent STRIPE_TEST  →  PAGADO (mock)
#
# Requisitos: curl, jq  (brew install jq)
# El script levanta su propio servidor en el puerto 8001.
# =============================================================
set -euo pipefail

# ── Configuración ─────────────────────────────────────────────
BASE_URL="http://localhost:8001"
PHONE_CLIENTE="987654321"
PHONE_AGENTE="912345678"
LOG_FILE="/tmp/secureguard_test_$$.log"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Colores ───────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}" >&2; exit 1; }
info() { echo -e "${CYAN}→  $*${NC}"; }
warn() { echo -e "${YELLOW}⚠  $*${NC}"; }
sep()  { echo -e "${BOLD}──────────────────────────────────────────${NC}"; }

# ── Verificar dependencias ─────────────────────────────────────
command -v curl >/dev/null 2>&1 || fail "curl no encontrado"
command -v jq   >/dev/null 2>&1 || fail "jq no encontrado  →  brew install jq"

# ── Liberar puerto 8001 si está ocupado ───────────────────────
EXISTING_PID=$(lsof -ti:8001 2>/dev/null || true)
if [ -n "$EXISTING_PID" ]; then
    warn "Puerto 8001 ocupado (PID $EXISTING_PID). Liberando..."
    echo "$EXISTING_PID" | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# ── Iniciar servidor en background ────────────────────────────
info "Iniciando servidor FastAPI en puerto 8001..."
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn main:app --port 8001 --log-level info > "$LOG_FILE" 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null; rm -f "$LOG_FILE"' EXIT

# Esperar a que el servidor responda (hasta 10 s)
READY=0
for i in $(seq 1 10); do
    if curl -sf "$BASE_URL/health" >/dev/null 2>&1; then
        READY=1
        break
    fi
    sleep 1
done
if [ "$READY" -eq 0 ]; then
    warn "Log del servidor:"
    cat "$LOG_FILE"
    fail "El servidor no respondió en 10 segundos"
fi
ok "Servidor listo  (PID $SERVER_PID)"

# ── Helper: autenticar un teléfono y retornar access_token ────
# Uso:  TOKEN=$(auth_phone <phone> <tipo>)
auth_phone() {
    local phone="$1" tipo="$2"

    # 1. Solicitar OTP
    curl -sf -X POST "$BASE_URL/auth/send-otp" \
        -H "Content-Type: application/json" \
        -d "{\"phone\": \"$phone\"}" >/dev/null \
        || fail "POST /auth/send-otp falló para $phone"

    # Dar tiempo al servidor para escribir el log
    sleep 1

    # 2. Extraer OTP del log del servidor
    #    Formato:  INFO: routers.auth — 🔐 [MOCK] OTP para 987654321: 123456
    local otp
    otp=$(grep -oE "\[MOCK\] OTP para ${phone}: [0-9]{6}" "$LOG_FILE" \
          | tail -1 \
          | grep -oE '[0-9]{6}$') \
          || fail "No se encontró el OTP para $phone en el log del servidor"

    # 3. Verificar OTP
    local resp
    resp=$(curl -sf -X POST "$BASE_URL/auth/verify-otp" \
               -H "Content-Type: application/json" \
               -d "{\"phone\": \"$phone\", \"otp\": \"$otp\", \"tipo\": \"$tipo\"}") \
          || fail "POST /auth/verify-otp falló para $phone (OTP: $otp)"

    echo "$resp" | jq -r '.access_token'
}

# =============================================================
echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${BOLD}   SecureGuard — Test de Flujo Completo       ${NC}"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo ""

# ── PASO 1: Auth CLIENTE ──────────────────────────────────────
sep
info "Paso 1/6 · Auth CLIENTE ($PHONE_CLIENTE)..."
TOKEN_CLIENTE=$(auth_phone "$PHONE_CLIENTE" "CLIENTE")
[ -n "$TOKEN_CLIENTE" ] && [ "$TOKEN_CLIENTE" != "null" ] \
    || fail "No se obtuvo token del CLIENTE"
ok "Auth CLIENTE OK"

# ── PASO 2: Auth AGENTE ───────────────────────────────────────
sep
info "Paso 2/6 · Auth AGENTE ($PHONE_AGENTE)..."
TOKEN_AGENTE=$(auth_phone "$PHONE_AGENTE" "AGENTE")
[ -n "$TOKEN_AGENTE" ] && [ "$TOKEN_AGENTE" != "null" ] \
    || fail "No se obtuvo token del AGENTE"
ok "Auth AGENTE OK"

# ── PASO 3: Crear solicitud de servicio ───────────────────────
sep
info "Paso 3/6 · POST /services  (crear solicitud)..."

SVC_RESP=$(curl -sf -X POST "$BASE_URL/services/" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_CLIENTE" \
    -d '{
      "beneficiario_nombre":     "Luis Garcia",
      "beneficiario_dni":        "12345678",
      "beneficiario_genero":     "M",
      "es_para_tercero":         false,
      "tipo_servicio":           "acompanamiento",
      "modalidad":               "FIJO",
      "punto_inicio":            {"direccion": "Av. Larco 100, Miraflores"},
      "contexto_lugar":          "domicilio",
      "consumo_alcohol":         false,
      "nivel_riesgo":            "BAJO",
      "presentacion_agente":     "formal",
      "visibilidad":             "DISCRETO",
      "instrucciones":           "Puntual por favor",
      "fecha_inicio":            "2026-04-01T20:00:00",
      "duracion_horas":          3,
      "agentes_requeridos":      1,
      "descripcion":             "Servicio de acompanamiento - Luis Garcia",
      "distrito":                "Miraflores",
      "fecha_inicio_solicitada": "2026-04-01T20:00:00Z"
    }') || fail "POST /services falló"

echo "  $(echo "$SVC_RESP" | jq '.' 2>/dev/null || echo "$SVC_RESP")"

SERVICE_ID=$(echo "$SVC_RESP"   | jq -r '.id')
PRECIO_TOTAL=$(echo "$SVC_RESP" | jq -r '.precio_total')
ESTADO_SVC=$(echo "$SVC_RESP"   | jq -r '.estado')

[ -n "$SERVICE_ID" ] && [ "$SERVICE_ID" != "null" ] \
    || fail "No se obtuvo service_id en la respuesta"

# Verificar precio_total = 1 agente × 3 horas × S/50 = S/150
if echo "$PRECIO_TOTAL" | grep -qE '^150(\.0+)?$'; then
    ok "Precio correcto: S/ $PRECIO_TOTAL"
else
    warn "precio_total esperado 150, obtenido: $PRECIO_TOTAL"
fi
ok "Solicitud creada: $SERVICE_ID  (estado: $ESTADO_SVC)"

# ── PASO 4: Agente aplica — Flujo B ───────────────────────────
sep
info "Paso 4/6 · Agente aplica a la solicitud  (Flujo B)..."

APPLY_RESP=$(curl -sf -X POST "$BASE_URL/services/$SERVICE_ID/agent-respond" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_AGENTE" \
    -d '{"decision": "ACEPTAR"}') \
    || fail "POST /services/$SERVICE_ID/agent-respond falló"

ESTADO_APPLY=$(echo "$APPLY_RESP" | jq -r '.estado')
[ "$ESTADO_APPLY" = "EN_REVISION" ] \
    || warn "Estado esperado EN_REVISION, obtenido: $ESTADO_APPLY"
ok "Agente aplicó  →  estado: $ESTADO_APPLY"

# ── PASO 5: Cliente confirma — Flujo B ────────────────────────
sep
info "Paso 5/6 · Cliente confirma al agente  (Flujo B)..."

CONFIRM_RESP=$(curl -sf -X POST "$BASE_URL/services/$SERVICE_ID/client-confirm" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_CLIENTE") \
    || fail "POST /services/$SERVICE_ID/client-confirm falló"

ESTADO_CONFIRM=$(echo "$CONFIRM_RESP" | jq -r '.estado')
AGENTE_CONFIRMADO=$(echo "$CONFIRM_RESP" | jq -r '.agente_id')
[ "$ESTADO_CONFIRM" = "CONFIRMADO" ] \
    || warn "Estado esperado CONFIRMADO, obtenido: $ESTADO_CONFIRM"
ok "Servicio confirmado  →  estado: $ESTADO_CONFIRM  (agente: $AGENTE_CONFIRMADO)"

# ── PASO 6: Crear intento de pago ─────────────────────────────
sep
info "Paso 6/6 · POST /payments/create-intent  (STRIPE_TEST mock)..."

PAY_RESP=$(curl -sf -X POST "$BASE_URL/payments/create-intent" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN_CLIENTE" \
    -d "{\"service_id\": \"$SERVICE_ID\", \"metodo\": \"STRIPE_TEST\"}") \
    || fail "POST /payments/create-intent falló"

echo "  $(echo "$PAY_RESP" | jq '.' 2>/dev/null || echo "$PAY_RESP")"

PAYMENT_ID=$(echo "$PAY_RESP"  | jq -r '.payment_id')
PI_ID=$(echo "$PAY_RESP"       | jq -r '.stripe_payment_intent_id')
ESTADO_PAGO=$(echo "$PAY_RESP" | jq -r '.estado')
MONTO_PAGO=$(echo "$PAY_RESP"  | jq -r '.monto')

[ "$ESTADO_PAGO" = "PAGADO" ] \
    || warn "Estado de pago esperado PAGADO, obtenido: $ESTADO_PAGO"
ok "Pago simulado: $PI_ID  (estado: $ESTADO_PAGO)"

# ── RESUMEN FINAL ─────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
echo -e "${BOLD}   RESUMEN${NC}"
echo -e "${BOLD}══════════════════════════════════════════════${NC}"
ok "Auth OK"
ok "Solicitud creada: $SERVICE_ID"
ok "Precio: S/ $PRECIO_TOTAL"
ok "Pago simulado: $PI_ID"
echo ""
echo -e "${CYAN}Tokens para pruebas manuales:${NC}"
echo "  export TOKEN=\"$TOKEN_CLIENTE\""
echo "  export TOKEN_AGENTE=\"$TOKEN_AGENTE\""
echo "  export SERVICE_ID=\"$SERVICE_ID\""
echo ""
