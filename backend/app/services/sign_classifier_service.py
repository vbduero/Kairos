import os
import json
import numpy as np
import tensorflow as tf
from typing import Tuple, Optional

class SignClassifierService:
    def __init__(self):
        # Rutas dinámicas basadas en la ubicación del archivo
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        models_dir = os.path.join(base_dir, "ai", "models", "saved")
        
        self.tflite_path = os.path.join(models_dir, "lsc_classifier.tflite")
        self.label_path = os.path.join(models_dir, "label_encoder.json")
        
        self.interpreter = None
        self.labels = {}
        self.input_details = None
        self.output_details = None
        
        self._load_model()
        self._load_labels()

    def _load_model(self):
        if not os.path.exists(self.tflite_path):
            print(f"❌ Error: No se encontró el modelo en {self.tflite_path}")
            return
        
        self.interpreter = tf.lite.Interpreter(model_path=self.tflite_path)
        self.interpreter.allocate_tensors()
        
        if self.interpreter:
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()
            print(f"✅ Modelo LSC Clasificado cargado desde TFLite")

    def _load_labels(self):
        if not os.path.exists(self.label_path):
            print(f"❌ Error: No se encontró el label encoder en {self.label_path}")
            return
            
        with open(self.label_path, 'r') as f:
            mapping = json.load(f)
            # Invertir el mapeo: {ID: "Nombre"}
            self.labels = {int(v): k for k, v in mapping.items()}
        print(f"✅ Cargadas {len(self.labels)} clases para clasificación")

    def predict(self, keypoints: list) -> Tuple[Optional[str], float]:
        """
        Predice la seña a partir de los 63 keypoints.
        
        Args:
            keypoints: Lista de 63 floats (x, y, z de 21 puntos).
            
        Returns:
            Tupla (seña_detectada, confianza).
        """
        if self.interpreter is None or not self.labels:
            return None, 0.0
            
        if len(keypoints) != 63:
            return None, 0.0

        # Enviar a la red neuronal
        if self.interpreter is not None and self.input_details is not None and self.output_details is not None:
            # Preparar entrada (Batch size 1, 63 features)
            input_data = np.array([keypoints], dtype=np.float32)
            
            # Ejecutar inferencia
            self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
            self.interpreter.invoke()
            
            # Obtener resultado
            output_data = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
            
            # Encontrar clase con mayor probabilidad
            idx = np.argmax(output_data)
            confidence = float(output_data[idx])
            label = self.labels.get(idx, "Desconocido")
            
            return label, confidence
            
        return None, 0.0
