# ============================================================
#  Preprocesamiento de Secuencias LSC
#  Acepta secuencias antiguas (126 kp) y nuevas (168 kp).
#  Auto-detecta el formato dominante y normaliza en consecuencia.
#  Ejecutar desde la raíz del proyecto:
#    python ai/scripts/preprocesar_datos.py
# ============================================================

import numpy as np
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from utils.keypoint_utils import (
    normalize_sequence, normalize_hand,
    SEQUENCE_LEN, KP_TOTAL, KP_HOLISTIC_RAW, KP_PER_HAND
)

SEQUENCES_DIR  = os.path.join(os.path.dirname(__file__), '../datasets/sequences')
AUGMENTED_DIR  = os.path.join(os.path.dirname(__file__), '../datasets/sequences_augmented')
OUTPUT_DIR     = os.path.join(os.path.dirname(__file__), '../datasets')
TRAIN_TEST_SPLIT = 0.8

KP_LEGACY = 126   # formato anterior (solo manos)


def normalize_legacy(seq: np.ndarray) -> np.ndarray:
    """Normaliza secuencias antiguas de 126 kp (solo manos)."""
    result = np.zeros_like(seq)
    for i in range(seq.shape[0]):
        kp = seq[i]
        h1 = normalize_hand(kp[:KP_PER_HAND].reshape(21, 3))
        h2 = normalize_hand(kp[KP_PER_HAND:].reshape(21, 3))
        result[i] = np.concatenate([h1.flatten(), h2.flatten()])
    return result

def add_velocity_to_sequence(seq: np.ndarray) -> np.ndarray:
    """
    Toma una secuencia de forma (N, M) y retorna (N, M*2)
    concatenando la posición actual con la velocidad (frame actual - anterior).
    """
    vel = np.zeros_like(seq)
    vel[1:] = seq[1:] - seq[:-1]
    return np.concatenate([seq, vel], axis=1)


def preprocesar():
    print("🔍 Iniciando preprocesamiento de secuencias...\n")

    if os.path.exists(AUGMENTED_DIR) and os.listdir(AUGMENTED_DIR):
        data_dir = AUGMENTED_DIR
        print(f"✅ Usando secuencias aumentadas: {AUGMENTED_DIR}")
    elif os.path.exists(SEQUENCES_DIR):
        data_dir = SEQUENCES_DIR
        print(f"ℹ️  Usando secuencias originales: {SEQUENCES_DIR}")
    else:
        print("❌ Error: No se encontraron secuencias.")
        print("   Primero ejecuta: python ai/scripts/recolectar_datos.py")
        return

    clases = sorted([
        d for d in os.listdir(data_dir)
        if os.path.isdir(os.path.join(data_dir, d))
        and any(f.endswith('.npy') for f in os.listdir(os.path.join(data_dir, d)))
    ])

    if not clases:
        print("❌ No se encontraron clases en el directorio.")
        return

    # ── Contar formatos disponibles (informativo) ───────────────
    # sequences/ puede tener 126 (legacy) o 168 (holistic crudo)
    # sequences_augmented/ tiene 174 (normalizado + zona)
    formatos = {KP_LEGACY: 0, KP_HOLISTIC_RAW: 0, KP_TOTAL: 0}
    for sena in clases:
        dir_sena = os.path.join(data_dir, sena)
        for archivo in os.listdir(dir_sena):
            if not archivo.endswith('.npy'):
                continue
            seq = np.load(os.path.join(dir_sena, archivo))
            if seq.ndim == 2 and seq.shape[1] in formatos:
                formatos[seq.shape[1]] += 1

    if all(v == 0 for v in formatos.values()):
        print(f"❌ No se encontraron secuencias válidas (se esperaba 126, 168 o 174 kp/frame).")
        return

    print(f"✅ Formato de salida: {KP_TOTAL*2} kp/frame ({KP_TOTAL} pos + {KP_TOTAL} vel)")
    print(f"   Legacy {KP_LEGACY} kp (solo manos): {formatos.get(KP_LEGACY, 0)} seqs")
    print(f"   Holistic {KP_HOLISTIC_RAW} kp (crudo): {formatos.get(KP_HOLISTIC_RAW, 0)} seqs")
    print(f"   Normalizado {KP_TOTAL} kp (aumentado+zona): {formatos.get(KP_TOTAL, 0)} seqs")

    label_map = {label: i for i, label in enumerate(clases)}
    X_all = []
    y_all = []

    print(f"\n📊 Distribución de secuencias:")
    for sena in clases:
        dir_sena = os.path.join(data_dir, sena)
        archivos = [f for f in os.listdir(dir_sena) if f.endswith('.npy')]
        cargadas = 0

        for archivo in archivos:
            seq = np.load(os.path.join(dir_sena, archivo))

            if seq.ndim != 2 or seq.shape[1] not in (KP_LEGACY, KP_HOLISTIC_RAW, KP_TOTAL):
                continue
            if seq.shape[0] < SEQUENCE_LEN:
                continue

            # Submuestrear si hay más frames de los necesarios
            if seq.shape[0] > SEQUENCE_LEN:
                indices = np.linspace(0, seq.shape[0] - 1, SEQUENCE_LEN, dtype=int)
                seq = seq[indices]

            # Normalizar secuencias crudas (originales, no aumentadas)
            if data_dir == SEQUENCES_DIR:
                if seq.shape[1] == KP_LEGACY:
                    seq = normalize_legacy(seq)    # → 126 normalizado
                elif seq.shape[1] == KP_HOLISTIC_RAW:
                    seq = normalize_sequence(seq)  # 168 crudo → 174

            # Pad legacy normalizado (126) → 174 con ceros en cara/hombros/zona
            if seq.shape[1] == KP_LEGACY:
                padded = np.zeros((seq.shape[0], KP_TOTAL), dtype=np.float32)
                padded[:, :KP_LEGACY] = seq
                seq = padded

            # Añadir Velocidad: 174 -> 348
            if seq.shape[1] == KP_TOTAL:
                seq = add_velocity_to_sequence(seq)

            X_all.append(seq)
            y_all.append(label_map[sena])
            cargadas += 1

        print(f"   {sena:<15} {cargadas:>8} secuencias")

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
    np.save(os.path.join(OUTPUT_DIR, 'X_test.npy'),  X_test)
    np.save(os.path.join(OUTPUT_DIR, 'y_train.npy'), y_train)
    np.save(os.path.join(OUTPUT_DIR, 'y_test.npy'),  y_test)

    with open(os.path.join(OUTPUT_DIR, 'label_encoder.json'), 'w') as f:
        json.dump(label_map, f, indent=4)

    print(f"\n✅ Preprocesamiento completado:")
    print(f"   X_train: {X_train.shape}")
    print(f"   X_test:  {X_test.shape}")
    print(f"   Clases:  {len(clases)}")
    print(f"   Formato: {KP_TOTAL*2} kp/frame (pos + vel)")
    print(f"\n🎯 Siguiente paso: python ai/scripts/entrenar_modelo.py")


if __name__ == "__main__":
    preprocesar()
