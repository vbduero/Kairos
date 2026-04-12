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
from utils.keypoint_utils import normalize_sequence, augment_sequence, SEQUENCE_LEN, KP_TOTAL

SEQUENCES_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences')
AUGMENTED_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences_augmented')
AUGMENTED_PER_SAMPLE = 5


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
            if seq.ndim != 2 or seq.shape[1] != KP_TOTAL or seq.shape[0] < SEQUENCE_LEN:
                continue
            # Subsamplear uniformemente si la secuencia es más larga que SEQUENCE_LEN
            if seq.shape[0] > SEQUENCE_LEN:
                indices = np.linspace(0, seq.shape[0] - 1, SEQUENCE_LEN, dtype=int)
                seq = seq[indices]

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
