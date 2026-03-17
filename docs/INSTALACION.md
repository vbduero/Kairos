\# Guía de instalación — Manos que Hablan



\## Requisitos

\- Python 3.11 (no usar 3.12 ni 3.13)

\- Git



\## Instalación del backend



\### 1. Crear entorno virtual

```bash

cd backend

python -m venv venv

source venv/Scripts/activate  # Windows Git Bash

```



\### 2. Instalar dependencias

```bash

pip install -r requirements.txt

```



\### 3. Parche requerido para MediaPipe en Windows

MediaPipe intenta importar TensorFlow opcionalmente.

Editar este archivo:

```

venv/Lib/site-packages/mediapipe/tasks/python/core/optional\_dependencies.py

```

Reemplazar todo el contenido por:

```python

try:

&#x20;   from tensorflow.tools.docs import doc\_controls

except ImportError:

&#x20;   class doc\_controls:

&#x20;       @staticmethod

&#x20;       def do\_not\_doc\_in\_subclasses(func):

&#x20;           return func

&#x20;       @staticmethod

&#x20;       def do\_not\_generate\_docs(func):

&#x20;           return func

```



\### 4. Configurar variables de entorno

```bash

cp .env.example .env

cp .env backend/.env

\# Editar .env con tus valores

```



\## Nota sobre TensorFlow

TensorFlow y MediaPipe tienen conflictos de protobuf en Windows.

\- MediaPipe necesita protobuf < 5

\- TensorFlow necesita protobuf >= 6.31.1



Por ahora usamos MediaPipe para keypoints sin TensorFlow.

El clasificador de señas (Fase 2) usará TensorFlow Lite

que tiene menos conflictos de dependencias.

