# ============================================================
#  Script de prueba — Verifica que los modelos están bien
#  Ejecutar desde la carpeta backend/ con el venv activo:
#  python ../ai/scripts/test_models.py
# ============================================================

import sys
import os

# Agrega el backend al path para poder importar los módulos
sys.path.append(os.path.join(os.path.dirname(__file__), '../../backend'))

def test_importaciones():
    print("🔍 Probando importaciones...")
    try:
        from app.models.sign import Sign
        from app.models.translation import Translation
        from app.core.database import Base, engine
        from app.core.config import settings
        print("✅ Todos los módulos importaron correctamente")
        return True
    except ImportError as e:
        print(f"❌ Error de importación: {e}")
        return False

def test_modelo_sign():
    print("\n🔍 Probando modelo Sign...")
    try:
        from app.models.sign import Sign
        # Crear una instancia de prueba
        seña = Sign(
            word="hola",
            category="saludo",
            description="Seña de saludo básico"
        )
        print(f"✅ Sign creado: {seña}")
        print(f"   - word: {seña.word}")
        print(f"   - category: {seña.category}")
        print(f"   - description: {seña.description}")
        return True
    except Exception as e:
        print(f"❌ Error en Sign: {e}")
        return False

def test_modelo_translation():
    print("\n🔍 Probando modelo Translation...")
    try:
        from app.models.translation import Translation
        # Crear una instancia de prueba
        traduccion = Translation(
            session_id="test-session-001",
            direction="sign_to_text",
            input_data="keypoints: [0.23, 0.45, 0.12...]",
            output_data="hola",
            confidence=0.95
        )
        print(f"✅ Translation creada: {traduccion}")
        print(f"   - direction: {traduccion.direction}")
        print(f"   - output: {traduccion.output_data}")
        print(f"   - confidence: {traduccion.confidence}")
        return True
    except Exception as e:
        print(f"❌ Error en Translation: {e}")
        return False

def test_configuracion():
    print("\n🔍 Probando configuración...")
    try:
        from app.core.config import settings
        print(f"✅ Configuración cargada:")
        print(f"   - APP_NAME: {settings.APP_NAME}")
        print(f"   - DEBUG: {settings.DEBUG}")
        print(f"   - DATABASE_URL: {settings.DATABASE_URL[:30]}...")
        return True
    except Exception as e:
        print(f"❌ Error en configuración: {e}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("  Kairos — Test de Modelos")
    print("=" * 50)

    resultados = [
        test_importaciones(),
        test_modelo_sign(),
        test_modelo_translation(),
        test_configuracion(),
    ]

    print("\n" + "=" * 50)
    exitosos = sum(resultados)
    total = len(resultados)
    print(f"  Resultado: {exitosos}/{total} pruebas exitosas")
    if exitosos == total:
        print("  🎉 ¡Todo está perfecto!")
    else:
        print("  ⚠️  Hay errores que corregir")
    print("=" * 50)