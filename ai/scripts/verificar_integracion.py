import numpy as np
import json
import os
import sys

# Agregar el directorio raíz al path para importar el servicio
base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.join(base_dir, 'backend'))

try:
    from app.services.sign_classifier_service import SignClassifierService
except ImportError as e:
    print(f"❌ Error al importar SignClassifierService: {e}")
    sys.exit(1)

def verificar():
    print("🔍 Iniciando verificación de integración del Clasificador LSC...")
    
    # 1. Instanciar el servicio (Carga TFLite y JSON)
    try:
        classifier = SignClassifierService()
    except Exception as e:
        print(f"❌ Error al inicializar el servicio: {e}")
        return

    # 2. Cargar datos de prueba reales para simular una entrada
    x_test_path = os.path.join(base_dir, 'ai/datasets/X_test.npy')
    y_test_path = os.path.join(base_dir, 'ai/datasets/y_test.npy')
    label_path = os.path.join(base_dir, 'ai/datasets/label_encoder.json')

    try:
        X_test = np.load(x_test_path)
        y_test = np.load(y_test_path)
        with open(label_path, 'r') as f:
            label_map = json.load(f)
            inv_label_map = {v: k for k, v in label_map.items()}
    except FileNotFoundError as e:
        print(f"❌ No se encontró un archivo necesario: {e.filename}")
        print("Asegúrate de haber corrido preprocesar_datos.py primero.")
        return

    # 3. Probar con 5 muestras aleatorias del conjunto de TEST
    print(f"\n--- 🧪 Simulando 5 Injerencias Reales ---")
    indices = np.random.choice(len(X_test), 5, replace=False)
    
    aciertos = 0
    for idx in indices:
        keypoints = X_test[idx].tolist()
        real_sign = inv_label_map[y_test[idx]]
        
        # Realizar la predicción como lo haría el backend en producción
        pred_sign, confidence = classifier.predict(keypoints)
        
        resultado = "✅" if pred_sign == real_sign else "❌"
        print(f"[{resultado}] Real: {real_sign:10} | Predicho: {pred_sign:10} | Prob: {confidence:.2%}")
        
        if pred_sign == real_sign:
            aciertos += 1

    print("-" * 50)
    print(f"🎯 Resultado Final: {aciertos}/5 exitosos.")
    
    if aciertos >= 4:
        print("\n🚀 ¡TODO FUNCIONA! El modelo está integrado y prediciendo correctamente en el backend.")
    else:
        print("\n⚠️ El sistema funciona, pero la precisión en estas 5 muestras no fue ideal.")
        print("Esto es normal si el modelo tiene ~90% de precisión o si los datos de prueba son limitados.")

if __name__ == "__main__":
    verificar()
