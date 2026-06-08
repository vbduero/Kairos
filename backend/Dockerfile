# ── Imagen base: Python 3.11 versión ligera ──
FROM python:3.11-slim

# Carpeta de trabajo dentro del contenedor
WORKDIR /app

# Dependencias del sistema que necesitan MediaPipe y OpenCV
RUN apt-get update && apt-get install -y \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Primero copiamos solo requirements.txt
# (si no cambia el código, Docker reutiliza esta capa en caché)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Luego copiamos el resto del código
COPY . .

EXPOSE 8000