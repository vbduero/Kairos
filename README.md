# 🤲 Manos que Hablan

Traductor bidireccional de **Lenguaje de Señas Colombiano (LSC)** con inteligencia artificial y avatar 3D.

Proyecto académico — Ingeniería de Software 2 · Semestre 2026-1

---

## ¿Qué hace?

| Dirección | Entrada | Salida |
|---|---|---|
| **Señas → Texto** | Cámara en tiempo real | Texto en español |
| **Texto → Avatar** | Texto escrito | Avatar 3D ejecutando la seña |

---

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| Fase 0 | Estructura base del proyecto | ✅ Completada |
| Fase 1 | Backend + IA + Frontend base | ✅ Completada |
| Fase 2A | Clasificador de señas LSC | 🔨 En progreso |
| Fase 2B | Avatar 3D con Three.js | ⏳ Pendiente |
| Fase 3 | Integración frontend completa | ⏳ Pendiente |
| Fase 4 | Base de datos + vocabulario LSC | ⏳ Pendiente |

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | FastAPI + WebSockets |
| IA / Visión | MediaPipe + TensorFlow |
| NLP | Python + SpaCy |
| Base de datos | PostgreSQL 15 |
| Infraestructura | Docker + Docker Compose |
| Control de versiones | GitHub |

---

## Estructura del proyecto
```
manos-que-hablan-v1/
├── backend/              ← API FastAPI + lógica de IA
│   ├── app/
│   │   ├── api/          ← Endpoints REST y WebSocket
│   │   ├── core/         ← Configuración, seguridad
│   │   ├── models/       ← Modelos de base de datos (SQLAlchemy)
│   │   ├── schemas/      ← Validación de datos (Pydantic)
│   │   └── services/     ← Lógica: MediaPipe, TF, SpaCy
│   └── tests/
├── frontend/             ← Interfaz React + Three.js
│   └── src/
│       ├── components/
│       │   ├── camera/   ← Captura de señas con cámara
│       │   ├── avatar/   ← Renderizado 3D con Three.js
│       │   └── ui/       ← Componentes reutilizables
│       ├── hooks/        ← Custom hooks (useWebSocket, useCamera)
│       ├── pages/        ← Vistas principales
│       └── services/     ← Comunicación con el backend
├── ai/
│   ├── notebooks/        ← Experimentos Jupyter
│   ├── scripts/          ← Scripts de recolección y entrenamiento
│   └── models/saved/     ← Modelos entrenados (.h5, .tflite)
├── docs/                 ← Documentación del proyecto
│   └── INSTALACION.md    ← Guía de instalación paso a paso
├── scripts/
│   └── init_db.sql       ← Inicialización de PostgreSQL
├── .env.example          ← Plantilla de variables de entorno
└── docker-compose.yml    ← Orquestación de servicios
```

---

## Primeros pasos

### 1. Clonar y configurar entorno
```bash
git clone https://github.com/imjucanet/manos-que-hablan-v1.git
cd manos-que-hablan-v1

# Copiar variables de entorno
cp .env.example .env
cp .env backend/.env
# Editar .env con tus valores reales
```

### 2. Levantar el backend
```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows Git Bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

> ⚠️ Requiere Python 3.11. Ver `docs/INSTALACION.md` para el parche de MediaPipe en Windows.

### 3. Levantar el frontend
```bash
cd frontend
npm install
npm run dev
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Documentación API | http://localhost:8000/docs |
| WebSocket | ws://localhost:8000/ws |

---

## Recursos del proyecto

| Recurso | Enlace |
|---|---|
| Repositorio | https://github.com/imjucanet/manos-que-hablan-v1 |
| Google Drive | (acceso por invitación) |
| Tablero de tareas | Notion (acceso por invitación) |

---

## Equipo de desarrollo

| Integrante | Rol | GitHub |
|---|---|---|
| Juan Camilo Neuta Sunce | Líder del Proyecto / Backend | [@imjucanet](https://github.com/imjucanet) |
| Cristian Felipe Tafur Díaz | Desarrollador Frontend / IA | [@Cristian0331](https://github.com/Cristian0331) |
| Santiago Tovar | Desarrollador Backend / Base de Datos | [@Santiago13-08-06](https://github.com/Santiago13-08-06) |

---

## Licencia

Este proyecto fue desarrollado con fines estrictamente académicos en el marco de la asignatura **Ingeniería de Software 2** de la **Fundación de Educación Superior FET**, semestre 2026-1.

Queda prohibida su reproducción, distribución o uso comercial sin autorización expresa de los autores. El código fuente puede ser consultado como referencia académica citando a los autores correspondientes.

© 2026 Juan Camilo Neuta Sunce, Cristian Felipe Tafur Díaz, Santiago Tovar — Todos los derechos reservados