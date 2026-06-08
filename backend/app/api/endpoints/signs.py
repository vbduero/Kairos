# ============================================================
#  Endpoint REST — Vocabulario LSC
#  GET /api/v1/signs            → lista vocabulario disponible
# ============================================================

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import uuid
import os
import numpy as np
import random

router = APIRouter()

# Directorio de secuencias grabadas
SEQUENCES_DIR = os.path.join(
    os.path.dirname(__file__),           # endpoints/
    '..', '..', '..', '..',             # backend/
    'ai', 'datasets', 'sequences'
)
SEQUENCES_DIR = os.path.normpath(SEQUENCES_DIR)


# ── Schemas ───────────────────────────────────────────────
class SignResponse(BaseModel):
    id: str
    word: str
    category: Optional[str] = None
    description: Optional[str] = None
    available: bool = False   # True si hay secuencias grabadas

# ── Vocabulario con metadatos ─────────────────────────────
_VOCAB_META = [
    {"word": "hola",      "category": "saludo",     "description": "Seña de saludo básico"},
    {"word": "adios",     "category": "saludo",     "description": "Seña de despedida"},
    {"word": "gracias",   "category": "cortesía",   "description": "Seña de agradecimiento"},
    {"word": "por favor", "category": "cortesía",   "description": "Seña de solicitud cortés"},
    {"word": "si",        "category": "respuesta",  "description": "Afirmación"},
    {"word": "no",        "category": "respuesta",  "description": "Negación"},
    {"word": "ayuda",     "category": "emergencia", "description": "Solicitud de ayuda"},
    {"word": "agua",      "category": "necesidad",  "description": "Solicitud de agua"},
    {"word": "casa",      "category": "lugar",      "description": "Seña de hogar"},
    {"word": "m",  "category": "letra", "description": "Letra M"},
    {"word": "n",  "category": "letra", "description": "Letra N"},
    {"word": "ñ",  "category": "letra", "description": "Letra Ñ"},
    {"word": "o",  "category": "letra", "description": "Letra O"},
    {"word": "p",  "category": "letra", "description": "Letra P"},
    {"word": "q",  "category": "letra", "description": "Letra Q"},
    {"word": "r",  "category": "letra", "description": "Letra R"},
    {"word": "s",  "category": "letra", "description": "Letra S"},
    {"word": "t",  "category": "letra", "description": "Letra T"},
    {"word": "u",  "category": "letra", "description": "Letra U"},
    {"word": "v",  "category": "letra", "description": "Letra V"},
    {"word": "w",  "category": "letra", "description": "Letra W"},
    {"word": "x",  "category": "letra", "description": "Letra X"},
    {"word": "y",  "category": "letra", "description": "Letra Y"},
    {"word": "z",  "category": "letra", "description": "Letra Z"},
]


def _tiene_secuencias(word: str) -> bool:
    dir_sena = os.path.join(SEQUENCES_DIR, word)
    if not os.path.isdir(dir_sena):
        return False
    return any(f.endswith('.npy') for f in os.listdir(dir_sena))


# ── Endpoints ─────────────────────────────────────────────

@router.get("/signs", response_model=list[SignResponse])
async def listar_señas():
    """Devuelve todo el vocabulario LSC con indicador de disponibilidad."""
    resultado = []
    for i, meta in enumerate(_VOCAB_META):
        resultado.append(SignResponse(
            id=str(uuid.uuid5(uuid.NAMESPACE_DNS, meta["word"])),
            word=meta["word"],
            category=meta.get("category"),
            description=meta.get("description"),
            available=_tiene_secuencias(meta["word"]),
        ))
    return resultado


