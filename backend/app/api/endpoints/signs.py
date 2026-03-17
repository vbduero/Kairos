# ============================================================
#  Endpoint REST — Vocabulario LSC
#  GET /api/v1/signs     → lista todo el vocabulario
#  GET /api/v1/signs/{word} → busca una seña por palabra
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
from datetime import datetime

router = APIRouter()

# ── Schemas de respuesta ──────────────────────────────────
class SignResponse(BaseModel):
    id: str
    word: str
    category: Optional[str] = None
    description: Optional[str] = None
    video_url: Optional[str] = None

# ── Vocabulario inicial en memoria ────────────────────────
# Mientras no tengamos PostgreSQL conectado usamos esto.
# En la Fase 3 esto se reemplazará por consultas reales a la BD.
VOCABULARIO = [
    {"id": str(uuid.uuid4()), "word": "hola",      "category": "saludo",     "description": "Seña de saludo básico"},
    {"id": str(uuid.uuid4()), "word": "gracias",   "category": "cortesía",   "description": "Seña de agradecimiento"},
    {"id": str(uuid.uuid4()), "word": "por favor", "category": "cortesía",   "description": "Seña de solicitud cortés"},
    {"id": str(uuid.uuid4()), "word": "sí",        "category": "respuesta",  "description": "Afirmación"},
    {"id": str(uuid.uuid4()), "word": "no",        "category": "respuesta",  "description": "Negación"},
    {"id": str(uuid.uuid4()), "word": "ayuda",     "category": "emergencia", "description": "Solicitud de ayuda"},
    {"id": str(uuid.uuid4()), "word": "agua",      "category": "necesidad",  "description": "Solicitud de agua"},
    {"id": str(uuid.uuid4()), "word": "casa",      "category": "lugar",      "description": "Seña de hogar"},
]


@router.get("/signs", response_model=list[SignResponse])
async def listar_señas():
    """Devuelve todo el vocabulario LSC disponible."""
    return VOCABULARIO


@router.get("/signs/{word}", response_model=SignResponse)
async def buscar_seña(word: str):
    """Busca una seña específica por palabra."""
    seña = next(
        (s for s in VOCABULARIO if s["word"].lower() == word.lower()),
        None
    )
    if not seña:
        raise HTTPException(
            status_code=404,
            detail=f"Seña '{word}' no encontrada en el vocabulario"
        )
    return seña