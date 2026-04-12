# ============================================================
#  Servicio MediaPipe — Detección de keypoints de las manos
#  Soporta detección de 2 manos (126 keypoints = 2 × 21 × 3)
#  Compatible con Windows (mp.solutions) y Linux (Tasks API)
# ============================================================

import cv2
import numpy as np
from typing import Optional
import time
import sys


class MediaPipeService:
    NUM_KEYPOINTS_PER_HAND = 63
    NUM_KEYPOINTS_TOTAL = 126

    def __init__(self, min_detection_confidence=0.80, min_tracking_confidence=0.80):
        self.es_windows = sys.platform == "win32"
        self._det_conf = min_detection_confidence
        self._trk_conf = min_tracking_confidence
        if self.es_windows:
            self._init_windows()
        else:
            self._init_linux()

    def _init_windows(self):
        import mediapipe as mp
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=2,
            model_complexity=1,          # más rápido (menor latencia por frame)
            min_detection_confidence=self._det_conf,
            min_tracking_confidence=self._trk_conf,
        )
        print("✅ MediaPipe inicializado en modo Windows (2 manos)")

    def _init_linux(self):
        import mediapipe as mp
        from mediapipe.tasks import python as mp_python
        from mediapipe.tasks.python import vision as mp_vision
        import urllib.request
        import os

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        ruta_modelo = os.path.join(base_dir, "models", "hand_landmarker.task")
        os.makedirs(os.path.dirname(ruta_modelo), exist_ok=True)
        if not os.path.exists(ruta_modelo):
            print("📥 Descargando modelo de MediaPipe...")
            url = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            urllib.request.urlretrieve(url, ruta_modelo)
            print("✅ Modelo descargado")

        base_options = mp_python.BaseOptions(model_asset_path=ruta_modelo)
        options = mp_vision.HandLandmarkerOptions(
            base_options=base_options,
            running_mode=mp_vision.RunningMode.IMAGE,
            num_hands=2,
            min_hand_detection_confidence=self._det_conf,
            min_hand_presence_confidence=self._trk_conf,
            min_tracking_confidence=self._trk_conf,
        )
        self.detector = mp_vision.HandLandmarker.create_from_options(options)
        self.mp = mp
        print("✅ MediaPipe inicializado en modo Linux (2 manos)")

    def _extraer_keypoints_mano(self, landmarks) -> list:
        keypoints = []
        for landmark in landmarks:
            keypoints.append(round(float(landmark.x), 6))
            keypoints.append(round(float(landmark.y), 6))
            keypoints.append(round(float(landmark.z), 6))
        return keypoints

    def _ordenar_manos_por_x(self, manos: list) -> list:
        if len(manos) <= 1:
            return manos
        return sorted(manos, key=lambda kp: kp[0])

    def procesar_frame(self, imagen_bytes: bytes) -> Optional[list]:
        inicio = time.time()
        array = np.frombuffer(imagen_bytes, dtype=np.uint8)
        imagen = cv2.imdecode(array, cv2.IMREAD_COLOR)
        if imagen is None:
            return None

        imagen_rgb = cv2.cvtColor(imagen, cv2.COLOR_BGR2RGB)

        if self.es_windows:
            manos_keypoints = self._procesar_windows(imagen_rgb)
        else:
            manos_keypoints = self._procesar_linux(imagen_rgb)

        tiempo_ms = (time.time() - inicio) * 1000
        if tiempo_ms > 100:
            print(f"⚠️  Procesamiento lento: {tiempo_ms:.1f}ms")

        if not manos_keypoints:
            return None

        manos_keypoints = self._ordenar_manos_por_x(manos_keypoints)
        mano_ceros = [0.0] * self.NUM_KEYPOINTS_PER_HAND

        if len(manos_keypoints) >= 2:
            resultado = manos_keypoints[0] + manos_keypoints[1]
        else:
            resultado = manos_keypoints[0] + mano_ceros

        return resultado

    def _procesar_windows(self, imagen_rgb) -> Optional[list]:
        resultado = self.hands.process(imagen_rgb)
        if not resultado.multi_hand_landmarks:
            return None
        manos = []
        for mano in resultado.multi_hand_landmarks:
            kp = self._extraer_keypoints_mano(mano.landmark)
            manos.append(kp)
        return manos

    def _procesar_linux(self, imagen_rgb) -> Optional[list]:
        mp_image = self.mp.Image(image_format=self.mp.ImageFormat.SRGB, data=imagen_rgb)
        resultado = self.detector.detect(mp_image)
        if not resultado.hand_landmarks:
            return None
        manos = []
        for mano_landmarks in resultado.hand_landmarks:
            kp = self._extraer_keypoints_mano(mano_landmarks)
            manos.append(kp)
        return manos

    def cerrar(self):
        if self.es_windows:
            self.hands.close()
        else:
            self.detector.close()