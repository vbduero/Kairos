# ============================================================
#  Test Clasificador LSC — Tarea 4 Fase 2A
#  Verifica que el clasificador funciona correctamente
#  Ejecutar desde: backend/
#  Comando: python ../ai/scripts/test_classifier.py
# ============================================================

import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))

from app.services.sign_classifier_service import SignClassifierService

VOCABULARIO = [
    "hola", "adios", "gracias", "por_favor", "si",
    "no", "ayuda", "agua", "casa", "familia",
    "trabajo", "escuela", "comer", "dormir", "bano",
    "doctor", "policia", "emergencia", "nombre", "como_estas"
]

passed = 0
failed = 0

def test(nombre, condicion, detalle=""):
    global passed, failed
    if condicion:
        print(f"  ✅ PASSED — {nombre}")
        passed += 1
    else:
        print(f"  ❌ FAILED — {nombre}: {detalle}")
        failed += 1

print("\n🧪 Iniciando pruebas del clasificador LSC...\n")

# Inicializar clasificador
classifier = SignClassifierService()

# ── Prueba 1: El modelo cargó correctamente ──
test(
    "Prueba 1: Modelo y labels cargados",
    classifier.interpreter is not None and len(classifier.labels) == 20,
    f"interpreter={classifier.interpreter}, labels={len(classifier.labels)}"
)

# ── Prueba 2: Predice con keypoints válidos ──
keypoints_validos = list(np.random.uniform(0, 1, 63))
sign, confidence = classifier.predict(keypoints_validos)
test(
    "Prueba 2: Predicción con 63 keypoints válidos",
    sign is not None and confidence > 0,
    f"sign={sign}, confidence={confidence}"
)

# ── Prueba 3: Rechaza keypoints inválidos ──
keypoints_invalidos = [0.5] * 10
sign_inv, conf_inv = classifier.predict(keypoints_invalidos)
test(
    "Prueba 3: Rechaza entrada con menos de 63 keypoints",
    sign_inv is None and conf_inv == 0.0,
    f"sign={sign_inv}, confidence={conf_inv}"
)

# ── Prueba 4: La confianza está entre 0 y 1 ──
test(
    "Prueba 4: Confianza es un valor entre 0 y 1",
    0.0 <= confidence <= 1.0,
    f"confidence={confidence}"
)

# ── Prueba 5: La seña devuelta existe en el vocabulario ──
test(
    "Prueba 5: La seña detectada pertenece al vocabulario LSC",
    sign in VOCABULARIO,
    f"sign='{sign}' no está en el vocabulario"
)

# ── Resumen ──
print(f"\n📊 Resultado: {passed}/5 pruebas exitosas")
if failed == 0:
    print("🎉 Todas las pruebas pasaron.\n")
else:
    print(f"⚠️  {failed} prueba(s) fallaron.\n")