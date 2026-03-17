# ============================================================
#  Exporta todos los modelos desde un solo lugar
#  Así en cualquier archivo del proyecto puedes hacer:
#  from app.models import Sign, Translation
# ============================================================

from app.models.sign import Sign
from app.models.translation import Translation

__all__ = ["Sign", "Translation"]