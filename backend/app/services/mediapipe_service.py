# ============================================================
#  Servicio MediaPipe — Detección de keypoints de la mano
#  Compatible con MediaPipe 0.10.x (nueva API de Tasks)
# ============================================================

import cv2
import numpy as np
from typing import Optional
import time


class MediaPipeService:
    def __init__(self):
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision

        # Configurar las opciones del detector de manos
        base_options = mp_python.BaseOptions(
            model_asset_path=self._get_model_path()
        )
        options = mp_vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.IMAGE,
            num_hands=1,
            min_hand_detection_confidence=0.7,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.detector = mp_vision.HandLandmarker.create_from_options(options)
        self._mp = mp

    def _get_model_path(self) -> str:
        """Descarga el modelo si no existe y devuelve la ruta."""
        import urllib.request
        import os

        model_path = "/tmp/hand_landmarker.task"
        if not os.path.exists(model_path):
            url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            print("⬇️  Descargando modelo MediaPipe Hand Landmarker...")
            urllib.request.urlretrieve(url, model_path)
            print("✅ Modelo descargado.")
        return model_path

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

        # Crear imagen MediaPipe
        mp_image = self._mp.Image(
            image_format=self._mp.ImageFormat.SRGB,
            data=imagen_rgb
        )

        # Procesar con el detector de landmarks
        resultado = self.detector.detect(mp_image)

        # Verificar si detectó mano
        if not resultado.hand_landmarks:
            return None

        # Extraer los 21 landmarks de la primera mano
        mano = resultado.hand_landmarks[0]

        keypoints = []
        for landmark in mano:
            keypoints.append(round(float(landmark.x), 6))
            keypoints.append(round(float(landmark.y), 6))
            keypoints.append(round(float(landmark.z), 6))

        tiempo_ms = (time.time() - inicio) * 1000
        if tiempo_ms > 100:
            print(f"⚠️  Procesamiento lento: {tiempo_ms:.1f}ms")

        return keypoints  # Lista de 63 floats

    def cerrar(self):
        """Libera los recursos."""
        self.detector.close()