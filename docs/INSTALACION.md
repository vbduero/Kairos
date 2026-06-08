# Guía de instalación — Kairos

## Requisitos

- Python 3.11
- Node.js 18+ y npm 9+
- Git

## Instalación del Backend

### 1. Crear entorno virtual

```bash
cd backend

# Linux / Mac
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

> **Nota para Linux:** Si `mediapipe` falla al instalar, asegúrate de tener `libGL` disponible:
> ```bash
> sudo apt-get install libgl1-mesa-glx libglib2.0-0
> ```

### 3. Parche requerido para MediaPipe en Windows

MediaPipe intenta importar TensorFlow opcionalmente, lo que puede causar conflictos en Windows.
Editar este archivo:
```
venv/Lib/site-packages/mediapipe/tasks/python/core/optional_dependencies.py
```
Reemplazar todo el contenido por:
```python
try:
    from tensorflow.tools.docs import doc_controls
except ImportError:
    class doc_controls:
        @staticmethod
        def do_not_doc_in_subclasses(func):
            return func
        @staticmethod
        def do_not_generate_docs(func):
            return func
```

### 4. Configurar variables de entorno

```bash
# En la raíz del proyecto
cp .env.example .env
cp .env backend/.env
# Editar .env con tus valores
```

## Instalación del Frontend

```bash
cd frontend
npm install
```

## Ejecución del Sistema

Para levantar ambos servicios, usa dos terminales:

**Terminal 1 (Backend):**
```bash
cd backend
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows
uvicorn app.main:app --reload
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| WebSocket | ws://localhost:8000/ws |
