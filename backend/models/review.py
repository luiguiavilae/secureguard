# TODO: Definir modelos Pydantic para reseñas y calificaciones
# Incluir: ReviewCreate, ReviewResponse, RatingBreakdown
from pydantic import BaseModel, Field
from typing import Optional


class ReviewCreate(BaseModel):
    service_id: str
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = None
