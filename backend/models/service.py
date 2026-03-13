# TODO: Definir modelos Pydantic para servicios de seguridad
# Incluir: ServiceCreate, ServiceBriefing, ServiceStatus, ServiceResponse
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class ServiceStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    DISPUTED = "disputed"


class ServiceType(str, Enum):
    PERSONAL = "personal"
    EVENT = "event"
    PROPERTY = "property"
    ESCORT = "escort"
