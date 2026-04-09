# ============================================================
#  Modelo Translation — Historial de traducciones
#  Guarda cada traducción realizada por el sistema.
#  Útil para mejorar el modelo con datos reales de uso.
# ============================================================

from sqlalchemy import Column, String, Text, Float, DateTime
from sqlalchemy.types import Uuid as UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class Translation(Base):
    __tablename__ = "translations"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    # Identificador de sesión — agrupa las traducciones de una misma sesión
    # Ejemplo: el usuario abre la app, hace 5 traducciones, cierra.
    # Todas esas 5 traducciones comparten el mismo session_id.
    session_id = Column(String(100), nullable=True, index=True)

    # Dirección de la traducción
    # 'sign_to_text' → usuario hace una seña, sistema devuelve texto
    # 'text_to_sign' → usuario escribe texto, sistema anima el avatar
    direction = Column(
        String(20),
        nullable=False
    )

    # Lo que entró al sistema
    # sign_to_text: descripción del frame o keypoints capturados
    # text_to_sign: el texto escrito por el usuario
    input_data = Column(Text, nullable=True)

    # Lo que devolvió el sistema
    # sign_to_text: la palabra detectada (ej: "hola")
    # text_to_sign: la secuencia de animaciones ejecutadas
    output_data = Column(Text, nullable=True)

    # Qué tan seguro estaba el modelo de su respuesta (0.0 a 1.0)
    # Ejemplo: 0.95 significa 95% de confianza en la traducción
    confidence = Column(Float, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<Translation(direction='{self.direction}', confidence={self.confidence})>"