<div align="center">

# Kairos

**Traductor de Lengua de Señas Colombiana (LSC) en tiempo real**

Reconocimiento de señas por cámara web mediante MediaPipe Holistic + un clasificador
BiLSTM, con panel de apoyo para docentes y seguimiento de progreso del estudiante.

`React 18` · `TypeScript` · `Vite` · `TailwindCSS 4` · `FastAPI` · `SQLAlchemy` · `MediaPipe` · `TensorFlow / TFLite`

</div>

---

## Tabla de contenidos

1. [¿Qué es Kairos?](#qué-es-kairos)
2. [Estado actual del proyecto](#estado-actual-del-proyecto)
3. [Stack tecnológico](#stack-tecnológico)
4. [Arquitectura y flujo](#arquitectura-y-flujo)
5. [Estructura del repositorio](#estructura-del-repositorio)
6. [Instalación](#instalación)
7. [Ejecución](#ejecución)
8. [API](#api)
9. [Pipeline de IA (recolectar → entrenar)](#pipeline-de-ia-recolectar--entrenar)
10. [Base de datos](#base-de-datos)
11. [Problemas frecuentes](#problemas-frecuentes)
12. [Roadmap](#roadmap)

---

## ¿Qué es Kairos?

Kairos es una aplicación web que traduce **Lengua de Señas Colombiana a texto en tiempo real**
usando únicamente la cámara del computador. Está pensada para el aula: el estudiante sordo se
comunica mediante señas y el docente habla por micrófono, cerrando el circuito de comunicación
en ambos sentidos.

Tres capacidades principales:

| Capacidad | Descripción |
|---|---|
| **Traductor** | La cámara captura frames → se extraen keypoints → el modelo predice la seña → se construye la frase. |
| **Panel docente** | Transcribe la voz del profesor a texto (Web Speech API) para que el estudiante lo lea. |
| **Logros / estadísticas** | Registra señas reconocidas, frases construidas, tiempo de uso e intentos fallidos, y genera sugerencias de práctica. |

---

## Estado actual del proyecto

> **Fase actual: prototipo funcional (v0.1.0) — en desarrollo activo.**

**Ya funciona:**

- ✅ Pipeline completo cámara → WebSocket → MediaPipe Holistic → clasificador → texto.
- ✅ Modelo BiLSTM entrenado con **17 clases** (letras + palabras frecuentes), exportado a TFLite.
- ✅ Filtrado de predicciones por confianza, entropía, margen top1/top2, votación por ventana y cooldown adaptativo (evita el "parpadeo" de predicciones).
- ✅ Suavizado EMA de keypoints para estabilizar la detección.
- ✅ Grabación de muestras **desde la web** (`/api/v1/record`) — ya no hace falta el script de terminal.
- ✅ Reentrenamiento del modelo disparado desde la API (augmentar → preprocesar → entrenar) con recarga en caliente del clasificador.
- ✅ Panel de audio del docente con transcripción por voz.
- ✅ Página de Logros con métricas persistidas en SQLite.
- ✅ Motor de inferencia **fallback en NumPy puro**, para máquinas donde TensorFlow no carga sus librerías nativas.

**Pendiente / en curso:**

- 🚧 Vocabulario objetivo: 50 señas (alfabeto completo + expresiones de aula). Hoy hay 17 entrenadas.
- 🚧 Dataset con pocas muestras por clase → el modelo aún sobreajusta (accuracy reportada 1.0 sobre un set pequeño).
- 🚧 Migración opcional a PostgreSQL (hoy corre en SQLite).
- 🚧 Autenticación y perfiles de usuario.
- 🚧 Despliegue (los Dockerfiles existen pero el compose no está validado end-to-end).

---

## Stack tecnológico

### Frontend
| Herramienta | Uso |
|---|---|
| React 18 + TypeScript | UI |
| Vite 8 | Dev server y build |
| TailwindCSS 4 | Estilos |
| Zustand | Estado global (`translatorStore`, `uiStore`) |
| React Router 6 | Navegación (`/`, `/logros`) |
| Recharts | Gráficas de la página de Logros |
| lucide-react | Iconografía |
| axios | Cliente HTTP |
| html2pdf.js | Exportar reportes |
| Web Speech API | Transcripción de voz del docente |

### Backend
| Herramienta | Uso |
|---|---|
| FastAPI 0.109 | API REST + WebSocket |
| Uvicorn | Servidor ASGI |
| SQLAlchemy 2.0 (async) + aiosqlite | ORM y persistencia |
| Alembic | Migraciones |
| Pydantic v2 + pydantic-settings | Validación y configuración |
| MediaPipe ≥0.10 | Extracción de keypoints (Holistic) |
| OpenCV (headless) | Decodificación de frames |
| TensorFlow-CPU / TFLite | Inferencia del clasificador |
| spaCy | NLP para construcción de frases |

### IA
| Herramienta | Uso |
|---|---|
| MediaPipe Holistic | 168 keypoints crudos por frame (manos + pose + cara relevante) |
| NumPy | Normalización y augmentación |
| Keras / TensorFlow | Entrenamiento BiLSTM |
| TFLite | Modelo exportado para inferencia rápida |

**Modelo actual** (`ai/models/saved/model_meta.json`):

```json
{ "type": "lstm", "input_shape": [5, 174], "num_classes": 17, "sequence_length": 5, "keypoints_per_frame": 174 }
```

Arquitectura: `LSTM(128, return_sequences) → LSTM(64) → Dense(64, relu) → Dense(N, softmax)`

---

## Arquitectura y flujo

```
┌──────────────────────────────────────────────────────────────────────┐
│                             NAVEGADOR                                │
│  CameraCapture ──frames JPEG base64──┐        TeacherAudioPanel      │
│  (useCamera)                          │        (Web Speech API)       │
│  SignDisplay / ConfidenceBar ◄────────┤                              │
│  SignHistory / LearningPanel          │  statsService ──HTTP──┐      │
└───────────────────────────────────────┼───────────────────────┼──────┘
                                 ws://localhost:8000/ws    http://localhost:8000
                                        │                       │
┌───────────────────────────────────────▼───────────────────────▼──────┐
│                            BACKEND FastAPI                           │
│                                                                      │
│  /ws  ──►  MediaPipeService      (Holistic, 1 hilo — NO thread-safe) │
│              │ 168 keypoints crudos                                  │
│              ▼                                                       │
│            keypoint_utils.normalize_*  (normalización por muñeca)    │
│              │ ventana de 5 frames × 174 features                    │
│              ▼                                                       │
│            SignClassifierService  (TFLite → fallback NumPy LSTM)     │
│              │ softmax                                               │
│              ▼                                                       │
│            Filtros: confianza ≥0.70 · entropía ≤0.42 · margen ≥0.12  │
│                     votación 2/2 · cooldown adaptativo               │
│              │                                                       │
│              └──► {"sign": "hola", "confidence": 0.93} ──► frontend  │
│                                                                      │
│  /api/v1/signs    · vocabulario disponible                           │
│  /api/v1/record   · grabar muestras y reentrenar                     │
│  /api/v1/stats    · métricas y sugerencias                           │
└──────────────────────────┬───────────────────────────────────────────┘
                           ▼
                    SQLite (backend/sqlite.db)
```

**Flujo de una traducción, paso a paso:**

1. `useCamera` abre la webcam y `CameraCapture` envía frames JPEG (base64) por WebSocket.
2. El backend decodifica el frame con OpenCV y lo pasa a MediaPipe Holistic (un único worker: MediaPipe guarda estado de tracking y no es thread-safe).
3. Se obtienen 168 keypoints crudos → se normalizan respecto a la muñeca y se escalan → 174 features.
4. Se acumula una ventana deslizante de 5 frames y se suaviza con EMA (`α = 0.65`).
5. El clasificador TFLite devuelve la distribución softmax.
6. Una predicción solo se confirma si supera confianza, entropía y margen, y gana 2/2 votos en la ventana. Después entra un cooldown adaptativo (más corto cuanta más confianza).
7. La seña confirmada viaja al frontend, se añade al historial y a la frase en construcción, y se registra en `/api/v1/stats/sign`.

---

## Estructura del repositorio

```
Kairos/
├── ai/                          # Todo lo relacionado con el modelo
│   ├── datasets/
│   │   ├── lsc_dataset.csv      # Dataset tabular de keypoints
│   │   ├── label_encoder.json
│   │   └── sequences/<seña>/*.npy   # Secuencias crudas por seña
│   ├── models/saved/
│   │   ├── lsc_classifier.tflite    # Modelo en producción
│   │   ├── label_encoder.json
│   │   └── model_meta.json
│   ├── notebooks/               # Exploración y entrenamiento
│   ├── scripts/
│   │   ├── recolectar_datos.py  # Grabación por terminal
│   │   ├── augmentar_datos.py   # Augmentación ×5
│   │   ├── preprocesar_datos.py # Normalización → tensores
│   │   ├── entrenar_modelo.py   # Entrenamiento BiLSTM + export TFLite
│   │   └── test_*.py            # Pruebas de mediapipe, ws, clasificador
│   └── utils/keypoint_utils.py  # Normalización, augmentación, constantes
│
├── backend/
│   ├── app/
│   │   ├── main.py              # Entrypoint FastAPI
│   │   ├── core/                # config.py (settings) · database.py
│   │   ├── models/              # sign · translation · stats (SQLAlchemy)
│   │   ├── services/            # mediapipe_service · sign_classifier_service
│   │   └── api/endpoints/       # websocket · signs · record · stats
│   ├── models/hand_landmarker.task
│   ├── recreate_tables.py       # Recrea el esquema de la BD
│   ├── requirements.txt
│   └── sqlite.db                # BD de desarrollo (versionada a propósito)
│
├── frontend/
│   ├── src/
│   │   ├── pages/               # TranslatorPage · LogrosPage
│   │   ├── components/
│   │   │   ├── camera/CameraCapture.tsx
│   │   │   ├── teacher/TeacherAudioPanel.tsx
│   │   │   ├── learning/LearningPanel.tsx
│   │   │   ├── layout/Sidebar.tsx
│   │   │   └── ui/              # Navbar · SignDisplay · ConfidenceBar · …
│   │   ├── hooks/               # useCamera · useWebSocket
│   │   ├── store/               # translatorStore · uiStore (Zustand)
│   │   └── services/statsService.ts
│   ├── public/                  # logo.png · mascot.png
│   └── vite.config.ts           # Dev server en :3000
│
├── scripts/                     # Lanzadores .sh / .bat con splash
├── docs/INSTALACION.md          # Guía detallada de instalación
├── docker-compose.yml
└── .env.example
```

---

## Instalación

> Guía detallada (incluido el parche de MediaPipe en Windows) en [`docs/INSTALACION.md`](docs/INSTALACION.md).

### Requisitos

- **Python 3.11**
- **Node.js 18+** y npm 9+
- Cámara web
- Git

### 1. Clonar

```bash
git clone https://github.com/vbduero/Kairos.git
cd Kairos
```

### 2. Variables de entorno

```bash
cp .env.example .env
cp .env backend/.env
```

Para desarrollo local puedes dejar SQLite (es el valor por defecto en `app/core/config.py`):

```
DATABASE_URL=sqlite+aiosqlite:///./sqlite.db
```

### 3. Backend

```bash
cd backend
python3 -m venv venv

source venv/bin/activate      # Linux / macOS
# venv\Scripts\activate       # Windows

pip install -r requirements.txt
```

**Linux** — si MediaPipe u OpenCV fallan al cargar:

```bash
sudo apt-get install libgl1-mesa-glx libglib2.0-0
```

**Windows** — aplicar el parche a `venv/Lib/site-packages/mediapipe/tasks/python/core/optional_dependencies.py` descrito en `docs/INSTALACION.md`.

### 4. Frontend

```bash
cd ../frontend
npm install
```

---

## Ejecución

Dos terminales:

**Terminal 1 — Backend**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

**Terminal 2 — Frontend**
```bash
cd frontend
npm run dev
```

O usando los lanzadores incluidos:

```bash
bash scripts/start_backend.sh     # Linux / macOS
bash scripts/start_frontend.sh
scripts\start_backend.bat         # Windows
scripts\start_frontend.bat
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Documentación Swagger | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws |

> Las URLs del backend están fijas en `frontend/src/hooks/useWebSocket.ts` y `frontend/src/services/statsService.ts`. Si cambias el puerto del backend, actualízalas ahí.

### Docker (experimental)

```bash
docker compose up --build
```

---

## API

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/` | Ping de la API |
| `GET` | `/health` | Healthcheck |
| `WS` | `/ws` | Stream de frames → predicción de señas |
| `GET` | `/api/v1/signs` | Vocabulario disponible y si tiene secuencias grabadas |
| `GET` | `/api/v1/record/vocabulary` | Vocabulario con conteo de muestras (objetivo: 50 por seña) |
| `POST` | `/api/v1/record/sample` | Guarda una secuencia de 5 frames para una seña |
| `POST` | `/api/v1/record/retrain` | Lanza el pipeline de reentrenamiento en segundo plano |
| `GET` | `/api/v1/record/retrain/status` | Estado del reentrenamiento (`idle` / `running` / `done` / `error`) |
| `POST` | `/api/v1/stats/sign` | Registra una seña reconocida |
| `POST` | `/api/v1/stats/time` | Registra tiempo de uso |
| `POST` | `/api/v1/stats/phrase` | Registra una frase construida |
| `POST` | `/api/v1/stats/failed` | Registra un intento fallido |
| `POST` | `/api/v1/stats/teacher_response` | Registra una respuesta del docente |
| `GET` | `/api/v1/stats/summary` | Resumen de métricas |
| `GET` | `/api/v1/stats/ai-suggestions` | Sugerencias de práctica según los fallos |

---

## Pipeline de IA (recolectar → entrenar)

### Opción A — desde la web (recomendada)

En la interfaz, grabar muestras de cada seña y pulsar *reentrenar*. Internamente ejecuta el mismo pipeline que la opción B y recarga el clasificador sin reiniciar el servidor.

### Opción B — desde la terminal

```bash
# 1. Recolectar secuencias (guarda .npy crudos de 168 kp)
python ai/scripts/recolectar_datos.py
#    o los atajos: bash recolectar_senas.sh  /  recolectar_senas.bat

# 2. Augmentar (×5 por muestra: ruido, escala, desplazamiento temporal)
python ai/scripts/augmentar_datos.py

# 3. Preprocesar (normalizar y armar tensores)
python ai/scripts/preprocesar_datos.py

# 4. Entrenar BiLSTM y exportar a TFLite
python ai/scripts/entrenar_modelo.py
```

Salidas en `ai/models/saved/`: `lsc_classifier.tflite`, `label_encoder.json`, `model_meta.json`.

### Verificación

```bash
python ai/scripts/test_mediapipe.py        # ¿MediaPipe detecta las manos?
python ai/scripts/test_classifier.py       # ¿El modelo carga y predice?
python ai/scripts/test_websocket.py        # ¿El WS responde end-to-end?
python ai/scripts/verificar_integracion.py # Chequeo general
```

### Recomendaciones de recolección

- Mínimo **50 muestras** por seña.
- Variar mano, ángulo, distancia y velocidad.
- Buena iluminación y fondo limpio.

---

## Base de datos

Por defecto **SQLite** (`backend/sqlite.db`). Las tablas se crean automáticamente al arrancar
(`Base.metadata.create_all` en el evento `startup`).

Tablas de estadísticas (`app/models/stats.py`):

| Tabla | Contenido |
|---|---|
| `RecognizedSign` | Cada seña reconocida con su timestamp |
| `AppUsage` | Segundos de uso de la app |
| `ConstructedPhrase` | Frase, nº de palabras y tiempo empleado |
| `TeacherResponse` | Texto transcrito del docente |
| `FailedAttempt` | Seña intentada y confianza obtenida (0–100) |

Para recrear el esquema desde cero (⚠️ borra los datos):

```bash
cd backend
python recreate_tables.py
```

> El archivo `backend/sqlite.db` **está versionado a propósito** para que todo el equipo trabaje
> con los mismos datos de prueba. Si en el futuro se quiere excluir, añadir `backend/*.db` al `.gitignore`.

---

## Problemas frecuentes

| Síntoma | Causa / solución |
|---|---|
| `ImportError: libGL.so.1` | Faltan librerías del sistema: `sudo apt-get install libgl1-mesa-glx libglib2.0-0` |
| MediaPipe falla al importar en Windows | Aplicar el parche de `optional_dependencies.py` (ver `docs/INSTALACION.md`) |
| TensorFlow no carga sus DLL | El clasificador cae automáticamente al motor NumPy puro; es más lento pero funciona |
| El frontend no recibe predicciones | Verificar que el backend esté en `:8000` y que `ALLOWED_ORIGINS` incluya `http://localhost:3000` |
| La cámara no abre | El navegador exige `localhost` o HTTPS para acceder a la webcam |
| Predicciones inestables | Ajustar `CONF_THRESHOLD`, `ENTROPY_THRESHOLD` y `MARGIN_MIN` en `app/api/endpoints/websocket.py` |
| Detecciones muy lentas | MediaPipe corre en un único hilo por diseño (no es thread-safe); no aumentar `max_workers` |

---

## Roadmap

- [ ] Completar el vocabulario a 50 señas (alfabeto + expresiones de aula)
- [ ] Ampliar el dataset a ≥50 muestras reales por clase y validar con un split honesto
- [ ] Traducción inversa: texto → animación de señas
- [ ] Autenticación y perfiles de estudiante/docente
- [ ] Migración a PostgreSQL
- [ ] Tests automatizados (pytest en backend)
- [ ] Despliegue con Docker validado end-to-end

---

## Créditos

Proyecto desarrollado por [@vbduero](https://github.com/vbduero).

Repositorio: <https://github.com/vbduero/Kairos>
