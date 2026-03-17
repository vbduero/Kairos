# ============================================================
#  Configuración central del backend
#  Todas las variables de entorno se leen desde aquí.
#  Nunca uses os.environ directamente en otro archivo.
# ============================================================

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Manos que Hablan"
    DEBUG: bool = True
    SECRET_KEY: str = "dev-key-cambiar-en-produccion"

    # Base de datos — variables individuales
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "manos_que_hablan"
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/manos_que_hablan"

    # CORS: qué dominios pueden hablar con el backend
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    # IA
    MODEL_PATH: str = "models/lsc_model.h5"
    CONFIDENCE_THRESHOLD: float = 0.85

    class Config:
        env_file = ".env"
        extra = "ignore"  # ignora variables del .env que no estén definidas aquí


# Instancia global — se importa así en cualquier archivo:
# from app.core.config import settings
settings = Settings()