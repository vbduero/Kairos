# Sesión de desarrollo — 09 de abril de 2026

Resumen técnico de los cambios realizados en esta sesión sobre la rama `dev`.
Esta guía está pensada para que el equipo pueda hacer retroalimentación y continuar el trabajo.

---

## 1. Correcciones en el Frontend

### AboutPage — ajuste visual
- Se redimensionaron los dos cards de la página `/about` para que tengan altura y espaciado consistentes.
- Se redujeron márgenes y se normalizó el tamaño de íconos y títulos para mejorar la legibilidad.

### Doble clic al iniciar captura — corregido
- Al presionar "Iniciar captura" por primera vez, el sistema requería dos clics porque `startSendingFrames` se llamaba antes de que la cámara terminara de inicializarse.
- **Fix:** se eliminó la llamada directa desde `handleToggle` y se delegó a un `useEffect` que espera a que `isCapturing`, `isConnected` y `stream` estén todos listos antes de enviar frames.
- Archivo: `frontend/src/components/camera/CameraCapture.tsx`

### Avatar 3D integrado al Traductor
- El avatar 3D ya no vive en una página separada (`/avatar`).
- Ahora aparece en la misma página del traductor: **cámara a la izquierda, avatar a la derecha** en un grid de dos columnas (colapsa a una columna en pantallas ≤ 1024 px).
- Se eliminó la ruta `/avatar` de `App.tsx` y el link del `Navbar`.
- Archivos modificados: `frontend/src/pages/TranslatorPage.tsx`, `frontend/src/components/avatar/AvatarContainer.tsx`, `frontend/src/index.css`

---

## 2. Mejoras en la detección de manos (Backend)

### Sensibilidad de MediaPipe
- Se bajaron los umbrales de confianza en `mediapipe_service.py` para detectar manos con mayor facilidad:

| Parámetro | Antes | Ahora |
|-----------|-------|-------|
| `min_detection_confidence` | 0.7 | 0.5 |
| `min_tracking_confidence` | 0.5 | 0.4 |
| `min_hand_presence_confidence` | 0.5 | 0.4 |

### Reset del buffer por ausencia de manos
- En `backend/app/api/endpoints/websocket.py` se agregó un contador: si pasan 5 frames consecutivos sin detectar manos (≈ 1 segundo), el buffer de secuencias se limpia.
- Esto evita que el modelo intente clasificar secuencias "fantasma" mezcladas de señas distintas.

### Normalización de keypoints mejorada
- En `ai/utils/keypoint_utils.py`, la función `normalize_hand()` ahora usa distancias XY (no XYZ) para escalar los puntos, con clip a `[-2.0, 2.0]`.
- Resultado: los keypoints son menos sensibles a la profundidad estimada por MediaPipe, que es ruidosa.

---

## 3. Corrección crítica del clasificador (TensorFlow)

### Problema
El backend arrancaba en **modo simulado** (predicciones aleatorias) porque `_pywrap_tf2.pyd` no cargaba correctamente con `tensorflow==2.21.0`.

### Solución
- Se cambió a `tensorflow-cpu==2.17.0`, que es compatible con `mediapipe==0.10.14` y carga correctamente en Windows.
- Se implementó un sistema de **3 niveles de fallback** en `sign_classifier_service.py`:
  1. **TFLite** via `tensorflow.lite.Interpreter` (preferido)
  2. **ai-edge-litert** (alternativa si TF no carga)
  3. **Motor numpy puro** (`_NumpyLSTMEngine`): carga los pesos directamente del `.h5` con h5py y ejecuta el LSTM a mano, sin depender de ninguna DLL de TensorFlow. Sin predicciones simuladas.
- Actualizar dependencias: `pip install -r backend/requirements.txt`

---

## 4. Pipeline de recolección de datos — scripts de automatización

Se crearon scripts para automatizar el pipeline completo de captura y entrenamiento.

### Windows: `recolectar_senas.bat`
Menú interactivo con tres opciones:
- `[1]` Recolectar señas (abre cámara)
- `[2]` Procesar y entrenar (augmentar → preprocesar → entrenar → verificar)
- `[3]` Sesión completa (recolectar y luego entrenar en secuencia)

Requiere Git Bash instalado en `C:\Program Files\Git\`.

### Linux (Pop!_OS / Ubuntu): `recolectar_senas.sh` y `start_servers.sh`
Equivalentes para el compañero con Pop!_OS. Requieren:
```bash
chmod +x recolectar_senas.sh start_servers.sh
./recolectar_senas.sh
```
`start_servers.sh` abre backend y frontend en terminales separadas usando `gnome-terminal`.

---

## 5. Estado actual del dataset y el modelo

| Seña | Secuencias |
|------|-----------|
| hola | 30/30 ✅ |
| adios | 30/30 ✅ |
| gracias | 30/30 ✅ |
| si | 30/30 ✅ |
| no | 30/30 ✅ |
| por favor | 30/30 ✅ |
| ayuda | 3/30 ⚠️ |
| Restantes 40 señas | 0/30 ❌ |

El modelo actualmente entrenado solo reconoce **7 clases**. Para llegar a las 47 del vocabulario objetivo, hay que completar la recolección y reentrenar.

---

## Tareas para el equipo

### Cristian Tafur

**T-01 — Recolección de letras (a–m)**
Capturar 30 secuencias de las letras `a, b, c, d, e, f, g, h, i, j, k, l, m` usando `recolectar_senas.bat` o `.sh`.
Verificar con:
```
ai/datasets/sequences/<letra>/  →  30 archivos .npy
```

---

### Santiago Tovar

**T-02 — Recolección de letras (n–z) y señas faltantes**
Capturar 30 secuencias de `n, ñ, o, p, q, r, s, t, u, v, w, x, y, z` y completar `ayuda` (faltan 27 secuencias).

**T-03 — Reentrenar el modelo LSTM**
Una vez que haya suficientes señas recolectadas (mínimo 10 completas), correr el pipeline completo:
```bash
# Windows
recolectar_senas.bat  →  opcion [2]

# Linux
./recolectar_senas.sh  →  opcion [2]
```
Verificar que `model_meta.json` refleje más de 7 clases y que el accuracy por clase sea razonable (no 1.0, eso es sobreajuste).

---

### Juan Neuta

**T-04 — Recolección de palabras del vocabulario**
Capturar 30 secuencias de las palabras que aún no tienen datos:
`agua, casa, familia, trabajo, escuela, comer, dormir, bano, doctor, policia, emergencia, nombre, como estas`

**T-05 — Verificar integración post-reentrenamiento**
Después de que T-04 esté completo:
- Reiniciar el backend
- Confirmar que el WebSocket envía predicciones reales (no simuladas) desde la consola del backend
- Probar al menos 5 señas distintas en el frontend y verificar que el texto detectado cambia correctamente
- Documentar en Notion los resultados de la prueba

---

## Cómo correr el proyecto

```bash
# Windows
start_servers.bat

# Linux (Pop!_OS)
./start_servers.sh
```

Frontend: http://localhost:5173  
Backend:  http://localhost:8000  
API docs: http://localhost:8000/docs
