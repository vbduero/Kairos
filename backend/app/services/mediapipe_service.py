# ============================================================
#  Servicio MediaPipe — Detección de keypoints de la mano
#  Compatible con Windows (mp.solutions) y Linux (Tasks API)
#  Detecta automáticamente el sistema operativo y usa la API
#  correspondiente sin necesidad de cambiar el código.
# ============================================================

import cv2
import numpy as np
from typing import Optional
import time
import sys


class MediaPipeService:
    def __init__(self):
        self.es_windows = sys.platform == "win32"

        if self.es_windows:
            self._init_windows()
        else:
            self._init_linux()

    def _init_windows(self):
        """
        Windows: usa mp.solutions.hands
        La nueva API de Tasks falla por conflicto de librerías C++
        """
        import mediapipe as mp
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5,
        )
        print("✅ MediaPipe inicializado en modo Windows")

    def _init_linux(self):
        """
        Linux/Mac: usa la nueva API de Tasks
        Más eficiente y con mejor soporte a futuro
        """
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision
        import urllib.request
        import os

        # Descargar modelo si no existe
        ruta_modelo = "models/hand_landmarker.task"
        os.makedirs("models", exist_ok=True)
        if not os.path.exists(ruta_modelo):
            print("📥 Descargando modelo de MediaPipe...")
            url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            urllib.request.urlretrieve(url, ruta_modelo)
            print("✅ Modelo descargado")

        base_options = mp_python.BaseOptions(
            model_asset_path=ruta_modelo
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
        self.mp = mp
        print("✅ MediaPipe inicializado en modo Linux")

    def procesar_frame(self, imagen_bytes: bytes) -> Optional[list]:
        """
        Recibe bytes de imagen y devuelve 63 keypoints normalizados.

        Returns:
            Lista de 63 floats si detecta mano, None si no hay mano.
        """
        inicio = time.time()

        array = np.frombuffer(imagen_bytes, dtype=np.uint8)
        imagen = cv2.imdecode(array, cv2.IMREAD_COLOR)

        if imagen is None:
            return None

        imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)

        if self.es_windows:
            keypoints = self._procesar_windows(imagen_rgb)
        else:
            keypoints = self._procesar_linux(imagen_rgb)

        tiempo_ms = (time.time() - inicio) * 1000
        if tiempo_ms > 100:
            print(f"⚠️  Procesamiento lento: {tiempo_ms:.1f}ms")

        return keypoints

    def _procesar_windows(self, imagen_rgb) -> Optional[list]:
        resultado = self.hands.process(imagen_rgb)
        if not resultado.multi_hand_landmarks:
            return None
        mano = resultado.multi_hand_landmarks[0]
        keypoints = []
        for landmark in mano.landmark:
            keypoints.append(round(float(landmark.x), 6))
            keypoints.append(round(float(landmark.y), 6))
            keypoints.append(round(float(landmark.z), 6))
        return keypoints

    def _procesar_linux(self, imagen_rgb) -> Optional[list]:
        mp_image = self.mp.Image(
            image_format=self.mp.ImageFormat.SRGB,
            data=imagen_rgb
        )
        resultado = self.detector.detect(mp_image)
        if not resultado.hand_landmarks:
            return None
        keypoints = []
        for landmark in resultado.hand_landmarks[0]:
            keypoints.append(round(float(landmark.x), 6))
            keypoints.append(round(float(landmark.y), 6))
            keypoints.append(round(float(landmark.z), 6))
        return keypoints

    def cerrar(self):
        if self.es_windows:
            self.hands.close()
        else:
            self.detector.close()