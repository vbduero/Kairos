# ============================================================
#  Endpoint de Grabación — versión web de recolectar_datos.py
#
#  Mismo pipeline que el script de terminal:
#    - Guarda raw 168 kp (sin normalizar) para que
#      augmentar_datos.py → preprocesar_datos.py los procesen
#    - Mismo VOCABULARIO y objetivo de 50 muestras/seña
#    - Reentrenamiento: augmentar → preprocesar → entrenar
# ============================================================

import asyncio
import base64
import sys
from pathlib import Path
from typing import List

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/record", tags=["record"])

PROJECT_ROOT  = Path(__file__).resolve().parents[4]
SEQUENCES_DIR = PROJECT_ROOT / "ai" / "datasets" / "sequences"
TARGET_SAMPLES = 50   # mismo que MUESTRAS_POR_SENA en el script

# Vocabulario idéntico al de recolectar_datos.py
VOCABULARIO: List[str] = [
    "hola", "adios", "gracias", "por favor", "si",
    "no", "ayuda", "agua", "casa", "familia",
    "trabajo", "escuela", "comer", "dormir", "bano",
    "doctor", "policia", "emergencia", "nombre", "como estas",
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "ñ", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
]

_retrain: dict = {"status": "idle", "message": "Listo para reentrenar"}

_ai_path = str(PROJECT_ROOT / "ai")
if _ai_path not in sys.path:
    sys.path.insert(0, _ai_path)


# ── Modelos de request ───────────────────────────────────────
class SampleRequest(BaseModel):
    sign: str
    frames: List[str]   # 5 strings base64-JPEG


# ── Vocabulario con conteos ──────────────────────────────────
@router.get("/vocabulary")
async def get_vocabulary():
    """
    Devuelve el vocabulario completo con cuántas muestras hay por seña.
    Incluye señas extra que no están en VOCABULARIO pero ya se grabaron.
    """
    counts: dict[str, int] = {s: 0 for s in VOCABULARIO}

    if SEQUENCES_DIR.exists():
        for d in SEQUENCES_DIR.iterdir():
            if d.is_dir():
                counts[d.name] = len(list(d.glob("*.npy")))

    result = []
    seen = set()
    for sign in VOCABULARIO:
        seen.add(sign)
        cnt = counts.get(sign, 0)
        result.append({
            "sign": sign,
            "count": cnt,
            "complete": cnt >= TARGET_SAMPLES,
            "in_vocab": True,
        })
    # Señas extra grabadas por el usuario que no están en VOCABULARIO
    for sign, cnt in counts.items():
        if sign not in seen:
            result.append({
                "sign": sign,
                "count": cnt,
                "complete": cnt >= TARGET_SAMPLES,
                "in_vocab": False,
            })
    return result


# ── Guardar una muestra ──────────────────────────────────────
@router.post("/sample")
async def save_sample(req: SampleRequest):
    # Mismo normalizado que el script: solo lower+strip, sin reemplazar espacios
    sign = req.sign.strip().lower()
    if not sign:
        raise HTTPException(400, "Nombre de seña vacío")
    from utils.keypoint_utils import KP_HOLISTIC_RAW, SEQUENCE_LEN

    if len(req.frames) != SEQUENCE_LEN:
        raise HTTPException(400, f"Se necesitan {SEQUENCE_LEN} frames, recibidos: {len(req.frames)}")

    from app.api.endpoints.websocket import get_mediapipe_servicio
    mp = get_mediapipe_servicio()

    frames_kp: list = []
    for b64 in req.frames:
        raw_bytes = base64.b64decode(b64)
        kp = mp.procesar_frame(raw_bytes)
        # Sin mano → zeros, igual que el script
        frames_kp.append(kp if (kp and len(kp) == KP_HOLISTIC_RAW) else [0.0] * KP_HOLISTIC_RAW)

    # ── Calidad: al menos 1 frame con mano detectada ─────────
    frames_with_hand = sum(
        1 for f in frames_kp
        if any(abs(v) > 1e-6 for v in f[:6])  # muñeca no-cero → hay mano
    )
    if frames_with_hand == 0:
        raise HTTPException(422, f"No se detectó ninguna mano en los {SEQUENCE_LEN} frames. Coloca la mano en el encuadre.")

    # Guardar raw 168 kp — misma forma que recolectar_datos.py
    seq = np.array(frames_kp, dtype=np.float32)   # (SEQUENCE_LEN, 168)

    sign_dir = SEQUENCES_DIR / sign
    sign_dir.mkdir(parents=True, exist_ok=True)
    idx = len(list(sign_dir.glob("*.npy")))
    np.save(sign_dir / f"{idx}.npy", seq)

    return {
        "sign": sign,
        "sample_index": idx,
        "total_samples": idx + 1,
        "frames_with_hand": frames_with_hand,
    }


# ── Lanzar pipeline completo ─────────────────────────────────
@router.post("/retrain")
async def start_retrain():
    if _retrain["status"] == "running":
        raise HTTPException(409, "Ya hay un reentrenamiento en curso")
    asyncio.create_task(_run_pipeline())
    return {"status": "started"}


@router.get("/retrain/status")
async def retrain_status():
    return _retrain


async def _run_pipeline():
    _retrain["status"]  = "running"
    _retrain["message"] = "Iniciando..."
    steps = [
        ("ai/scripts/augmentar_datos.py",   "Augmentando datos (×5)..."),
        ("ai/scripts/preprocesar_datos.py", "Preprocesando secuencias..."),
        ("ai/scripts/entrenar_modelo.py",   "Entrenando modelo BiLSTM..."),
    ]
    try:
        for script_rel, msg in steps:
            _retrain["message"] = msg
            proc = await asyncio.create_subprocess_exec(
                sys.executable, str(PROJECT_ROOT / script_rel),
                cwd=str(PROJECT_ROOT),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await proc.communicate()
            if proc.returncode != 0:
                raise RuntimeError(stderr.decode(errors="replace")[-600:])

        # Forzar recarga del clasificador en el próximo WebSocket
        import app.api.endpoints.websocket as ws_mod
        ws_mod._classifier_servicio = None

        _retrain["status"]  = "done"
        _retrain["message"] = "Modelo actualizado ✓"
    except Exception as exc:
        _retrain["status"]  = "error"
        _retrain["message"] = str(exc)[:400]
