# ============================================================
#  Preprocesamiento de Secuencias LSC
#  Ejecutar desde la raíz del proyecto:
#    python ai/scripts/preprocesar_datos.py
# ============================================================

import numpy as np
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.keypoint_utils import normalize_sequence, SEQUENCE_LEN, KP_TOTAL

SEQUENCES_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences')
AUGMENTED_DIR = os.path.join(os.path.dirname(__file__), '../datasets/sequences_augmented')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '../datasets')
TRAIN_TEST_SPLIT = 0.8


def preprocesar():
    print("🔍 Iniciando preprocesamiento de secuencias...\n")

    if os.path.exists(AUGMENTED_DIR) and os.listdir(AUGMENTED_DIR):
        data_dir = AUGMENTED_DIR
        print(f"✅ Usando secuencias aumentadas: {AUGMENTED_DIR}")
    elif os.path.exists(SEQUENCES_DIR):
        data_dir = SEQUENCES_DIR
        print(f"ℹ️ Usando secuencias originales: {SEQUENCES_DIR}")
    else:
        print("❌ Error: No se encontraron secuencias.")
        print("   Primero ejecuta: python ai/scripts/recolectar_datos.py")
        return

    X_all = []
    y_all = []
    clases = sorted([d for d in os.listdir(data_dir)
                      if os.path.isdir(os.path.join(data_dir, d))])

    if not clases:
        print("❌ No se encontraron clases en el directorio.")
        return

    label_map = {label: i for i, label in enumerate(clases)}

    print(f"\n📊 Distribución de secuencias:")
    for sena in clases:
        dir_sena = os.path.join(data_dir, sena)
        archivos = [f for f in os.listdir(dir_sena) if f.endswith('.npy')]

        for archivo in archivos:
            seq = np.load(os.path.join(dir_sena, archivo))
            if seq.shape == (SEQUENCE_LEN, KP_TOTAL):
                if data_dir == SEQUENCES_DIR:
                    seq = normalize_sequence(seq)
                X_all.append(seq)
                y_all.append(label_map[sena])

        print(f"   {sena:<15} {len(archivos):>8} secuencias")

    if not X_all:
        print("❌ No se cargaron secuencias válidas.")
        return

    X = np.array(X_all, dtype=np.float32)
    y = np.array(y_all, dtype=np.int32)

    np.random.seed(42)
    indices = np.arange(len(X))
    np.random.shuffle(indices)
    X = X[indices]
    y = y[indices]

    split_idx = int(len(X) * TRAIN_TEST_SPLIT)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    np.save(os.path.join(OUTPUT_DIR, 'X_train.npy'), X_train)
    np.save(os.path.join(OUTPUT_DIR, 'X_test.npy'), X_test)
    np.save(os.path.join(OUTPUT_DIR, 'y_train.npy'), y_train)
    np.save(os.path.join(OUTPUT_DIR, 'y_test.npy'), y_test)

    with open(os.path.join(OUTPUT_DIR, 'label_encoder.json'), 'w') as f:
        json.dump(label_map, f, indent=4)

    print(f"\n✅ Preprocesamiento completado:")
    print(f"   X_train: {X_train.shape}")
    print(f"   X_test:  {X_test.shape}")
    print(f"   Clases:  {len(clases)}")
    print(f"\n🎯 Siguiente paso: python ai/scripts/entrenar_modelo.py")


if __name__ == "__main__":
    preprocesar()
