# ============================================================
#  Script de prueba — Endpoints WebSocket y REST
#  Ejecutar con el servidor corriendo en localhost:8000
#  python ../ai/scripts/test_websocket.py
# ============================================================

import asyncio
import websockets
import json
import httpx
import cv2
import numpy as np


def crear_imagen_bytes():
    """Crea una imagen de prueba en bytes."""
    img = np.ones((480, 640, 3), dtype=np.uint8) * 200
    _, buffer = cv2.imencode('.jpg', img)
    return bytes(buffer)


def test_1_signs_list():
    print("🔍 Test 1 — GET /api/v1/signs...")
    try:
        response = httpx.get("http://localhost:8000/api/v1/signs")
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert "word" in data[0]
        print(f"✅ Devuelve {len(data)} señas correctamente")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_2_sign_found():
    print("\n🔍 Test 2 — GET /api/v1/signs/hola...")
    try:
        response = httpx.get("http://localhost:8000/api/v1/signs/hola")
        assert response.status_code == 200
        data = response.json()
        assert data["word"] == "hola"
        assert data["category"] == "saludo"
        print(f"✅ Seña encontrada: {data['word']} ({data['category']})")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_3_sign_not_found():
    print("\n🔍 Test 3 — GET /api/v1/signs/inexistente (debe dar 404)...")
    try:
        response = httpx.get("http://localhost:8000/api/v1/signs/inexistente")
        assert response.status_code == 404
        print("✅ Devuelve 404 correctamente para señas no encontradas")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_4_websocket_ping():
    print("\n🔍 Test 4 — WebSocket ping/pong...")
    try:
        async with websockets.connect("ws://localhost:8000/ws") as ws:
            await ws.send(json.dumps({"type": "ping"}))
            respuesta = json.loads(await ws.recv())
            assert respuesta["type"] == "pong"
            print("✅ Ping → Pong funcionando")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_5_websocket_frame():
    print("\n🔍 Test 5 — WebSocket envío de frame...")
    try:
        async with websockets.connect("ws://localhost:8000/ws") as ws:
            imagen_bytes = crear_imagen_bytes()
            await ws.send(imagen_bytes)
            respuesta = json.loads(await ws.recv())
            assert "hand_detected" in respuesta
            assert "keypoints" in respuesta
            assert "num_keypoints" in respuesta
            print(f"✅ Frame procesado correctamente")
            print(f"   hand_detected: {respuesta['hand_detected']}")
            print(f"   num_keypoints: {respuesta['num_keypoints']}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def run_async_tests():
    r4 = await test_4_websocket_ping()
    r5 = await test_5_websocket_frame()
    return r4, r5


if __name__ == "__main__":
    print("=" * 55)
    print("  Kairos — Test WebSocket + REST")
    print("=" * 55)
    print("⚠️  Asegúrate de tener el servidor corriendo:")
    print("   uvicorn app.main:app --reload --port 8000\n")

    r1 = test_1_signs_list()
    r2 = test_2_sign_found()
    r3 = test_3_sign_not_found()
    r4, r5 = asyncio.run(run_async_tests())

    resultados = [r1, r2, r3, r4, r5]

    print("\n" + "=" * 55)
    exitosos = sum(resultados)
    total = len(resultados)
    print(f"  Resultado: {exitosos}/{total} pruebas exitosas")
    if exitosos == total:
        print("  🎉 ¡WebSocket y REST listos!")
    elif exitosos >= 3:
        print("  ✅ Funcional con observaciones menores")
    else:
        print("  ⚠️  Hay errores que corregir")
    print("=" * 55)