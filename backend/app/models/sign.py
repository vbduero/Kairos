# ============================================================
#  Modelo Sign — Vocabulario LSC
#  Representa cada seña conocida por el sistema.
#  Cada fila en esta tabla es una palabra/seña del LSC.
# ============================================================

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class Sign(Base):
    __tablename__ = "signs"

    # UUID como clave primaria — más seguro que un número autoincremental
    # porque no revela cuántos registros hay en la tabla
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )

    # La palabra en español que representa esta seña
    # unique=True evita duplicados, nullable=False la hace obligatoria
    word = Column(String(100), nullable=False, unique=True, index=True)

    # Categoría: saludo, número, abecedario, cortesía, emergencia...
    category = Column(String(50), nullable=True)

    # Descripción de cómo hacer la seña
    description = Column(Text, nullable=True)

    # URL del video de referencia mostrando la seña
    video_url = Column(String(255), nullable=True)

    # Fechas automáticas — PostgreSQL las llena solo
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    def __repr__(self):
        return f"<Sign(word='{self.word}', category='{self.category}')>"