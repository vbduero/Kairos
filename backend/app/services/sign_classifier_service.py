import os
import json
import sys
import numpy as np
import logging
from typing import Tuple, Optional
from collections import deque

# ── Intento 1: TensorFlow completo ──────────────────────────────
try:
    import tensorflow as tf
    _tf_interpreter = tf.lite.Interpreter
    TF_AVAILABLE = True
except Exception:
    TF_AVAILABLE = False

# ── Intento 2: ai-edge-litert (successor de tflite-runtime) ─────
if not TF_AVAILABLE:
    try:
        from ai_edge_litert.interpreter import Interpreter as _tf_interpreter
        TF_AVAILABLE = True
    except Exception:
        pass

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'ai'))
from utils.keypoint_utils import normalize_two_hands, normalize_keypoints, KP_TOTAL, SEQUENCE_LEN


# ════════════════════════════════════════════════════════════════
#  Motor de inferencia LSTM en numpy puro
#  Fallback cuando TF / tflite-runtime no pueden cargar sus DLLs.
#  Carga los pesos desde el archivo .h5 vía h5py (sin nativas de TF).
# ════════════════════════════════════════════════════════════════
class _NumpyLSTMEngine:
    """
    Forward pass numpy del modelo LSTM entrenado.
    Implementa exactamente la arquitectura de Keras:
      LSTM(128, return_sequences=True) → LSTM(64) → Dense(64,relu) → Dense(N,softmax)
    """

    def __init__(self, h5_path: str):
        try:
            import h5py
        except ImportError:
            raise RuntimeError("h5py no disponible. Instala con: pip install h5py")

        with h5py.File(h5_path, 'r') as f:
            mw = f['model_weights']

            # LSTM 1 — 128 unidades, return_sequences=True
            l1 = mw['lstm/sequential/lstm/lstm_cell']
            self.W1 = l1['kernel'][()].astype(np.float32)            # (126, 512)
            self.U1 = l1['recurrent_kernel'][()].astype(np.float32)  # (128, 512)
            self.b1 = l1['bias'][()].astype(np.float32)              # (512,)

            # LSTM 2 — 64 unidades
            l2 = mw['lstm_1/sequential/lstm_1/lstm_cell']
            self.W2 = l2['kernel'][()].astype(np.float32)            # (128, 256)
            self.U2 = l2['recurrent_kernel'][()].astype(np.float32)  # (64, 256)
            self.b2 = l2['bias'][()].astype(np.float32)              # (256,)

            # Dense(64, relu)
            d1 = mw['dense/sequential/dense']
            self.Wd1 = d1['kernel'][()].astype(np.float32)           # (64, 64)
            self.bd1 = d1['bias'][()].astype(np.float32)             # (64,)

            # Dense(num_classes, softmax)
            d2 = mw['dense_1/sequential/dense_1']
            self.Wd2 = d2['kernel'][()].astype(np.float32)           # (64, 7)
            self.bd2 = d2['bias'][()].astype(np.float32)             # (7,)

        self.units1 = self.W1.shape[1] // 4   # 128
        self.units2 = self.W2.shape[1] // 4   # 64

    @staticmethod
    def _sigmoid(x: np.ndarray) -> np.ndarray:
        return 1.0 / (1.0 + np.exp(-np.clip(x, -88.0, 88.0)))

    def _lstm(self, x: np.ndarray, W: np.ndarray, U: np.ndarray,
              b: np.ndarray, units: int, return_sequences: bool) -> np.ndarray:
        """
        Keras LSTM forward pass.
        Orden de compuertas: [i, f, c, o]  (igual que Keras LSTMCell)
        x: (batch, seq_len, input_dim)
        """
        batch, seq_len, _ = x.shape
        h = np.zeros((batch, units), dtype=np.float32)
        c = np.zeros((batch, units), dtype=np.float32)
        outputs = []

        for t in range(seq_len):
            xt = x[:, t, :]                    # (batch, input_dim)
            z = xt @ W + h @ U + b             # (batch, 4*units)

            i_g = self._sigmoid(z[:, 0*units:1*units])
            f_g = self._sigmoid(z[:, 1*units:2*units])
            g   = np.tanh(     z[:, 2*units:3*units])
            o_g = self._sigmoid(z[:, 3*units:4*units])

            c = f_g * c + i_g * g
            h = o_g * np.tanh(c)

            if return_sequences:
                outputs.append(h.copy())

        if return_sequences:
            return np.stack(outputs, axis=1)   # (batch, seq_len, units)
        return h                               # (batch, units)

    def predict(self, sequence: np.ndarray) -> np.ndarray:
        """
        sequence: (1, 15, 126)
        returns:  (1, num_classes) — probabilidades softmax
        """
        x = sequence.astype(np.float32)
        x = self._lstm(x, self.W1, self.U1, self.b1, self.units1, return_sequences=True)
        x = self._lstm(x, self.W2, self.U2, self.b2, self.units2, return_sequences=False)
        x = np.maximum(0.0, x @ self.Wd1 + self.bd1)   # Dense + ReLU
        logits = x @ self.Wd2 + self.bd2                 # Dense (sin activación)
        e = np.exp(logits - logits.max(axis=-1, keepdims=True))
        return e / e.sum(axis=-1, keepdims=True)          # Softmax


# ════════════════════════════════════════════════════════════════
#  Servicio principal de clasificación de señas
# ════════════════════════════════════════════════════════════════
class SignClassifierService:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        models_dir = os.path.join(base_dir, "ai", "models", "saved")

        self.tflite_path = os.path.join(models_dir, "lsc_classifier.tflite")
        self.h5_path     = os.path.join(models_dir, "lsc_classifier.h5")
        self.label_path  = os.path.join(models_dir, "label_encoder.json")
        self.meta_path   = os.path.join(models_dir, "model_meta.json")

        # Estado interno
        self.interpreter   = None   # TFLite interpreter (si TF disponible)
        self.numpy_engine  = None   # _NumpyLSTMEngine (fallback)
        self.labels        = {}
        self.input_details = None
        self.output_details = None
        self.model_type    = "lstm"
        self.sequence_length = SEQUENCE_LEN
        self.kp_per_frame  = KP_TOTAL

        self._load_meta()
        self._load_model()
        self._load_labels()

    def _load_meta(self):
        if os.path.exists(self.meta_path):
            with open(self.meta_path, 'r') as f:
                meta = json.load(f)
            self.model_type      = meta.get("type", "lstm")
            self.sequence_length = meta.get("sequence_length", SEQUENCE_LEN)
            self.kp_per_frame    = meta.get("keypoints_per_frame", KP_TOTAL)
            print(f"📝 Modelo tipo: {self.model_type}, seq_len: {self.sequence_length}, kp/frame: {self.kp_per_frame}")

    def _load_model(self):
        # ── Intento A: TFLite (TF o ai-edge-litert) ──────────────
        if TF_AVAILABLE and os.path.exists(self.tflite_path):
            try:
                self.interpreter = _tf_interpreter(model_path=self.tflite_path)
                self.interpreter.allocate_tensors()
                self.input_details  = self.interpreter.get_input_details()
                self.output_details = self.interpreter.get_output_details()
                print(f"✅ Modelo LSC cargado via TFLite (input: {self.input_details[0]['shape']})")
                return
            except Exception as e:
                logging.warning(f"TFLite falló: {e}")
                self.interpreter = None

        # ── Intento B: numpy puro desde .h5 ──────────────────────
        if os.path.exists(self.h5_path):
            try:
                self.numpy_engine = _NumpyLSTMEngine(self.h5_path)
                print("✅ Modelo LSC cargado via numpy (h5py) — sin dependencia de TF DLLs")
                return
            except Exception as e:
                logging.error(f"numpy engine falló: {e}")

        print("❌ No se pudo cargar el modelo. Clasificador en modo SIMULADO.")

    def _load_labels(self):
        if not os.path.exists(self.label_path):
            print(f"❌ No se encontró el label encoder en {self.label_path}")
            return
        with open(self.label_path, 'r') as f:
            mapping = json.load(f)
        self.labels = {int(v): k for k, v in mapping.items()}
        print(f"✅ Cargadas {len(self.labels)} clases: {list(self.labels.values())}")

    # ── Buffer ────────────────────────────────────────────────────
    def create_buffer(self) -> deque:
        return deque(maxlen=self.sequence_length)

    def add_frame_to_buffer(self, buffer: deque, keypoints: list) -> bool:
        kp_norm = normalize_two_hands(keypoints) if len(keypoints) == KP_TOTAL else keypoints
        buffer.append(kp_norm)
        return len(buffer) >= self.sequence_length

    # ── Predicción desde buffer completo ─────────────────────────
    def predict_from_buffer(self, buffer: deque) -> Tuple[Optional[str], float]:
        if not self.labels or len(buffer) < self.sequence_length:
            return None, 0.0

        sequence = np.array(list(buffer), dtype=np.float32)  # (15, 126)
        input_data = np.expand_dims(sequence, axis=0)         # (1, 15, 126)

        return self._run_inference(input_data)

    # ── Inferencia ────────────────────────────────────────────────
    def _run_inference(self, input_data: np.ndarray) -> Tuple[Optional[str], float]:
        # Ruta A: TFLite
        if self.interpreter is not None:
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            probs = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
            idx = int(np.argmax(probs))
            return self.labels.get(idx, "Desconocido"), float(probs[idx])

        # Ruta B: numpy LSTM
        if self.numpy_engine is not None:
            probs = self.numpy_engine.predict(input_data)[0]
            idx = int(np.argmax(probs))
            return self.labels.get(idx, "Desconocido"), float(probs[idx])

        return None, 0.0

    # ── Predicción frame único (legacy) ──────────────────────────
    def predict(self, keypoints: list) -> Tuple[Optional[str], float]:
        if not self.labels:
            return None, 0.0
        if len(keypoints) == KP_TOTAL:
            keypoints = normalize_two_hands(keypoints)
        elif len(keypoints) == 63:
            keypoints = normalize_keypoints(keypoints)
        else:
            return None, 0.0
        input_data = np.array([keypoints], dtype=np.float32)
        if self.interpreter is not None:
            expected = self.input_details[0]['shape'][-1]
            if input_data.shape[-1] > expected:
                input_data = input_data[:, :expected]
        return self._run_inference(input_data)
