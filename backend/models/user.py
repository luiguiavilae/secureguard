# TODO: Definir modelos Pydantic para usuarios (cliente y agente)
# Incluir: UserBase, ClientProfile, AgentProfile, AgentDocument, AgentStatus
from pydantic import BaseModel
from typing import Optional
from enum import Enum


class UserRole(str, Enum):
    CLIENT = "client"
    AGENT = "agent"
    ADMIN = "admin"


class AgentStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"
    SUSPENDED = "suspended"
