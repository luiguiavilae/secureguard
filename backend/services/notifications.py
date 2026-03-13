# TODO: Implementar servicio de notificaciones push vía Expo Push API
# Funciones: send_push(token: str, title: str, body: str, data: dict)
#            notify_agents_nearby(service_id: str, lat: float, lng: float)
import httpx
from config import settings

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
