# Tokens de prueba — desarrollo local

## Cómo generar un token fresco

1. Llama send-otp:
curl -X POST http://localhost:8001/auth/send-otp -H "Content-Type: application/json" -d '{"phone": "987654321"}'

2. Copia el OTP del log del servidor y llama verify-otp:
curl -X POST http://localhost:8001/auth/verify-otp -H "Content-Type: application/json" -d '{"phone": "987654321", "otp": "CODIGO", "tipo": "CLIENTE"}'

3. Copia el access_token de la respuesta y úsalo así en terminal:
export TOKEN="pega_tu_token_aqui"

## Cómo probar endpoints protegidos
curl -X GET http://localhost:8001/agents/available -H "Authorization: Bearer $TOKEN"
