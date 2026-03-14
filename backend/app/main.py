# ============================================================
#  Manos que Hablan — Punto de entrada del backend
#  FastAPI arranca desde aquí.
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings


app = FastAPI(
    title=settings.APP_NAME,
    description="API para traducción bidireccional de Lenguaje de Señas Colombiano",
    version="0.1.0",
    docs_url="/docs",       # Documentación automática en /docs
    redoc_url="/redoc",     # Documentación alternativa en /redoc
)

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
        "mensaje": "Manos que Hablan API funcionando ✅",
        "version": "0.1.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Endpoint para verificar que el servidor está vivo."""
    return {"status": "ok"}


# ── Aquí irán los routers en la Fase 1 ───────────────────
# from app.api.endpoints import signs, websocket
# app.include_router(signs.router, prefix="/api/v1")
# app.include_router(websocket.router)