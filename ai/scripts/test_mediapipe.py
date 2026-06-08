import sys
import os
import time
import cv2
import numpy as np

sys.path.append(os.path.dirname(os.path.abspath(__file__)) + '/../../backend')


def crear_imagen_blanca():
    img = np.ones((480, 640, 3), dtype=np.uint8) * 255
    _, buffer = cv2.imencode('.jpg', img)
    return bytes(buffer)


def test_1_importacion():
    print("🔍 Test 1 — Importando servicio MediaPipe...")
    try:
        from app.services.mediapipe_service import MediaPipeService
        print("✅ MediaPipeService importó correctamente")
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_2_instancia():
    print("\n🔍 Test 2 — Creando instancia...")
    try:
        from app.services.mediapipe_service import MediaPipeService
        servicio = MediaPipeService()
        print("✅ Instancia creada correctamente")
        servicio.cerrar()
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_3_sin_mano():
    print("\n🔍 Test 3 — Imagen sin mano (debe devolver None)...")
    try:
        from app.services.mediapipe_service import MediaPipeService
        servicio = MediaPipeService()
        resultado = servicio.procesar_frame(crear_imagen_blanca())
        servicio.cerrar()
        if resultado is None:
            print("✅ Sin mano → devuelve None correctamente")
            return True
        else:
            print("❌ Debería devolver None")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_4_bytes_invalidos():
    print("\n🔍 Test 4 — Bytes inválidos (no debe crashear)...")
    try:
        from app.services.mediapipe_service import MediaPipeService
        servicio = MediaPipeService()
        resultado = servicio.procesar_frame(b"no_es_imagen")
        servicio.cerrar()
        if resultado is None:
            print("✅ Maneja bytes inválidos sin crashear")
            return True
        else:
            print("❌ Debería devolver None")
            return False
    except Exception as e:
        print(f"❌ Lanzó excepción: {e}")
        return False


def test_5_rendimiento():
    print("\n🔍 Test 5 — Rendimiento (< 100ms por frame)...")
    try:
        from app.services.mediapipe_service import MediaPipeService
        servicio = MediaPipeService()
        imagen = crear_imagen_blanca()
        tiempos = []
        for _ in range(5):
            inicio = time.time()
            servicio.procesar_frame(imagen)
            tiempos.append((time.time() - inicio) * 1000)
        servicio.cerrar()
        promedio = sum(tiempos) / len(tiempos)
        print(f"   Tiempo promedio: {promedio:.1f}ms")
        if promedio < 100:
            print("✅ Rendimiento dentro del límite")
            return True
        else:
            print(f"⚠️  Rendimiento lento: {promedio:.1f}ms")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    print("=" * 55)
    print("  Kairos — Test Servicio MediaPipe")
    print("=" * 55)

    resultados = [
        test_1_importacion(),
        test_2_instancia(),
        test_3_sin_mano(),
        test_4_bytes_invalidos(),
        test_5_rendimiento(),
    ]

    print("\n" + "=" * 55)
    exitosos = sum(resultados)
    total = len(resultados)
    print(f"  Resultado: {exitosos}/{total} pruebas exitosas")
    if exitosos == total:
        print("  🎉 ¡Servicio MediaPipe listo!")
    elif exitosos >= 3:
        print("  ✅ Servicio funcional con observaciones")
    else:
        print("  ⚠️  Hay errores que corregir")
    print("=" * 55)