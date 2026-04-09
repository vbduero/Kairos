# ============================================================
#  Endpoint WebSocket — Comunicación en tiempo real
#  ws://localhost:8000/ws
#  Recibe frames y clasifica señas con buffer temporal
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.mediapipe_service import MediaPipeService
from app.services.sign_classifier_service import SignClassifierService
import json
import traceback

router = APIRouter()

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
    await websocket.accept()
    print("✅ Cliente conectado al WebSocket")

    mp_servicio = get_mediapipe_servicio()
    classifier = get_classifier_servicio()
    buffer = classifier.create_buffer()

    # Contador de frames consecutivos sin mano detectada.
    # Después de NO_HAND_RESET_AFTER frames sin manos, se limpia el buffer
    # para evitar que frames de un gesto anterior contaminen el siguiente.
    no_hand_frames = 0
    NO_HAND_RESET_AFTER = 5  # 5 frames × 200ms = 1 segundo sin manos → reset

    try:
        while True:
            try:
                data = await websocket.receive()
            except RuntimeError:
                break

            if data.get("type") == "websocket.disconnect":
                break

            if "bytes" in data and data["bytes"]:
                imagen_bytes = data["bytes"]
                keypoints = mp_servicio.procesar_frame(imagen_bytes)

                if keypoints:
                    # Mano detectada: resetear el contador de pérdida
                    no_hand_frames = 0

                    hand2_kps = keypoints[63:]
                    hands_count = 2 if any(k != 0.0 for k in hand2_kps) else 1

                    buffer_full = classifier.add_frame_to_buffer(buffer, keypoints)

                    predicted_sign = None
                    confidence = 0.0
                    if buffer_full:
                        predicted_sign, confidence = classifier.predict_from_buffer(buffer)

                    buffer_progress = len(buffer) / classifier.sequence_length

                    respuesta = {
                        "hand_detected": True,
                        "hands_count": hands_count,
                        "num_keypoints": len(keypoints),
                        "predicted_sign": predicted_sign,
                        "confidence": confidence,
                        "buffer_progress": round(buffer_progress, 2)
                    }
                else:
                    no_hand_frames += 1

                    # Limpiar buffer si la mano lleva más de 1 segundo sin detectarse.
                    # Esto evita que el LSTM reciba secuencias mezcladas de gestos distintos.
                    if no_hand_frames >= NO_HAND_RESET_AFTER:
                        buffer.clear()

                    respuesta = {
                        "hand_detected": False,
                        "hands_count": 0,
                        "num_keypoints": 0,
                        "predicted_sign": None,
                        "confidence": 0.0,
                        "buffer_progress": 0.0  # Mostrar 0 en UI cuando no hay mano
                    }

                try:
                    await websocket.send_text(json.dumps(respuesta))
                except Exception:
                    break

            elif "text" in data and data["text"]:
                try:
                    mensaje = json.loads(data["text"])
                    if mensaje.get("type") == "ping":
                        await websocket.send_text(json.dumps({"type": "pong"}))
                except Exception:
                    pass

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"❌ Error inesperado en WebSocket: {e}")
        traceback.print_exc()
    finally:
        print("👋 Cliente desconectado del WebSocket")