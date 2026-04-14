# ============================================================
#  Utilidades de Keypoints — Normalización y Augmentation
#  Soporta 2 manos + cara (12 puntos) + hombros (2 puntos)
#  Formato: [mano1 63] [mano2 63] [cara 36] [hombros 6] = 168
# ============================================================

import numpy as np
from typing import List

# ── Constantes ────────────────────────────────────────────────
KP_PER_HAND  = 63    # 21 landmarks × 3 coords
KP_FACE      = 36    # 12 landmarks × 3 coords
KP_POSE      = 6     # 2 landmarks (hombros) × 3 coords
KP_TOTAL     = 168   # KP_PER_HAND*2 + KP_FACE + KP_POSE
SEQUENCE_LEN = 5     # frames por secuencia

# Índices en el Face Mesh de MediaPipe (468 puntos en total)
# Seleccionados para capturar expresión facial relevante en LSC
FACE_LANDMARKS_INDICES = [
    61,   # comisura izquierda boca
    291,  # comisura derecha boca
    13,   # labio superior centro
    14,   # labio inferior centro
    33,   # esquina exterior ojo derecho (perspectiva sujeto)
    133,  # esquina interior ojo derecho
    362,  # esquina exterior ojo izquierdo
    263,  # esquina interior ojo izquierdo
    70,   # ceja derecha exterior
    300,  # ceja izquierda exterior
    4,    # punta de la nariz
    152,  # mentón
]

# Índices en Pose de MediaPipe (33 puntos en total)
POSE_LANDMARKS_INDICES = [11, 12]  # hombro izquierdo, hombro derecho


# ── Normalización de una mano ─────────────────────────────────
def normalize_hand(hand_kp: np.ndarray) -> np.ndarray:
    """
    Normaliza los keypoints de una mano (21, 3).
    Si la mano es ceros (no detectada), la deja como ceros.
    Usa solo XY para la escala (Z de MediaPipe es ruidosa).
    """
    if np.all(np.abs(hand_kp) < 1e-6):
        return hand_kp

    wrist = hand_kp[0].copy()
    hand_kp = hand_kp - wrist

    xy_dists = np.linalg.norm(hand_kp[:, :2], axis=1)
    max_dist = np.max(xy_dists)

    if max_dist > 1e-6:
        hand_kp = hand_kp / max_dist

    return np.clip(hand_kp, -2.0, 2.0)


# ── Normalización completa: manos + cara + hombros ───────────
def normalize_holistic(keypoints_168: list) -> list:
    """
    Normaliza 168 keypoints:
      - Manos [0:126]:   cada una relativa a su muñeca, escalada por XY
      - Cara [126:162]:  relativa a la nariz, escalada por apertura inter-ocular
      - Hombros [162:168]: relativos al punto medio, escalados por ancho de hombros
    """
    if len(keypoints_168) != KP_TOTAL:
        return keypoints_168

    kp = np.array(keypoints_168, dtype=np.float32)

    # Manos
    hand1 = normalize_hand(kp[:KP_PER_HAND].reshape(21, 3))
    hand2 = normalize_hand(kp[KP_PER_HAND:KP_PER_HAND * 2].reshape(21, 3))

    # Cara: relativa a la nariz (índice 10 en FACE_LANDMARKS_INDICES = punto 4 de Face Mesh)
    face = kp[KP_PER_HAND * 2:KP_PER_HAND * 2 + KP_FACE].reshape(12, 3)
    nariz = face[10].copy()          # índice 10 → punto 4 (nariz)
    face = face - nariz
    # Escala: distancia inter-ocular (ojos en índices 4,5 y 6,7 del subarray)
    ojo_der_center = (face[4] + face[5]) / 2
    ojo_izq_center = (face[6] + face[7]) / 2
    inter_ocular = np.linalg.norm(ojo_der_center[:2] - ojo_izq_center[:2])
    if inter_ocular > 1e-6:
        face = face / inter_ocular
    face = np.clip(face, -5.0, 5.0)

    # Hombros: relativos al punto medio, escalados por la distancia entre ellos
    pose = kp[KP_PER_HAND * 2 + KP_FACE:].reshape(2, 3)
    centro_hombros = pose.mean(axis=0)
    pose = pose - centro_hombros
    ancho = np.linalg.norm(pose[0, :2] - pose[1, :2])
    if ancho > 1e-6:
        pose = pose / ancho
    pose = np.clip(pose, -2.0, 2.0)

    return np.concatenate([
        hand1.flatten(), hand2.flatten(),
        face.flatten(), pose.flatten()
    ]).tolist()


# ── Alias para compatibilidad ─────────────────────────────────
def normalize_two_hands(keypoints: list) -> list:
    """Legacy: delega a normalize_holistic si tiene 168 kp,
    o normaliza solo las manos si tiene 126."""
    if len(keypoints) == KP_TOTAL:
        return normalize_holistic(keypoints)
    # Fallback: solo manos (126)
    if len(keypoints) == KP_PER_HAND * 2:
        kp = np.array(keypoints, dtype=np.float32)
        h1 = normalize_hand(kp[:KP_PER_HAND].reshape(21, 3))
        h2 = normalize_hand(kp[KP_PER_HAND:].reshape(21, 3))
        return np.concatenate([h1.flatten(), h2.flatten()]).tolist()
    return keypoints


def normalize_keypoints(keypoints: list) -> list:
    """Legacy: normaliza 63 keypoints de una sola mano."""
    if len(keypoints) != KP_PER_HAND:
        return keypoints
    kp = np.array(keypoints, dtype=np.float32).reshape(21, 3)
    return normalize_hand(kp).flatten().tolist()


def normalize_sequence(sequence: np.ndarray) -> np.ndarray:
    """Normaliza una secuencia completa (SEQUENCE_LEN, KP_TOTAL)."""
    result = np.zeros_like(sequence)
    for i in range(sequence.shape[0]):
        result[i] = normalize_holistic(sequence[i].tolist())
    return result


def augment_sequence(sequence: np.ndarray, n_augmented: int = 5) -> List[np.ndarray]:
    """Genera variaciones de una secuencia (SEQUENCE_LEN, KP_TOTAL)."""
    augmented = []
    seq_len, kp_dim = sequence.shape

    for i in range(n_augmented):
        transform = i % 5

        if transform == 0:
            noise = np.random.normal(0, 0.02, sequence.shape).astype(np.float32)
            new_seq = sequence + noise
        elif transform == 1:
            scale = np.random.uniform(0.85, 1.15)
            new_seq = sequence * scale
        elif transform == 2:
            new_seq = sequence.copy()
            for f in range(seq_len):
                frame = new_seq[f]
                # Espejo solo en las manos (primeros 126)
                for j in range(0, KP_PER_HAND, 3):
                    frame[j] = -frame[j]
                for j in range(KP_PER_HAND, KP_PER_HAND * 2, 3):
                    frame[j] = -frame[j]
                hand1 = frame[:KP_PER_HAND].copy()
                hand2 = frame[KP_PER_HAND:KP_PER_HAND * 2].copy()
                new_seq[f][:KP_PER_HAND * 2] = np.concatenate([hand2, hand1])
        elif transform == 3:
            new_seq = sequence.copy()
            idx = np.random.randint(1, seq_len - 1)
            if np.random.random() > 0.5:
                new_seq[idx] = new_seq[idx - 1]
            else:
                new_seq[idx] = (new_seq[idx - 1] + new_seq[min(idx + 1, seq_len - 1)]) / 2
        else:
            scale = np.random.uniform(0.9, 1.1)
            noise = np.random.normal(0, 0.015, sequence.shape).astype(np.float32)
            new_seq = sequence * scale + noise

        augmented.append(new_seq.astype(np.float32))

    return augmented
