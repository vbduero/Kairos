# ============================================================
#  Endpoint WebSocket — Comunicación en tiempo real
#  ws://localhost:8000/ws
#  Recibe frames de video y devuelve keypoints de la mano
# ============================================================

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.mediapipe_service import MediaPipeService
import json
import traceback

router = APIRouter()

# ── Singleton: se inicializa una sola vez al arrancar el servidor ──
_servicio: MediaPipeService | None = None

def get_servicio() -> MediaPipeService:
    global _servicio
    if _servicio is None:
        print("🔄 Inicializando MediaPipe (primera vez)…")
        _servicio = MediaPipeService()
        print("✅ MediaPipe listo.")
    return _servicio


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Canal WebSocket para traducción en tiempo real.

    Flujo:
    1. Frontend abre conexión
    2. Frontend envía frames como bytes cada 200ms
    3. Backend procesa con MediaPipe y devuelve keypoints
    4. Conexión se mantiene abierta hasta que el usuario cierra
    """
    await websocket.accept()
    print("✅ Cliente conectado al WebSocket")

    servicio = get_servicio()

    try:
        while True:
            # Recibir frame del frontend
            try:
                data = await websocket.receive()
            except RuntimeError:
                # WebSocket ya se desconectó — salir sin error
                break

            if data.get("type") == "websocket.disconnect":
                break

            # El frontend puede enviar bytes (frame) o texto (comandos)
            if "bytes" in data and data["bytes"]:
                imagen_bytes = data["bytes"]

                # Procesar con MediaPipe
                keypoints = servicio.procesar_frame(imagen_bytes)

                if keypoints:
                    respuesta = {
                        "hand_detected": True,
                        "keypoints": keypoints,
                        "num_keypoints": len(keypoints),
                    }
                else:
                    respuesta = {
                        "hand_detected": False,
                        "keypoints": [],
                        "num_keypoints": 0,
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