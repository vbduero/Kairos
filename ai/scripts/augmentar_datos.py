# ============================================================
#  Augmentación de Datos LSC — Secuencias
#  Genera variaciones de secuencias (15 frames × 126 keypoints)
#  Ejecutar desde la raíz del proyecto:
#    python ai/scripts/augmentar_datos.py
# ============================================================

import sys
import os
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.keypoint_utils import normalize_sequence, normalize_hand, augment_sequence, SEQUENCE_LEN, KP_TOTAL, KP_HOLISTIC_RAW, KP_PER_HAND

SEQUENCES_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences')
AUGMENTED_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences_augmented')
AUGMENTED_PER_SAMPLE = 5
KP_LEGACY = 126  # formato anterior (solo manos)


def augmentar():
    print("🔄 Iniciando augmentación de secuencias LSC...\n")

    if not os.path.exists(SEQUENCES_DIR):
        print(f"❌ Error: No se encontró {SEQUENCES_DIR}")
        print("   Primero ejecuta: python ai/scripts/recolectar_datos.py")
        return

    total_original = 0
    total_aumentado = 0

    senas = sorted([d for d in os.listdir(SEQUENCES_DIR)
                     if os.path.isdir(os.path.join(SEQUENCES_DIR, d))])

    if not senas:
        print("❌ No se encontraron señas en el directorio de secuencias.")
        return

    print(f"📊 Señas encontradas: {len(senas)}\n")
    print(f"   {'Seña':<15} {'Original':>10} {'Aumentado':>10}")
    print(f"   {'-'*37}")

    for sena in senas:
        dir_sena = os.path.join(SEQUENCES_DIR, sena)
        dir_aug = os.path.join(AUGMENTED_DIR, sena)
        os.makedirs(dir_aug, exist_ok=True)

        archivos = [f for f in os.listdir(dir_sena) if f.endswith('.npy')]
        n_original = len(archivos)
        n_generado = 0

        for archivo in archivos:
            seq = np.load(os.path.join(dir_sena, archivo))
            # Aceptar 126 (legacy manos) o 168 (holistic crudo de MediaPipe)
            if seq.ndim != 2 or seq.shape[1] not in (KP_LEGACY, KP_HOLISTIC_RAW):
                continue
            if seq.shape[0] < SEQUENCE_LEN:
                continue
            # Subsamplear uniformemente si la secuencia es más larga que SEQUENCE_LEN
            if seq.shape[0] > SEQUENCE_LEN:
                indices = np.linspace(0, seq.shape[0] - 1, SEQUENCE_LEN, dtype=int)
                seq = seq[indices]

            # Para legacy (126 kp): normalizar manos y rellenar a 168 kp crudos
            # para que normalize_sequence pueda calcular las features de zona
            if seq.shape[1] == KP_LEGACY:
                result = np.zeros((seq.shape[0], KP_HOLISTIC_RAW), dtype=np.float32)
                for fi in range(seq.shape[0]):
                    kp = seq[fi]
                    h1 = normalize_hand(kp[:KP_PER_HAND].reshape(21, 3))
                    h2 = normalize_hand(kp[KP_PER_HAND:].reshape(21, 3))
                    result[fi, :KP_LEGACY] = np.concatenate([h1.flatten(), h2.flatten()])
                seq = result
            # normalize_sequence: 168 raw → 174 (añade 6 features de zona)
            seq_norm = normalize_sequence(seq)
            np.save(os.path.join(dir_aug, f"orig_{archivo}"), seq_norm)
            n_generado += 1

            variaciones = augment_sequence(seq_norm, n_augmented=AUGMENTED_PER_SAMPLE)
            for j, var in enumerate(variaciones):
                np.save(os.path.join(dir_aug, f"aug{j}_{archivo}"), var)
                n_generado += 1

        total_original += n_original
        total_aumentado += n_generado
        print(f"   {sena:<15} {n_original:>10} {n_generado:>10}")

    print(f"\n✅ Augmentación completada!")
    print(f"   Secuencias originales: {total_original}")
    print(f"   Secuencias aumentadas: {total_aumentado} ({AUGMENTED_PER_SAMPLE + 1}x)")
    print(f"   Guardadas en: {AUGMENTED_DIR}")
    print(f"\n🎯 Siguiente paso: python ai/scripts/preprocesar_datos.py")


if __name__ == "__main__":
    augmentar()
