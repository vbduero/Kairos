# Manos que Hablan — Documento Técnico de Presentación

---

## 1. ¿Qué es el proyecto?

**Manos que Hablan** es un traductor bidireccional de **Lenguaje de Señas Colombiano (LSC)** que opera en tiempo real desde el navegador web. Permite dos flujos:

- **Seña → Texto:** El usuario hace una seña frente a la cámara y el sistema la transcribe en texto.
- **Texto → Seña:** El usuario escribe una palabra y un avatar 3D reproduce la seña correspondiente.

El sistema combina visión por computadora, redes neuronales recurrentes y una interfaz web moderna, sin requerir hardware especializado — funciona con cualquier webcam.

---

## 2. Arquitectura General del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React 18)                     │
│  Traductor (Seña→Texto)    Avatar LSC (Texto→Seña)         │
└──────────────────┬───────────────────────┬──────────────────┘
                   │ WebSocket             │ REST API
                   ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│  MediaPipe Holistic     LSTM Classifier     Secuencias      │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    IA / ML (Python)                         │
│  recolectar → augmentar → preprocesar → entrenar            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Stack Tecnológico

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 18.3.1 | Framework UI |
| TypeScript | 5.4.5 | Tipado estático |
| Vite | 8.0.0 | Build tool |
| TailwindCSS | 4.2.1 | Estilos |
| Three.js | 0.164.1 | Renderizado 3D del avatar |
| @react-three/fiber | 8.16.8 | Integración Three.js con React |
| Zustand | 4.5.2 | Estado global |
| React Router | 6.23.1 | Navegación |

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| FastAPI | 0.109.2 | Framework API REST + WebSocket |
| Uvicorn | 0.29.0 | Servidor ASGI asincrónico |
| MediaPipe | 0.10.14 | Detección de keypoints (Holistic) |
| OpenCV | 4.9.0 | Procesamiento de imágenes |
| TensorFlow-CPU | 2.17.0 | Inferencia del modelo LSTM |
| NumPy | 1.26.4 | Operaciones numéricas |
| h5py | 3.10.0 | Lectura de pesos (fallback sin TF) |

### IA / ML
| Herramienta | Rol |
|---|---|
| TensorFlow / Keras | Entrenamiento del modelo BiLSTM |
| MediaPipe Holistic | Extracción de 168 keypoints/frame |
| NumPy | Augmentación y preprocesamiento |
| h5py | Carga de pesos como fallback |

---

## 4. Flujo Completo: Seña → Texto

```
1. CAPTURA (25 fps)
   Cámara → <video> → Canvas JPEG (640×480, quality 0.85)

2. ENVÍO
   WebSocket → Backend (blob.arrayBuffer cada 40ms)

3. DETECCIÓN (Backend - MediaPipe Holistic)
   JPEG → NumPy array → 168 keypoints
   [mano1: 63] [mano2: 63] [cara: 36] [hombros: 6]

4. NORMALIZACIÓN (keypoint_utils.py)
   168 crudos → 174 features normalizados
   + 6 features de zona espacial (muñecas relativas a hombros)

5. SUAVIZADO EMA (α=0.65)
   Elimina jitter frame a frame

6. BUFFER DESLIZANTE (5 frames)
   Acumula hasta tener 5 frames (≈ 1 segundo de gesto)

7. INFERENCIA BiLSTM
   Input: (1, 5, 174) → Output: (1, 17) probabilidades softmax
   Extrae: confianza, entropía, margen (top1 - top2)

8. FILTROS DE CALIDAD
   conf ≥ 0.45  +  entropy ≤ 0.42  +  margin ≥ 0.12

9. VOTACIÓN (ventana 2 frames, mayoría 2/2)
   conf_promedio ≥ 0.70 → predicción confirmada

10. COOLDOWN ADAPTATIVO
    conf ≥ 92% → 150ms | conf ≥ 80% → 250ms | resto → 400ms

11. RESPUESTA JSON → Frontend
    { predicted_sign: "hola", confidence: 0.98, buffer_progress: 1.0 }

12. DISPLAY
    SignDisplay muestra seña en grande + ConfidenceBar
    Auto-limpia 1.5s después de la última predicción válida
```

---

## 5. Flujo Completo: Texto → Seña (Avatar)

```
1. ENTRADA: "hola gracias"

2. TOKENIZACIÓN (normalizar + split)
   "hola" → encontrado ✓
   "gracias" → encontrado ✓

3. BÚSQUEDA DE SECUENCIAS
   GET /api/v1/signs/hola/sequence → [ 5 frames × 174 kp ]

4. INTERPOLACIÓN CATMULL-ROM (18 frames entre keyframes)
   5 keyframes → 90 frames → animación 60fps suave

5. ANIMACIÓN 3D (Three.js)
   21 joints/mano renderizados como esferas
   Conexiones como cilindros con quaternion
   OrbitControls: usuario puede rotar la vista
   Pausa 350ms entre señas
```

---

## 6. Modelo de IA — Arquitectura BiLSTM

### Entrada y Salida
- **Entrada:** tensor `(1, 5, 174)` — 5 frames × 174 features por frame
- **Salida:** vector de probabilidades `(1, 17)` — una por clase

### Capas
```
Input (1, 5, 174)
    ↓
Bidirectional LSTM (128 unidades, return_sequences=True)
    ↓
BatchNormalization + Dropout (0.3)
    ↓
Bidirectional LSTM (64 unidades)
    ↓
BatchNormalization + Dropout (0.3)
    ↓
Dense (128, ReLU) + Dropout (0.25)
    ↓
Dense (64, ReLU) + Dropout (0.2)
    ↓
Dense (17, Softmax) → probabilidades por clase
```

### Configuración de Entrenamiento
| Parámetro | Valor |
|---|---|
| Optimizador | Adam (lr=1e-3) |
| Loss | Sparse Categorical Crossentropy |
| Epochs máx | 150 |
| EarlyStopping | patience=20 |
| ReduceLROnPlateau | factor=0.5, patience=7, min_lr=1e-5 |
| Train/Test split | 80% / 20% |

### Resultado
- **Precisión en test:** 100%
- **Formato guardado:** lsc_classifier.h5

---

## 7. Normalización de Keypoints (174 features)

| Segmento | Índices | Features | Normalización |
|---|---|---|---|
| Mano 1 | 0–62 | 63 | Relativa a muñeca, escala XY máx, clip ±2 |
| Mano 2 | 63–125 | 63 | Relativa a muñeca, escala XY máx, clip ±2 |
| Cara | 126–161 | 36 | Relativa a nariz, escala inter-ocular, clip ±5 |
| Hombros | 162–167 | 6 | Relativa a centro, escala ancho, clip ±2 |
| **Zona espacial** | 168–173 | 6 | Muñecas relativas a hombros, clip ±5 |
| **TOTAL** | | **174** | |

> La **zona espacial** es clave para distinguir señas con forma de mano similar pero posición corporal diferente (ej: "hola" vs otras señas).

---

## 8. Pipeline de Datos

### Fase 1: Recolección
- Script interactivo (`recolectar_datos.py`) con menú OpenCV
- **50 muestras por seña** × **5 frames por muestra** (≈1 segundo)
- Detección de iluminación automática (CLAHE)
- Cuadrícula de regla de tercios para posicionamiento consistente
- Selección de cámara (compatible con Camo Studio / iPhone como webcam)
- Guardado: `ai/datasets/sequences/{seña}/{muestra}.npy`

### Fase 2: Augmentación (×6 variaciones)
| Transformación | Descripción |
|---|---|
| Ruido gaussiano | ±0.02 σ por keypoint |
| Escalado | Factor aleatorio 0.85–1.15 |
| Espejo horizontal | Negar X + intercambiar manos |
| Interpolación | Suavizado entre frames vecinos |
| Combinado | Escalado + ruido simultáneo |

**Resultado:** 50 originales → **300 muestras por seña**

### Fase 3: Preprocesamiento
- Auto-detección de formato (126 / 168 / 174 keypoints)
- Normalización completa → 174 features
- Submuestreo si hay más frames del necesario (`np.linspace`)
- Split 80/20 aleatorio (seed=42)
- Guardado: `X_train.npy`, `X_test.npy`, `y_train.npy`, `y_test.npy`

### Fase 4: Entrenamiento
- BiLSTM + BatchNorm + Dropout (ver Sección 6)
- Duración: ~5–10 minutos en CPU
- Guardado: `.h5`, `model_meta.json`, `training_history.png`

---

## 9. Vocabulario Actual (17 clases)

### Palabras y frases
| Categoría | Señas |
|---|---|
| Saludos | hola, adios |
| Cortesía | gracias, por favor |
| Respuestas | si, no |
| Necesidades | agua, casa, familia |

### Alfabeto (parcial)
`a, b, c, e, f, i, l, o`

### Estadísticas de datos
| Métrica | Valor |
|---|---|
| Señas entrenadas | 17 |
| Muestras originales | 50 por seña |
| Muestras con augmentación | 300 por seña |
| Total secuencias entrenamiento | ~4.250 |
| Precisión en test | **100%** |

---

## 10. Características del Sistema en Tiempo Real

### Latencia
| Etapa | Tiempo |
|---|---|
| MediaPipe Holistic | ~30–50 ms/frame |
| Inferencia LSTM | ~60–80 ms (NumPy fallback) |
| Buffer (5 frames) | ~250 ms para llenarse |
| Votación (2 frames) | ~100 ms |
| Cooldown mínimo (conf≥92%) | 150 ms |
| **Latencia total percibida** | **~450–600 ms** |

### Parámetros de Detección
| Parámetro | Valor | Propósito |
|---|---|---|
| EMA Alpha | 0.65 | Suavizado de keypoints entre frames |
| RAW_CONF_MIN | 0.45 | Umbral mínimo para entrar a votación |
| CONF_THRESHOLD | 0.70 | Confianza promedio para confirmar |
| ENTROPY_THRESHOLD | 0.42 | Rechaza predicciones inciertas |
| MARGIN_MIN | 0.12 | Rechaza empates entre clases |
| PRED_WINDOW_SIZE | 2 | Votos necesarios (unanimidad 2/2) |

### Robustez
- **3 motores de inferencia fallback:** TFLite → Keras → NumPy puro
- **EMA smoothing:** elimina jitter de MediaPipe
- **Cooldown adaptativo:** evita múltiples detecciones del mismo gesto
- **Auto-reset de buffer:** 5 frames sin mano limpian el estado

---

## 11. Estructura del Proyecto

```
manos-que-hablan-v1/
├── frontend/                     # React 18 + TypeScript
│   └── src/
│       ├── pages/
│       │   ├── TranslatorPage.tsx    # Seña → Texto
│       │   ├── AvatarPage.tsx        # Texto → Seña
│       │   └── AboutPage.tsx         # Equipo
│       ├── components/
│       │   ├── camera/CameraCapture.tsx
│       │   ├── avatar/HandSkeleton.tsx
│       │   └── ui/ (SignDisplay, ConfidenceBar, Navbar...)
│       ├── hooks/
│       │   ├── useWebSocket.ts       # Comunicación WS
│       │   └── useCamera.ts          # Acceso cámara
│       └── store/translatorStore.ts  # Estado global Zustand
│
├── backend/                      # FastAPI + Python
│   └── app/
│       ├── api/endpoints/
│       │   ├── websocket.py          # Pipeline tiempo real
│       │   └── signs.py              # REST vocabulario
│       └── services/
│           ├── mediapipe_service.py  # 168 keypoints/frame
│           └── sign_classifier_service.py  # Inferencia
│
└── ai/                           # Pipeline ML
    ├── datasets/
    │   ├── sequences/            # 17 señas × 50 muestras
    │   └── sequences_augmented/  # 17 señas × 300 muestras
    ├── models/saved/
    │   ├── lsc_classifier.h5     # Modelo entrenado
    │   └── model_meta.json       # Metadatos
    ├── scripts/
    │   ├── recolectar_datos.py   # Menú interactivo
    │   ├── augmentar_datos.py    # ×6 variaciones
    │   ├── preprocesar_datos.py  # Normalización + split
    │   └── entrenar_modelo.py    # Entrenamiento BiLSTM
    └── utils/keypoint_utils.py   # Normalización 168→174
```

---

## 12. API REST — Endpoints Disponibles

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/` | Health check |
| `GET` | `/health` | Estado del servidor |
| `GET` | `/docs` | Documentación Swagger |
| `WS` | `/ws` | Stream de detección en tiempo real |
| `GET` | `/api/v1/signs` | Lista vocabulario con disponibilidad |
| `GET` | `/api/v1/signs/{sign}/sequence` | Frames de animación para el avatar |

---

## 13. Estado Actual y Roadmap

### Completado ✅
- Pipeline completo de datos (recolección → augmentación → preprocesamiento → entrenamiento)
- Clasificador BiLSTM en tiempo real con WebSocket
- Frontend React completo con traductor y avatar 3D
- 17 señas con 100% de precisión en test
- Cuadrícula de tercios (grabación y frontend)
- Vocabulario dinámico en el avatar (cargado desde backend)
- Sistema de votación + cooldown adaptativo

### En Progreso 🔄
- Grabación de señas restantes para alcanzar vocabulario completo

### Vocabulario Objetivo (47 clases)
- Alfabeto completo: a–z (faltan: d, g, h, j, k, m, n, ñ, p, q, r, s, t, u, v, w, x, y, z)
- Palabras nuevas: trabajo, escuela, comer, dormir, baño, doctor, policía, emergencia, nombre, ayuda, cómo estás

---

## 14. Cómo Ejecutar el Sistema

```bash
# Terminal 1 — Backend
cd backend
venv/Scripts/activate          # Windows
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev                    # http://localhost:3000

# Terminal 3 — Recolección de datos (cuando se necesite)
python ai/scripts/recolectar_datos.py
```

---

## 15. Resumen Ejecutivo

**Manos que Hablan** es una plataforma web de código abierto que busca reducir la barrera de comunicación entre personas oyentes y la comunidad sorda colombiana mediante tecnología accesible.

| Característica | Detalle |
|---|---|
| Tipo | Aplicación web fullstack |
| Lenguaje objetivo | LSC (Lengua de Señas Colombiana) |
| Modalidades | Seña→Texto y Texto→Seña |
| Hardware requerido | Solo webcam estándar |
| Modelo IA | BiLSTM bidireccional |
| Precisión actual | 100% (17 clases) |
| Vocabulario actual | 17 señas |
| Vocabulario planificado | 47 señas |
| Latencia de detección | ~450–600 ms |
| Tecnologías principales | React, FastAPI, MediaPipe, TensorFlow |
