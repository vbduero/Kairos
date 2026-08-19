# ============================================================
#  Kairos — Punto de entrada del backend
#  FastAPI arranca desde aquí.
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


from app.core.database import engine, Base
from app.models import Sign, Translation, RecognizedSign, AppUsage, ConstructedPhrase, FailedAttempt, TeacherResponse

app = FastAPI(
    title=settings.APP_NAME,
    description="API para traducción bidireccional de Lenguaje de Señas Colombiano",
    version="0.1.0",
    docs_url="/docs",       # Documentación automática en /docs
    redoc_url="/redoc",     # Documentación alternativa en /redoc
)

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ── CORS ──────────────────────────────────────────────────
# Sin esto, el navegador bloquea las peticiones del frontend
# hacia el backend por razones de seguridad.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Rutas básicas ─────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "mensaje": "Kairos API funcionando ✅",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Endpoint para verificar que el servidor está vivo."""
    return {"status": "ok"}


# ── Routers ───────────────────────────────────────────────
from app.api.endpoints import signs, websocket, record, stats
app.include_router(signs.router, prefix="/api/v1")
app.include_router(websocket.router)
app.include_router(record.router)
app.include_router(stats.router, prefix="/api/v1")