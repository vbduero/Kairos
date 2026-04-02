# ============================================================
#  Entrenamiento del Modelo LSC — LSTM
#  Input: (15, 126) — 15 frames × 126 keypoints
#  Ejecutar desde la raíz del proyecto:
#    python ai/scripts/entrenar_modelo.py
# ============================================================

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, callbacks
import matplotlib.pyplot as plt
import os
import json
import shutil

DATA_DIR = os.path.join(os.path.dirname(__file__), '../datasets')
MODELS_DIR = os.path.join(os.path.dirname(__file__), '../models/saved')
os.makedirs(MODELS_DIR, exist_ok=True)


def entrenar():
    print("🚀 Iniciando entrenamiento del modelo LSTM LSC...\n")

    try:
        X_train = np.load(os.path.join(DATA_DIR, 'X_train.npy'))
        X_test = np.load(os.path.join(DATA_DIR, 'X_test.npy'))
        y_train = np.load(os.path.join(DATA_DIR, 'y_train.npy'))
        y_test = np.load(os.path.join(DATA_DIR, 'y_test.npy'))

        with open(os.path.join(DATA_DIR, 'label_encoder.json'), 'r') as f:
            label_map = json.load(f)
            num_classes = len(label_map)

        print(f"✅ Datos cargados:")
        print(f"   X_train: {X_train.shape}")
        print(f"   X_test:  {X_test.shape}")
        print(f"   Clases:  {num_classes}")
    except Exception as e:
        print(f"❌ Error al cargar datos: {e}")
        return

    if len(X_train.shape) == 3:
        seq_len, features = X_train.shape[1], X_train.shape[2]
        print(f"   Formato: Secuencial ({seq_len} frames × {features} keypoints)")
        use_lstm = True
    else:
        features = X_train.shape[1]
        print(f"   Formato: Clásico ({features} keypoints)")
        use_lstm = False

    if use_lstm:
        model = models.Sequential([
            layers.Input(shape=(seq_len, features)),
            layers.LSTM(128, return_sequences=True),
            layers.Dropout(0.3),
            layers.LSTM(64),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation='softmax')
        ])
        print("🧠 Arquitectura: LSTM (secuencias temporales)")
    else:
        model = models.Sequential([
            layers.Input(shape=(features,)),
            layers.Dense(128, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(64, activation='relu'),
            layers.Dropout(0.3),
            layers.Dense(num_classes, activation='softmax')
        ])
        print("🧠 Arquitectura: Dense (frames individuales)")

    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.summary()

    early_stop = callbacks.EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)

    print("\n⏳ Entrenando...")
    history = model.fit(
        X_train, y_train, epochs=100, batch_size=32,
        validation_data=(X_test, y_test), callbacks=[early_stop], verbose=1
    )

    test_loss, test_acc = model.evaluate(X_test, y_test, verbose=0)
    print(f"\n🎯 Precisión final en test: {test_acc*100:.2f}%")

    h5_path = os.path.join(MODELS_DIR, 'lsc_classifier.h5')
    model.save(h5_path)
    print(f"💾 Modelo guardado en {h5_path}")

    shutil.copy(os.path.join(DATA_DIR, 'label_encoder.json'), os.path.join(MODELS_DIR, 'label_encoder.json'))
    print(f"📋 Label encoder copiado a {MODELS_DIR}")

    plt.figure(figsize=(12, 4))
    plt.subplot(1, 2, 1)
    plt.plot(history.history['accuracy'], label='Train')
    plt.plot(history.history['val_accuracy'], label='Val')
    plt.title('Accuracy')
    plt.legend()
    plt.subplot(1, 2, 2)
    plt.plot(history.history['loss'], label='Train')
    plt.plot(history.history['val_loss'], label='Val')
    plt.title('Loss')
    plt.legend()
    plot_path = os.path.join(MODELS_DIR, 'training_history.png')
    plt.tight_layout()
    plt.savefig(plot_path)
    print(f"📈 Gráfica guardada en {plot_path}")

    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    tflite_model = converter.convert()
    tflite_path = os.path.join(MODELS_DIR, 'lsc_classifier.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
    print(f"⚡ Modelo TFLite exportado en {tflite_path}")

    meta = {
        "type": "lstm" if use_lstm else "dense",
        "input_shape": list(X_train.shape[1:]),
        "num_classes": num_classes,
        "accuracy": float(test_acc),
        "sequence_length": seq_len if use_lstm else 1,
        "keypoints_per_frame": features
    }
    with open(os.path.join(MODELS_DIR, 'model_meta.json'), 'w') as f:
        json.dump(meta, f, indent=4)
    print(f"📝 Metadatos del modelo guardados")


if __name__ == "__main__":
    entrenar()
