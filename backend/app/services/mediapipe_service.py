# ============================================================
#  Servicio MediaPipe Holistic
#  Detecta en un solo pase:
#    - 2 manos       → 126 keypoints (21 × 3 × 2)
#    - 12 puntos cara → 36 keypoints  (expresión facial LSC)
#    - 2 hombros     →  6 keypoints   (postura)
#  Total: 168 keypoints por frame
# ============================================================

import cv2
import numpy as np
from typing import Optional
import time
import sys


class MediaPipeService:
    NUM_KEYPOINTS_PER_HAND = 63    # 21 × 3
    KP_FACE                = 36    # 12 puntos × 3
    KP_POSE                = 6     # 2 hombros × 3
    NUM_KEYPOINTS_TOTAL    = 168   # total

    # Índices de Face Mesh a extraer (12 puntos de expresión facial)
    FACE_INDICES = [61, 291, 13, 14, 33, 133, 362, 263, 70, 300, 4, 152]

    # Índices de Pose a extraer (hombros)
    POSE_INDICES = [11, 12]

    def __init__(self, min_detection_confidence: float = 0.70,
                 min_tracking_confidence: float = 0.70):
        self._det_conf = min_detection_confidence
        self._trk_conf = min_tracking_confidence
        self._init_holistic()

    def _init_holistic(self):
        import mediapipe as mp
        self._mp = mp
        self._holistic = mp.solutions.holistic.Holistic(
            static_image_mode=False,
            model_complexity=0,       # 0=rápido (~30-50ms/frame); 1 consume >100ms en CPUs lentas → cooldown se alarga
            smooth_landmarks=True,    # suaviza transiciones entre frames
            refine_face_landmarks=False,
            enable_segmentation=False,
            smooth_segmentation=False,
            min_detection_confidence=self._det_conf,
            min_tracking_confidence=self._trk_conf,
        )
        print(
            f"✅ MediaPipe Holistic inicializado "
            f"(manos + rostro + hombros → {self.NUM_KEYPOINTS_TOTAL} kp/frame)"
        )

    # ── Extracción de puntos ──────────────────────────────────────
    def _landmarks_a_kp(self, landmarks_obj, indices: list | None = None) -> list:
        """Extrae x,y,z de los landmarks indicados (o todos si indices=None)."""
        if indices is not None:
            puntos = [landmarks_obj.landmark[i] for i in indices]
        else:
            puntos = landmarks_obj.landmark
        kp = []
        for p in puntos:
            kp.extend([round(float(p.x), 6),
                       round(float(p.y), 6),
                       round(float(p.z), 6)])
        return kp

    # ── Procesamiento de frame ────────────────────────────────────
    def procesar_frame(self, imagen_bytes: bytes) -> Optional[list]:
        """
        Retorna 168 floats si al menos una mano está presente, None si no.
        Formato: [mano1 0:63][mano2 63:126][cara 126:162][hombros 162:168]
        """
        inicio = time.time()

        array  = np.frombuffer(imagen_bytes, dtype=np.uint8)
        imagen = cv2.imdecode(array, cv2.IMREAD_COLOR)
        # ── Reducción de resolución para VELOCIDAD EXTREMA ───────────
        # Bajar la resolución a 320x240 (o similar) reduce el área de 
        # píxeles a la cuarta parte, haciendo que Holistic vuele en CPU.
        # Como los keypoints salen normalizados [0..1], no afecta la IA.
        imagen_pequena = cv2.resize(imagen, (320, 240), interpolation=cv2.INTER_AREA)

        # ── Mejora de contraste (CLAHE) para ayudar a la IA ──────────
        imagen_yuv = cv2.cvtColor(imagen_pequena, cv2.COLOR_BGR2YUV)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        imagen_yuv[:, :, 0] = clahe.apply(imagen_yuv[:, :, 0])
        imagen_rgb = cv2.cvtColor(imagen_yuv, cv2.COLOR_YUV2RGB)
        
        resultado  = self._holistic.process(imagen_rgb)

        # Sin ninguna mano → sin dato
        hay_mano = (resultado.left_hand_landmarks is not None or
                    resultado.right_hand_landmarks is not None)
        if not hay_mano:
            return None

        mano_ceros = [0.0] * self.NUM_KEYPOINTS_PER_HAND
        cara_ceros = [0.0] * self.KP_FACE
        pose_ceros = [0.0] * self.KP_POSE

        # ── Manos: ordenadas por x (consistencia con datos anteriores) ──
        manos_raw = []
        for lm in (resultado.right_hand_landmarks, resultado.left_hand_landmarks):
            if lm is not None:
                manos_raw.append(self._landmarks_a_kp(lm))

        manos_raw = sorted(manos_raw, key=lambda kp: kp[0])  # menor x primero
        kp_mano1  = manos_raw[0]
        kp_mano2  = manos_raw[1] if len(manos_raw) > 1 else mano_ceros

        # ── Cara: 12 puntos clave ────────────────────────────────────
        if resultado.face_landmarks:
            kp_cara = self._landmarks_a_kp(resultado.face_landmarks, self.FACE_INDICES)
        else:
            kp_cara = cara_ceros

        # ── Hombros desde Pose ───────────────────────────────────────
        if resultado.pose_landmarks:
            kp_pose = self._landmarks_a_kp(resultado.pose_landmarks, self.POSE_INDICES)
        else:
            kp_pose = pose_ceros

        keypoints = kp_mano1 + kp_mano2 + kp_cara + kp_pose  # 63+63+36+6=168

        tiempo_ms = (time.time() - inicio) * 1000
        if tiempo_ms > 250:
            h, w = imagen.shape[:2]
            # Solo avisamos si el frame tardó más de 250ms (micro-corte)
            # print(f"⚠️  Holistic lento: {tiempo_ms:.0f} ms (size={w}x{h})")

        return keypoints

    def cerrar(self):
        self._holistic.close()
