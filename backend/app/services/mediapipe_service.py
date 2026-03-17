# ============================================================
#  Servicio MediaPipe — Detección de keypoints de la mano
#  Compatible con MediaPipe 0.10.14 en Windows
# ============================================================

import cv2
import numpy as np
from typing import Optional
import time


class MediaPipeService:
    def __init__(self):
        import mediapipe as mp
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )

    def procesar_frame(self, imagen_bytes: bytes) -> Optional[list]:
        """
        Recibe bytes de imagen y devuelve 63 keypoints normalizados.

        Returns:
            Lista de 63 floats si detecta mano, None si no hay mano.
        """
        inicio = time.time()

        # Convertir bytes a imagen
        array = np.frombuffer(imagen_bytes, dtype=np.uint8)
        imagen = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if imagen is None:
            return None

        # Convertir BGR a RGB
        imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)

        # Procesar con MediaPipe
        resultado = self.hands.process(imagen_rgb)

        # Verificar si detectó mano
        if not resultado.multi_hand_landmarks:
            return None

        # Extraer los 21 landmarks
        mano = resultado.multi_hand_landmarks[0]

        keypoints = []
        for landmark in mano.landmark:
            keypoints.append(round(float(landmark.x), 6))
            keypoints.append(round(float(landmark.y), 6))
            keypoints.append(round(float(landmark.z), 6))

        tiempo_ms = (time.time() - inicio) * 1000
        if tiempo_ms > 100:
            print(f"⚠️  Procesamiento lento: {tiempo_ms:.1f}ms")

        return keypoints

    def cerrar(self):
        """Libera los recursos."""
        self.hands.close()


# Instancia global — se inicializa cuando se necesita
# mediapipe_service = MediaPipeService()