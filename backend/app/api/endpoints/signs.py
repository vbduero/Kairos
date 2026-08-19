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
    {"word": "hola", "category": "palabra", "description": "Hola"},
    {"word": "como estas", "category": "palabra", "description": "Como estas?"},
    {"word": "bien", "category": "palabra", "description": "Bien"},
    {"word": "mal", "category": "palabra", "description": "Mal"},
    {"word": "gracias", "category": "palabra", "description": "Gracias"},
    {"word": "por favor", "category": "palabra", "description": "Por Favor"},
    {"word": "permiso", "category": "palabra", "description": "Permiso"},
    {"word": "no se", "category": "palabra", "description": "No sé"},
    {"word": "otra vez", "category": "palabra", "description": "Otra vez"},
    {"word": "si", "category": "palabra", "description": "Sí"},
    {"word": "no", "category": "palabra", "description": "No"},
    {"word": "pregunta", "category": "palabra", "description": "Pregunta"},
    {"word": "ayuda", "category": "palabra", "description": "Ayuda"},
    {"word": "espere", "category": "palabra", "description": "Espere"},
    {"word": "leer", "category": "palabra", "description": "Leer"},
    {"word": "escribir", "category": "palabra", "description": "Escribir"},
    {"word": "tarea", "category": "palabra", "description": "Tarea"},
    {"word": "hoy", "category": "palabra", "description": "Hoy"},
    {"word": "manana", "category": "palabra", "description": "Mañana"},
    {"word": "ayer", "category": "palabra", "description": "Ayer"},
    {"word": "clase", "category": "palabra", "description": "Clase"},
    {"word": "profesor", "category": "palabra", "description": "Profesor"},
    {"word": "adios", "category": "palabra", "description": "Adios"},
    {"word": "a", "category": "letra", "description": "A"},
    {"word": "b", "category": "letra", "description": "B"},
    {"word": "c", "category": "letra", "description": "C"},
    {"word": "d", "category": "letra", "description": "D"},
    {"word": "e", "category": "letra", "description": "E"},
    {"word": "f", "category": "letra", "description": "F"},
    {"word": "g", "category": "letra", "description": "G"},
    {"word": "h", "category": "letra", "description": "H"},
    {"word": "i", "category": "letra", "description": "I"},
    {"word": "j", "category": "letra", "description": "J"},
    {"word": "k", "category": "letra", "description": "K"},
    {"word": "l", "category": "letra", "description": "L"},
    {"word": "m", "category": "letra", "description": "M"},
    {"word": "n", "category": "letra", "description": "N"},
    {"word": "ñ", "category": "letra", "description": "Ñ"},
    {"word": "o", "category": "letra", "description": "O"},
    {"word": "p", "category": "letra", "description": "P"},
    {"word": "q", "category": "letra", "description": "Q"},
    {"word": "r", "category": "letra", "description": "R"},
    {"word": "s", "category": "letra", "description": "S"},
    {"word": "t", "category": "letra", "description": "T"},
    {"word": "u", "category": "letra", "description": "U"},
    {"word": "v", "category": "letra", "description": "V"},
    {"word": "w", "category": "letra", "description": "W"},
    {"word": "x", "category": "letra", "description": "X"},
    {"word": "y", "category": "letra", "description": "Y"},
    {"word": "z", "category": "letra", "description": "Z"},
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


