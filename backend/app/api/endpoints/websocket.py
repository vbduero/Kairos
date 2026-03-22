# ============================================================
#  Endpoint WebSocket — Comunicación en tiempo real
#  ws://localhost:8000/ws
#  Recibe frames de video y devuelve keypoints de la mano
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.mediapipe_service import MediaPipeService
from app.services.sign_classifier_service import SignClassifierService
import json
import traceback

router = APIRouter()

# ── Singletons: se inicializan una sola vez al arrancar el servidor ──
_mediapipe_servicio: MediaPipeService | None = None
_classifier_servicio: SignClassifierService | None = None

def get_mediapipe_servicio() -> MediaPipeService:
    global _mediapipe_servicio
    if _mediapipe_servicio is None:
        print("🔄 Inicializando MediaPipe (primera vez)…")
        _mediapipe_servicio = MediaPipeService()
        print("✅ MediaPipe listo.")
    return _mediapipe_servicio

def get_classifier_servicio() -> SignClassifierService:
    global _classifier_servicio
    if _classifier_servicio is None:
        print("🔄 Inicializando Clasificador LSC (primera vez)…")
        _classifier_servicio = SignClassifierService()
        print("✅ Clasificador LSC listo.")
    return _classifier_servicio


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Canal WebSocket para traducción en tiempo real.

    Flujo:
    1. Frontend abre conexión
    2. Frontend envía frames como bytes cada 200ms
    3. Backend procesa con MediaPipe y devuelve keypoints
    4. El clasificador identifica la seña a partir de los keypoints
    5. Devuelve {hand_detected, keypoints, predicted_sign, confidence}
    """
    await websocket.accept()
    print("✅ Cliente conectado al WebSocket")

    mp_servicio = get_mediapipe_servicio()
    classifier = get_classifier_servicio()

    try:
        while True:
            # Recibir frame del frontend
            try:
                data = await websocket.receive()
            except RuntimeError:
                break

            if data.get("type") == "websocket.disconnect":
                break

            if "bytes" in data and data["bytes"]:
                imagen_bytes = data["bytes"]

                # 1. Procesar con MediaPipe
                keypoints = mp_servicio.procesar_frame(imagen_bytes)

                if keypoints:
                    # 2. Clasificar seña
                    predicted_sign, confidence = classifier.predict(keypoints)

                    respuesta = {
                        "hand_detected": True,
                        "keypoints": keypoints,
                        "num_keypoints": len(keypoints),
                        "predicted_sign": predicted_sign,
                        "confidence": confidence
                    }
                else:
                    respuesta = {
                        "hand_detected": False,
                        "keypoints": [],
                        "num_keypoints": 0,
                        "predicted_sign": None,
                        "confidence": 0.0
                    }

                try:
                    await websocket.send_text(json.dumps(respuesta))
                except Exception:
                    break  # Cliente se desconectó mientras procesábamos

            elif "text" in data and data["text"]:
                try:
                    mensaje = json.loads(data["text"])
                    if mensaje.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except Exception:
                    pass

    except WebSocketDisconnect:
        pass  # Desconexión normal, no es un error
    except Exception as e:
        print(f"❌ Error inesperado en WebSocket: {e}")
        traceback.print_exc()
    finally:
        print("👋 Cliente desconectado del WebSocket")