# ============================================================
#  Utilidades de Keypoints — Normalización y Augmentation
#  Soporta 2 manos (126 keypoints) y secuencias temporales
# ============================================================

import numpy as np
from typing import List

# Constantes
KP_PER_HAND = 63   # 21 puntos × 3 coordenadas
KP_TOTAL = 126     # 2 manos
SEQUENCE_LEN = 15  # frames por secuencia


def normalize_keypoints(keypoints: list) -> list:
    """
    Normaliza 63 keypoints de UNA mano (legacy, para compatibilidad).
    Centra al wrist y escala por distancia máxima.
    """
    if len(keypoints) != 63:
        return keypoints
    
    kp = np.array(keypoints, dtype=np.float32).reshape(21, 3)
    wrist = kp[0].copy()
    kp = kp - wrist
    max_dist = np.max(np.linalg.norm(kp, axis=1))
    if max_dist > 1e-6:
        kp = kp / max_dist
    return kp.flatten().tolist()


def normalize_hand(hand_kp: np.ndarray) -> np.ndarray:
    """
    Normaliza los keypoints de una mano (21, 3).
    Si la mano es ceros (no detectada), la deja como ceros.
    """
    if np.all(np.abs(hand_kp) < 1e-6):
        return hand_kp
    
    wrist = hand_kp[0].copy()
    hand_kp = hand_kp - wrist
    max_dist = np.max(np.linalg.norm(hand_kp, axis=1))
    if max_dist > 1e-6:
        hand_kp = hand_kp / max_dist
    return hand_kp


def normalize_two_hands(keypoints_126: list) -> list:
    """
    Normaliza 126 keypoints (2 manos × 21 × 3).
    Cada mano se normaliza independientemente.
    """
    if len(keypoints_126) != KP_TOTAL:
        return keypoints_126
    
    kp = np.array(keypoints_126, dtype=np.float32)
    
    hand1 = kp[:KP_PER_HAND].reshape(21, 3)
    hand2 = kp[KP_PER_HAND:].reshape(21, 3)
    
    hand1 = normalize_hand(hand1)
    hand2 = normalize_hand(hand2)
    
    return np.concatenate([hand1.flatten(), hand2.flatten()]).tolist()


def normalize_sequence(sequence: np.ndarray) -> np.ndarray:
    """
    Normaliza una secuencia completa (SEQUENCE_LEN, 126).
    """
    result = np.zeros_like(sequence)
    for i in range(sequence.shape[0]):
        result[i] = normalize_two_hands(sequence[i].tolist())
    return result


def augment_sequence(sequence: np.ndarray, n_augmented: int = 5) -> List[np.ndarray]:
    """
    Genera variaciones de una secuencia (SEQUENCE_LEN, 126).
    """
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
                for j in range(0, KP_PER_HAND, 3):
                    frame[j] = -frame[j]
                for j in range(KP_PER_HAND, KP_TOTAL, 3):
                    frame[j] = -frame[j]
                hand1 = frame[:KP_PER_HAND].copy()
                hand2 = frame[KP_PER_HAND:].copy()
                new_seq[f] = np.concatenate([hand2, hand1])
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
