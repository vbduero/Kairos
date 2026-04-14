# Manos que Hablan

Traductor bidireccional de **Lenguaje de Señas Colombiano (LSC)** con inteligencia artificial y avatar 3D.

Proyecto académico — Ingeniería de Software 2 · Semestre 2026-1  
Fundación Escuela Tecnológica de Neiva "Jesús Oviedo Pérez"

---

## ¿Qué hace?

| Dirección | Entrada | Salida |
|---|---|---|
| **Señas → Texto** | Cámara web en tiempo real | Texto en español con indicador de confianza |
| **Texto → Avatar** | Texto escrito | Avatar 3D esquelético ejecutando la seña |

---

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| Fase 0 | Estructura base del proyecto | Completada |
| Fase 1 | Backend FastAPI + WebSocket + Frontend React base | Completada |
| Fase 2A | Pipeline de datos LSC (recolección → augmentación → entrenamiento) | Completada |
| Fase 2B | Clasificador LSTM en tiempo real con MediaPipe Holistic | Completada |
| Fase 2C | Avatar 3D esquelético con Three.js + interpolación Catmull-Rom | Completada |
| Fase 3 | Integración frontend completa + UI rediseñada | Completada |
| Fase 4 | Expansión de vocabulario LSC (señas adicionales) | En progreso |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS |
| Backend | FastAPI + WebSockets (uvicorn) |
| Visión por computadora | MediaPipe Holistic (manos + cara + hombros) |
| IA / Clasificación | TensorFlow CPU 2.17 + LSTM + inferencia numpy fallback |
| Avatar 3D | Three.js + interpolación Catmull-Rom |
| Recolección de datos | OpenCV + MediaPipe + auto-ajuste de iluminación |
| Control de versiones | Git + GitHub |

---

## Estructura del proyecto

```
manos-que-hablan-v1/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/
│   │   │   ├── websocket.py     ← Pipeline de detección en tiempo real
│   │   │   └── signs.py         ← Endpoint REST de señas
│   │   └── services/
│   │       ├── mediapipe_service.py      ← Extracción de 168 keypoints/frame
│   │       └── sign_classifier_service.py ← Inferencia LSTM (.h5 o numpy)
│   ├── requirements.txt
│   └── venv/                    ← Entorno virtual Python (no incluido en git)
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── camera/          ← CameraCapture (captura + WebSocket)
│       │   ├── avatar/          ← AvatarContainer (skeleton 3D Three.js)
│       │   └── ui/              ← Navbar, SignDisplay, ConfidenceBar, etc.
│       ├── hooks/
│       │   ├── useWebSocket.ts  ← Envío de frames + recepción de predicciones
│       │   └── useCamera.ts     ← Acceso a la cámara del dispositivo
│       ├── pages/
│       │   ├── TranslatorPage.tsx ← Traductor (seña → texto)
│       │   ├── AvatarPage.tsx     ← Avatar (texto → seña)
│       │   └── AboutPage.tsx      ← Información del equipo
│       └── store/
│           └── translatorStore.ts ← Estado global (Zustand)
├── ai/
│   ├── datasets/
│   │   ├── sequences/           ← Secuencias grabadas (168 kp, 5 frames)
│   │   ├── sequences_augmented/ ← Secuencias aumentadas x6
│   │   ├── X_train.npy / X_test.npy
│   │   └── label_encoder.json
│   ├── models/saved/
│   │   ├── lsc_classifier.h5    ← Modelo LSTM entrenado
│   │   ├── model_meta.json      ← Metadatos del modelo
│   │   └── training_history.png ← Curvas de entrenamiento
│   ├── scripts/
│   │   ├── recolectar_datos.py  ← Menú de recolección + augmentación + entrenamiento
│   │   ├── augmentar_datos.py   ← Augmentación de secuencias (x6 variaciones)
│   │   ├── preprocesar_datos.py ← Normalización + split train/test
│   │   └── entrenar_modelo.py   ← Entrenamiento del LSTM
│   └── utils/
│       └── keypoint_utils.py    ← Normalización de keypoints (168 kp Holistic)
├── scripts/
│   ├── start_backend.bat / .sh  ← Arranca el backend (Windows / Linux-Mac)
│   ├── start_frontend.bat / .sh ← Arranca el frontend (Windows / Linux-Mac)
│   └── splash.py                ← Pantalla de inicio animada
├── recolectar_senas.bat / .sh   ← Atajo para recolección (Windows / Linux-Mac)
└── docs/
    └── INSTALACION.md
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Python | 3.11 |
| Node.js | 18 |
| npm | 9 |
| Webcam | Cualquier cámara USB o integrada |

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/imjucanet/manos-que-hablan-v1.git
cd manos-que-hablan-v1
```

### 2. Configurar el entorno virtual Python

```bash
cd backend

# Linux / Mac
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
cd ..
```

> **Nota para Linux:** Si `mediapipe` falla al instalar, asegúrate de tener `libGL` disponible:
> ```bash
> sudo apt-get install libgl1-mesa-glx libglib2.0-0
> ```

### 3. Instalar dependencias del frontend

```bash
cd frontend
npm install
cd ..
```

---

## Levantar el proyecto

### Windows

```bat
# En dos terminales separadas:
scripts\start_backend.bat
scripts\start_frontend.bat
```

### Linux / Mac

```bash
# Dar permisos la primera vez
chmod +x scripts/start_backend.sh scripts/start_frontend.sh recolectar_senas.sh

# En dos terminales separadas:
bash scripts/start_backend.sh
bash scripts/start_frontend.sh
```

### Manual (cualquier sistema)

```bash
# Terminal 1 — Backend
cd backend
source venv/bin/activate   # Linux/Mac
# venv\Scripts\activate    # Windows
uvicorn app.main:app --reload

# Terminal 2 — Frontend
cd frontend
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Documentación API | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws |

---

## Pipeline de datos LSC

El sistema usa un pipeline completo para entrenar el clasificador con nuevas señas:

```
Grabar señas  →  Augmentar  →  Preprocesar  →  Entrenar modelo
   (30 muestras)   (x6 variaciones)  (normalizar + split)  (LSTM ~5 min)
```

### Ejecutar el script de recolección

```bash
# Windows
recolectar_senas.bat

# Linux / Mac
bash recolectar_senas.sh
```

El menú interactivo ofrece:

```
[1] Iniciar recolección        ← graba señas en secuencia automática
[2] Ver progreso               ← estado de todas las señas del vocabulario
[3] Seña específica            ← graba o completa una seña puntual
[4] Augmentar datos            ← genera x6 variaciones (ruido, escala, espejo, etc.)
[5] Preprocesar datos          ← normaliza y genera X_train.npy / X_test.npy
[6] Entrenar modelo            ← entrena el LSTM y guarda lsc_classifier.h5
[7] Salir
```

**Flujo recomendado al agregar señas nuevas:**

1. `[1]` o `[3]` — Graba 30 secuencias por seña
2. `[4]` — Augmenta (genera ~180 muestras por seña)
3. `[5]` — Preprocesa
4. `[6]` — Entrena (~5-10 minutos dependiendo del equipo)

### Vocabulario actual (24 clases entrenadas)

| Tipo | Señas |
|---|---|
| Saludos / básicas | hola, adios, gracias, por favor, si, no, ayuda |
| Comunicación | agua, casa |
| Alfabeto (letras grabadas) | m, n, ñ, o, p, q, r, s, t, u, v, w, x, y, z |

> El vocabulario completo planificado incluye 47 señas. Las letras a–l y señas como familia, trabajo, escuela, etc., están pendientes de grabar.

---

## Arquitectura del sistema de detección

### Pipeline en tiempo real (backend)

```
Frame JPEG (25 fps)
    ↓
MediaPipe Holistic
    → 168 keypoints/frame
      (manos x2: 126kp + cara: 36kp + hombros: 6kp)
    ↓
EMA smoothing (α=0.65)
    → suaviza jitter entre frames
    ↓
Buffer deslizante (5 frames)
    ↓
LSTM Classifier
    → confianza + entropía + margen
    ↓
Ventana de votación (3 frames, mayoría 2/3)
    → umbral confianza ≥ 70%
    → entropía ≤ 0.42
    → margen top1−top2 ≥ 0.12
    ↓
Cooldown adaptativo
    → conf ≥ 92%: 250 ms
    → conf ≥ 80%: 400 ms
    → conf borderline: 550 ms
    ↓
Respuesta WebSocket → Frontend
```

### Formato de keypoints

| Segmento | Índices | Descripción |
|---|---|---|
| Mano 1 | 0–62 | 21 landmarks × 3 (x,y,z) |
| Mano 2 | 63–125 | 21 landmarks × 3 (x,y,z) |
| Cara | 126–161 | 12 puntos de expresión × 3 |
| Hombros | 162–167 | 2 hombros × 3 |

> Las secuencias grabadas antes de abril 2026 tienen 126 kp (solo manos). El pipeline las rellena automáticamente con ceros para compatibilidad con el formato actual de 168 kp.

---

## Interfaz de usuario

### Páginas disponibles

| Ruta | Descripción |
|---|---|
| `/` | Traductor en tiempo real — seña → texto |
| `/avatar` | Avatar LSC — texto → animación 3D esquelética |
| `/about` | Información del proyecto y equipo |

### Traductor (`/`)

- Cámara en vivo con overlay de estado (fps, manos detectadas, progreso de buffer)
- Panel lateral: seña detectada, barra de confianza en tiempo real, control de umbral (50–95%)
- Auto-limpieza de señas 1.5 s después de la última predicción válida
- Indicador de conexión WebSocket con reconexión automática

### Avatar LSC (`/avatar`)

- Escribe texto y el avatar ejecuta cada seña del vocabulario conocido
- Interpolación Catmull-Rom (18 frames entre keyframes) para animación fluida
- Esqueleto 3D con conexiones anatómicas de manos completas

---

## Archivos de inicio rápido

| Sistema | Backend | Frontend | Recolección |
|---|---|---|---|
| Windows | `scripts\start_backend.bat` | `scripts\start_frontend.bat` | `recolectar_senas.bat` |
| Linux/Mac | `bash scripts/start_backend.sh` | `bash scripts/start_frontend.sh` | `bash recolectar_senas.sh` |

---

## Equipo de desarrollo

| Integrante | Rol | GitHub |
|---|---|---|
| Juan Camilo Neuta Sunce | Líder / Backend / IA / Pipeline de datos | [@imjucanet](https://github.com/imjucanet) |
| Cristian Felipe Tafur Díaz | Frontend / Captura de datos / Diseño UI | [@Cristian0331](https://github.com/Cristian0331) |
| Santiago Tovar | Backend / WebSocket / Clasificador / Frontend | [@Santiago13-08-06](https://github.com/Santiago13-08-06) |

---

## Licencia

Este proyecto fue desarrollado con fines estrictamente académicos en el marco de la asignatura **Ingeniería de Software 2** de la **Fundación Escuela Tecnológica de Neiva "Jesús Oviedo Pérez"**, semestre 2026-1.

Queda prohibida su reproducción, distribución o uso comercial sin autorización expresa de los autores.

© 2026 Juan Camilo Neuta Sunce, Cristian Felipe Tafur Díaz, Santiago Tovar — Todos los derechos reservados
