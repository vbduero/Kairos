import os
import json
import sys
import numpy as np
import tensorflow as tf
from typing import Tuple, Optional
from collections import deque

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'ai'))
from utils.keypoint_utils import normalize_two_hands, normalize_keypoints, KP_TOTAL, SEQUENCE_LEN


class SignClassifierService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        models_dir = os.path.join(base_dir, "ai", "models", "saved")

        self.tflite_path = os.path.join(models_dir, "lsc_classifier.tflite")
        self.label_path = os.path.join(models_dir, "label_encoder.json")
        self.meta_path = os.path.join(models_dir, "model_meta.json")

        self.interpreter = None
        self.labels = {}
        self.input_details = None
        self.output_details = None
        self.model_type = "dense"
        self.sequence_length = 1
        self.kp_per_frame = 63

        self._load_meta()
        self._load_model()
        self._load_labels()

    def _load_meta(self):
        if os.path.exists(self.meta_path):
            with open(self.meta_path, 'r') as f:
                meta = json.load(f)
            self.model_type = meta.get("type", "dense")
            self.sequence_length = meta.get("sequence_length", 1)
            self.kp_per_frame = meta.get("keypoints_per_frame", 63)
            print(f"📝 Modelo tipo: {self.model_type}, seq_len: {self.sequence_length}, kp/frame: {self.kp_per_frame}")

    def _load_model(self):
        if not os.path.exists(self.tflite_path):
            print(f"❌ Error: No se encontró el modelo en {self.tflite_path}")
            return
        self.interpreter = tf.lite.Interpreter(model_path=self.tflite_path)
        self.interpreter.allocate_tensors()
        if self.interpreter:
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            input_shape = self.input_details[0]['shape']
            print(f"✅ Modelo LSC cargado (input shape: {input_shape})")

    def _load_labels(self):
        if not os.path.exists(self.label_path):
            print(f"❌ Error: No se encontró el label encoder en {self.label_path}")
            return
        with open(self.label_path, 'r') as f:
            mapping = json.load(f)
            self.labels = {int(v): k for k, v in mapping.items()}
        print(f"✅ Cargadas {len(self.labels)} clases para clasificación")

    def create_buffer(self) -> deque:
        return deque(maxlen=self.sequence_length)

    def add_frame_to_buffer(self, buffer: deque, keypoints: list) -> bool:
        if len(keypoints) == KP_TOTAL:
            kp_norm = normalize_two_hands(keypoints)
        else:
            kp_norm = keypoints
        buffer.append(kp_norm)
        return len(buffer) >= self.sequence_length

    def predict_from_buffer(self, buffer: deque) -> Tuple[Optional[str], float]:
        if self.interpreter is None or not self.labels:
            return None, 0.0

        if self.model_type == "lstm" and len(buffer) >= self.sequence_length:
            sequence = np.array(list(buffer), dtype=np.float32)
            input_data = np.expand_dims(sequence, axis=0)
        elif self.model_type == "dense" and len(buffer) > 0:
            last_frame = list(buffer)[-1]
            if len(last_frame) > self.kp_per_frame:
                last_frame = last_frame[:self.kp_per_frame]
            input_data = np.array([last_frame], dtype=np.float32)
        else:
            return None, 0.0

        return self._run_inference(input_data)

    def predict(self, keypoints: list) -> Tuple[Optional[str], float]:
        if self.interpreter is None or not self.labels:
            return None, 0.0

        if len(keypoints) == KP_TOTAL:
            keypoints = normalize_two_hands(keypoints)
        elif len(keypoints) == 63:
            keypoints = normalize_keypoints(keypoints)
        else:
            return None, 0.0

        input_data = np.array([keypoints], dtype=np.float32)
        # Truncate if model expects less
        expected = self.input_details[0]['shape'][-1]
        if input_data.shape[-1] > expected:
            input_data = input_data[:, :expected]
        return self._run_inference(input_data)

    def _run_inference(self, input_data: np.ndarray) -> Tuple[Optional[str], float]:
        if self.interpreter is None or self.input_details is None or self.output_details is None:
            return None, 0.0
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()
        output_data = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        idx = np.argmax(output_data)
        confidence = float(output_data[idx])
        label = self.labels.get(idx, "Desconocido")
        return label, confidence
