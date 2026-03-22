import pandas as pd
import numpy as np
import json
import os

# --- CONFIGURACIÓN ---
DATASET_RAW = 'ai/datasets/lsc_dataset.csv'
OUTPUT_DIR = 'ai/datasets'
TRAIN_TEST_SPLIT = 0.8

def preprocesar():
    print("🔍 Iniciando preprocesamiento de datos...")
    
    if not os.path.exists(DATASET_RAW):
        print(f"❌ Error: No se encontró el archivo {DATASET_RAW}")
        return

    # 1. Cargar datos
    df = pd.read_csv(DATASET_RAW)
    print(f"📊 Dataset cargado: {len(df)} muestras totales.")

    # 2. Verificar completitud y limpiar
    # Eliminar filas con valores nulos
    df_clean = df.dropna()
    if len(df_clean) < len(df):
        print(f"🧹 Se eliminaron {len(df) - len(df_clean)} filas con valores nulos.")
    
    # Verificar muestras por seña
    counts = df_clean['label'].value_counts()
    print("\nDistribución por seña:")
    print(counts)
    
    clases_insuficientes = counts[counts < 40].index.tolist()
    if clases_insuficientes:
        print(f"⚠️ Advertencia: Las siguientes señas tienen menos de 40 muestras: {clases_insuficientes}")

    # 3. Codificar etiquetas (Label Encoding)
    clases = sorted(df_clean['label'].unique().tolist())
    label_map = {label: i for i, label in enumerate(clases)}
    df_clean['label_id'] = df_clean['label'].map(label_map)
    
    # Guardar el mapeo
    with open(os.path.join(OUTPUT_DIR, 'label_encoder.json'), 'w') as f:
        json.dump(label_map, f, indent=4)
    print(f"✅ Label encoder guardado ({len(clases)} clases).")

    # 4. Preparar X (keypoints) e y (labels)
    X = df_clean.drop(['label', 'label_id'], axis=1).values.astype('float32')
    y = df_clean['label_id'].values.astype('int32')

    # 5. Dividir en entrenamiento y prueba (Shuffle + Split)
    indices = np.arange(X.shape[0])
    np.random.seed(42) # Reproducibilidad
    np.random.shuffle(indices)
    
    X = X[indices]
    y = y[indices]
    
    split_idx = int(len(X) * TRAIN_TEST_SPLIT)
    
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    # 6. Guardar arrays de numpy
    np.save(os.path.join(OUTPUT_DIR, 'X_train.npy'), X_train)
    np.save(os.path.join(OUTPUT_DIR, 'X_test.npy'), X_test)
    np.save(os.path.join(OUTPUT_DIR, 'y_train.npy'), y_train)
    np.save(os.path.join(OUTPUT_DIR, 'y_test.npy'), y_test)

    print("\n✅ Preprocesamiento completado:")
    print(f"   - Entrenamiento: {X_train.shape} {y_train.shape}")
    print(f"   - Prueba: {X_test.shape} {y_test.shape}")
    print(f"   - Archivos guardados en {OUTPUT_DIR}")

if __name__ == "__main__":
    preprocesar()
