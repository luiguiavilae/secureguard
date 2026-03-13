# TODO: Implementar endpoints de servicios de seguridad
# Endpoints: POST / (crear servicio), GET /{service_id}, PATCH /{service_id}/status,
#            POST /{service_id}/accept, POST /{service_id}/start, POST /{service_id}/complete,
#            POST /{service_id}/cancel
from fastapi import APIRouter

router = APIRouter()
