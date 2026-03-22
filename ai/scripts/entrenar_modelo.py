import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
import matplotlib.pyplot as plt
import os
import json
import shutil

# --- CONFIGURACIÓN ---
DATA_DIR = 'ai/datasets'
MODELS_DIR = 'ai/models/saved'
os.makedirs(MODELS_DIR, exist_ok=True)

def entrenar():
    print("🚀 Iniciando entrenamiento del modelo LSC...")
    
    # 1. Cargar datos preprocesados
    try:
        X_train = np.load(os.path.join(DATA_DIR, 'X_train.npy'))
        X_test = np.load(os.path.join(DATA_DIR, 'X_test.npy'))
        y_train = np.load(os.path.join(DATA_DIR, 'y_train.npy'))
        y_test = np.load(os.path.join(DATA_DIR, 'y_test.npy'))
        
        with open(os.path.join(DATA_DIR, 'label_encoder.json'), 'r') as f:
            label_map = json.load(f)
            num_classes = len(label_map)
            
        print(f"✅ Datos cargados. Clases: {num_classes}")
    except Exception as e:
        print(f"❌ Error al cargar datos: {e}")
        return

    # 2. Definir arquitectura del modelo (Según diseño en imagen)
    # Entrada(63) -> Dense(128, ReLU) -> Dropout(0.3) -> Dense(64, ReLU) -> Dropout(0.3) -> Dense(20, Softmax)
    model = models.Sequential([
        layers.Input(shape=(63,)),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.3),
        layers.Dense(num_classes, activation='softmax')
    ])

    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )

    model.summary()

    # 3. Entrenamiento con EarlyStopping
    early_stop = callbacks.EarlyStopping(
        monitor='val_loss',
        patience=15,
        restore_best_weights=True
    )

    print("\n⏳ Entrenando...")
    history = model.fit(
        X_train, y_train,
        epochs=100,
        batch_size=32,
        validation_data=(X_test, y_test),
        callbacks=[early_stop],
        verbose=1
    )

    # 4. Evaluación final
    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n🎯 Precisión final en test: {test_acc*100:.2f}%")

    # 5. Guardar modelo y archivos relacionados
    # Guardar en formato .h5 (Legacy Keras) como pide la imagen
    h5_path = os.path.join(MODELS_DIR, 'lsc_classifier.h5')
    model.save(h5_path)
    print(f"💾 Modelo guardado en {h5_path}")

    # Copia del label encoder al directorio de modelos
    shutil.copy(os.path.join(DATA_DIR, 'label_encoder.json'), 
                os.path.join(MODELS_DIR, 'label_encoder.json'))
    print(f"📋 Label encoder copiado a {MODELS_DIR}")

    # 6. Graficar y guardar historial
    plt.figure(figsize=(12, 4))
    
    # Accuracy
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Train Accuracy')
    plt.plot(history.history['val_accuracy'], label='Val Accuracy')
    plt.title('Model Accuracy')
    plt.xlabel('Epoch')
    plt.ylabel('Accuracy')
    plt.legend()

    # Loss
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Val Loss')
    plt.title('Model Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss')
    plt.legend()

    plot_path = os.path.join(MODELS_DIR, 'training_history.png')
    plt.tight_layout()
    plt.savefig(plot_path)
    print(f"📈 Gráfica de entrenamiento guardada en {plot_path}")

    # 7. Exportar a TFLite (Opcional pero recomendado para Fase 2)
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    tflite_path = os.path.join(MODELS_DIR, 'lsc_classifier.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    print(f"⚡ Modelo TFLite exportado en {tflite_path}")

if __name__ == "__main__":
    entrenar()
