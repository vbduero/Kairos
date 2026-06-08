# Dataset de Señas LSC (Fase 2A)

Este directorio contiene el dataset de entrenamiento para el clasificador de señas de **Kairos**.

## Estructura del Dataset

### `lsc_dataset.csv`
Archivo CSV que almacena los keypoints de las manos detectados por MediaPipe.

- **Filas**: Cada fila representa una muestra (un frame de video).
- **Columnas**:
    - `label`: El nombre de la seña (ej. "hola", "adios").
    - `kp_0` a `kp_62`: 63 coordenadas (x, y, z) de los 21 puntos de la mano.

## Vocabulario (20 señas)

| | | | | |
|---|---|---|---|---|
| hola | adios | gracias | por favor | si |
| no | ayuda | agua | casa | familia |
| trabajo | escuela | comer | dormir | bano |
| doctor | policia | emergencia | nombre | como estas |

## Instrucciones de Recolección

Para agregar más datos al dataset, ejecuta el script de recolección:

```bash
python ai/scripts/recolectar_datos.py
```

### Recomendaciones:
1. **Variabilidad**: Graba muestras con diferentes manos, ángulos, distancias y velocidades.
2. **Iluminación**: Asegúrate de tener buena luz para que MediaPipe detecte los puntos correctamente.
3. **Fondo**: Usa fondos limpios si es posible para evitar detecciones falsas.
4. **Cantidad**: El objetivo es tener al menos **50 muestras de alta calidad** por cada seña.
