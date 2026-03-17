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


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    Canal WebSocket para traducción en tiempo real.

    Flujo:
    1. Frontend abre conexión
    2. Frontend envía frames como bytes cada 100ms
    3. Backend procesa con MediaPipe y devuelve keypoints
    4. Conexión se mantiene abierta hasta que el usuario cierra
    """
    await websocket.accept()
    print("✅ Cliente conectado al WebSocket")

    # Crear instancia del servicio MediaPipe para esta sesión
    servicio = MediaPipeService()

    try:
        while True:
            # Recibir frame del frontend
            data = await websocket.receive()

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

                await websocket.send_text(json.dumps(respuesta))

            elif "text" in data and data["text"]:
                mensaje = json.loads(data["text"])

                # Comando ping — para verificar que la conexión está viva
                if mensaje.get("type") == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        print("👋 Cliente desconectado del WebSocket")
    except Exception as e:
        print(f"❌ Error en WebSocket: {e}")
        traceback.print_exc()
    finally:
        servicio.cerrar()
        print("🔒 Recursos MediaPipe liberados")