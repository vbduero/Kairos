# ============================================================
#  Test Clasificador LSC — Fase 2
#  Soporta modelo LSTM (secuencias) y Dense (legacy)
#  Ejecutar desde la raíz del proyecto:
#    python ai/scripts/test_classifier.py
# ============================================================

import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.sign_classifier_service import SignClassifierService
from utils.keypoint_utils import normalize_two_hands, KP_TOTAL

VOCABULARIO = None  # Se carga dinámicamente desde el modelo

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

classifier = SignClassifierService()

# ── Prueba 1: Modelo cargó ──
test("Prueba 1: Modelo y labels cargados",
     classifier.keras_model is not None and len(classifier.labels) > 0)

# ── Prueba 2: Tipo de modelo ──
test(f"Prueba 2: Tipo de modelo ({classifier.model_type})",
     classifier.model_type in ["lstm", "dense"])

# ── Prueba 3: Buffer funciona ──
buffer = classifier.create_buffer()
kp_sample = list(np.random.uniform(0, 1, KP_TOTAL))
for i in range(classifier.sequence_length):
    is_full = classifier.add_frame_to_buffer(buffer, kp_sample)
test("Prueba 3: Buffer se llena correctamente",
     is_full and len(buffer) == classifier.sequence_length)

# ── Prueba 4: Predicción desde buffer ──
sign, confidence, entropy = classifier.predict_from_buffer(buffer)
test("Prueba 4: Predicción desde buffer",
     sign is not None and confidence > 0,
     f"sign={sign}, confidence={confidence}")

# ── Prueba 5: Confianza entre 0 y 1 ──
test("Prueba 5: Confianza entre 0 y 1", 0.0 <= confidence <= 1.0)

# ── Prueba 6: Seña en vocabulario ──
vocabulario_real = list(classifier.labels.values())
test("Prueba 6: Seña pertenece al vocabulario", sign in vocabulario_real,
     f"sign='{sign}'")

# ── Prueba 7: Normalización 2 manos ──
kp_126 = list(np.random.uniform(0.2, 0.8, KP_TOTAL))
kp_norm = normalize_two_hands(kp_126)
test("Prueba 7: Normalización centra al wrist",
     abs(kp_norm[0]) < 1e-5 and abs(kp_norm[1]) < 1e-5)

# ── Prueba 8: Rechaza inválidos ──
sign_inv, conf_inv = classifier.predict([0.5] * 10)
test("Prueba 8: Rechaza keypoints inválidos",
     sign_inv is None and conf_inv == 0.0)

# ── Resumen ──
total = passed + failed
print(f"\n📊 Resultado: {passed}/{total} pruebas exitosas")
if failed == 0:
    print("🎉 Todas las pruebas pasaron.\n")
else:
    print(f"⚠️  {failed} prueba(s) fallaron.\n")