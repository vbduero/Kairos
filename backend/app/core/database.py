# ============================================================
#  Conexión a PostgreSQL con SQLAlchemy
#  Este archivo configura el motor de base de datos y la sesión
#  que usarán todos los modelos del proyecto.
# ============================================================

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Motor de base de datos — es la conexión principal a PostgreSQL
# create_async_engine permite operaciones asíncronas (no bloquea el servidor)
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,  # en DEBUG=True muestra las consultas SQL en consola
)

# Sesión — es como una "conversación" con la base de datos
# Cada petición al API abre una sesión y la cierra al terminar
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Base — todas las clases de modelos heredan de aquí
# SQLAlchemy usa esto para saber qué tablas crear
Base = declarative_base()


# Dependencia de FastAPI — inyecta la sesión en cada endpoint
# Se usará así en los endpoints: db: AsyncSession = Depends(get_db)
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()