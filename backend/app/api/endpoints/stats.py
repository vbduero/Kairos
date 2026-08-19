from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from pydantic import BaseModel
import os
import google.generativeai as genai
from datetime import datetime, timedelta

from app.core.database import get_db
from app.models.stats import RecognizedSign, AppUsage, ConstructedPhrase, FailedAttempt, TeacherResponse

router = APIRouter()

class SignLogRequest(BaseModel):
    sign: str

class TimeLogRequest(BaseModel):
    duration_seconds: int

class PhraseLogRequest(BaseModel):
    phrase_text: str
    word_count: int
    time_taken_seconds: int

class TeacherResponseLogRequest(BaseModel):
    response_text: str

class FailedAttemptLogRequest(BaseModel):
    intended_sign: str
    confidence: int

@router.post("/stats/sign")
async def log_sign(data: SignLogRequest, db: AsyncSession = Depends(get_db)):
    new_sign = RecognizedSign(word=data.sign)
    db.add(new_sign)
    await db.commit()
    return {"status": "ok"}

@router.post("/stats/time")
async def log_time(data: TimeLogRequest, db: AsyncSession = Depends(get_db)):
    new_usage = AppUsage(duration_seconds=data.duration_seconds)
    db.add(new_usage)
    await db.commit()
    return {"status": "ok"}

@router.post("/stats/phrase")
async def log_phrase(data: PhraseLogRequest, db: AsyncSession = Depends(get_db)):
    new_phrase = ConstructedPhrase(phrase_text=data.phrase_text, word_count=data.word_count, time_taken_seconds=data.time_taken_seconds)
    db.add(new_phrase)
    await db.commit()
    return {"status": "ok"}

@router.post("/stats/teacher_response")
async def log_teacher_response(data: TeacherResponseLogRequest, db: AsyncSession = Depends(get_db)):
    new_resp = TeacherResponse(response_text=data.response_text)
    db.add(new_resp)
    await db.commit()
    return {"status": "ok"}

@router.get("/stats/ai-suggestions")
async def get_ai_suggestions(db: AsyncSession = Depends(get_db)):
    # Calculate some quick stats to feed the AI
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    stmt_part = select(func.count(ConstructedPhrase.id)).where(ConstructedPhrase.created_at >= today)
    res_part = await db.execute(stmt_part)
    participation = res_part.scalar() or 0
    
    stmt_fric = select(func.avg(ConstructedPhrase.time_taken_seconds)).where(ConstructedPhrase.created_at >= today)
    res_fric = await db.execute(stmt_fric)
    friction = round(res_fric.scalar() or 0.0, 1)
    
    stmt_failed = select(FailedAttempt.intended_sign, func.count(FailedAttempt.id)).group_by(FailedAttempt.intended_sign).order_by(func.count(FailedAttempt.id).desc()).limit(3)
    res_failed = await db.execute(stmt_failed)
    struggled_str = ", ".join([f"{row[0]} ({row[1]} fallos)" for row in res_failed.all()])
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        tips = []
        if participation == 0:
            tips.append("El estudiante no ha participado hoy. Intenta involucrarlo en la próxima actividad con preguntas sencillas.")
        elif friction > 10:
            tips.append("El estudiante tarda bastante en armar frases. Considera usar preguntas cerradas (Sí/No) para facilitar la fluidez y reducir la frustración.")
        if struggled_str:
            tips.append(f"El sistema falla al reconocer estas señas: {struggled_str}. Evita depender de ellas y apóyate en el tablero.")
        
        if not tips:
            tips.append("El ritmo de la clase es excelente. Sigue fomentando la participación espontánea.")
            
        return {"suggestion": " ".join(tips)}

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Eres un asistente pedagógico experto en educación especial inclusiva.
        Estás ayudando a un profesor oyente que tiene un estudiante sordo en su clase.
        El estudiante usa una aplicación que traduce sus señas a texto.
        
        Datos de la sesión de hoy:
        - Frases armadas por el estudiante (Participación): {participation}
        - Tiempo promedio armando una frase (Fricción): {friction} segundos.
        - Señas que la Inteligencia Artificial falló en reconocer: {struggled_str}
        
        Dale al profesor un consejo pedagógico directo (máximo 2 párrafos cortos) sobre cómo mejorar la dinámica mañana basado en esto.
        """
        response = model.generate_content(prompt)
        return {"suggestion": response.text}
    except Exception as e:
        return {"suggestion": f"El estudiante ha armado {participation} frases con una fricción promedio de {friction}s. Revisa las palabras con dificultad: {struggled_str}."}

@router.post("/stats/failed")
async def log_failed(data: FailedAttemptLogRequest, db: AsyncSession = Depends(get_db)):
    new_failed = FailedAttempt(intended_sign=data.intended_sign, confidence=data.confidence)
    db.add(new_failed)
    await db.commit()
    return {"status": "ok"}

@router.get("/stats/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    # 1. Total de señas y Tiempo total
    result_total = await db.execute(select(func.count(RecognizedSign.id)))
    total_recognized = result_total.scalar() or 0

    result_time = await db.execute(select(func.sum(AppUsage.duration_seconds)))
    total_time_seconds = result_time.scalar() or 0

    # 2. Fluidez (Señas por minuto)
    total_time_minutes = total_time_seconds / 60.0
    fluency_rate = round(total_recognized / total_time_minutes, 2) if total_time_minutes > 0 else 0.0

    # 3. Frecuencias (palabras únicas, dominio, a reforzar)
    stmt_freq = select(RecognizedSign.word, func.count(RecognizedSign.id).label('count')) \
        .group_by(RecognizedSign.word) \
        .order_by(func.count(RecognizedSign.id).desc())
    
    result_freq = await db.execute(stmt_freq)
    word_counts = result_freq.all()
    
    unique_words = len(word_counts)
    
    mastered = 0
    in_progress = 0
    for row in word_counts:
        if row[1] > 5:
            mastered += 1
        else:
            in_progress += 1
            
    mastery_stats = [
        {"name": "Dominadas (>5 usos)", "value": mastered, "color": "#00C9A7"},
        {"name": "En Progreso (1-5 usos)", "value": in_progress, "color": "#1B4965"}
    ]

    # Palabras a reforzar (Bottom 5, las menos usadas)
    words_to_reinforce = []
    # Reverse the list to get the least used words first
    bottom_words = list(reversed(word_counts))[:5]
    for row in bottom_words:
        words_to_reinforce.append({
            "word": row[0],
            "count": row[1]
        })

    # 4. Actividad diaria (últimos 7 días) y Constancia
    stmt_daily = select(
        func.strftime('%Y-%m-%d', RecognizedSign.created_at).label('day'),
        func.count(RecognizedSign.id).label('count')
    ).group_by('day').order_by('day')
    
    result_daily = await db.execute(stmt_daily)
    daily_rows = result_daily.all()
    daily_dict = {row[0]: row[1] for row in daily_rows}
    
    week_data = []
    days_active = 0
    today = datetime.utcnow()
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        day_str = d.strftime('%Y-%m-%d')
        val = daily_dict.get(day_str, 0)
        week_data.append({
            "name": d.strftime('%a')[:2],
            "val": val
        })
        if val > 0:
            days_active += 1
            
    consistency_days = f"{days_active}/7"

    # 5. Tendencia mensual (Fluidez o Volumen) - mantendremos el volumen por ahora
    stmt_monthly = select(
        func.strftime('%Y-%m', RecognizedSign.created_at).label('month'),
        func.count(RecognizedSign.id).label('count')
    ).group_by('month').order_by('month')
    
    result_monthly = await db.execute(stmt_monthly)
    monthly_rows = result_monthly.all()
    monthly_dict = {row[0]: row[1] for row in monthly_rows}
    
    trend_data = []
    for i in range(5, -1, -1):
        m = today - timedelta(days=30*i)
        m_str = m.strftime('%Y-%m')
        val = monthly_dict.get(m_str, 0)
        trend_data.append({
            "name": m.strftime('%b'),
            "val": val
        })

    # 6. Participación y Fricción
    # Participación hoy: frases armadas en las últimas 24h
    stmt_participation = select(func.count(ConstructedPhrase.id)).where(ConstructedPhrase.created_at >= today - timedelta(days=1))
    result_part = await db.execute(stmt_participation)
    participation_count = result_part.scalar() or 0

    # Promedio de fricción
    stmt_friction = select(func.avg(ConstructedPhrase.time_taken_seconds))
    result_fric = await db.execute(stmt_friction)
    avg_friction = round(result_fric.scalar() or 0.0, 1)

    # 7. Intentos fallidos (Señas con dificultad -> Fricción del sistema)
    stmt_failed = select(FailedAttempt.intended_sign, func.count(FailedAttempt.id).label('count')) \
        .group_by(FailedAttempt.intended_sign) \
        .order_by(func.count(FailedAttempt.id).desc()) \
        .limit(5)
    result_failed = await db.execute(stmt_failed)
    struggled_signs = [{"sign": row[0], "fails": row[1]} for row in result_failed.all()]

    # 8. Bitácora de Conversación (últimos 15 mensajes entre ambos)
    stmt_phrases = select(ConstructedPhrase).order_by(ConstructedPhrase.created_at.desc()).limit(15)
    result_phrases = await db.execute(stmt_phrases)
    phrases = result_phrases.scalars().all()
    
    stmt_teacher = select(TeacherResponse).order_by(TeacherResponse.created_at.desc()).limit(15)
    result_teacher = await db.execute(stmt_teacher)
    teachers = result_teacher.scalars().all()
    
    chat_history = []
    for p in phrases:
        chat_history.append({"type": "student", "text": p.phrase_text, "time": p.created_at})
    for t in teachers:
        chat_history.append({"type": "teacher", "text": t.response_text, "time": t.created_at})
        
    chat_history.sort(key=lambda x: x["time"])
    # Return string times and limit to last 10
    chat_history = chat_history[-10:]
    chat_history_formatted = [{"type": c["type"], "text": c["text"], "time": c["time"].isoformat()} for c in chat_history]

    # 9. Cronograma por horas (hoy)
    today_start = today
    stmt_hourly = select(ConstructedPhrase).where(ConstructedPhrase.created_at >= today_start)
    result_hourly = await db.execute(stmt_hourly)
    phrases_today = result_hourly.scalars().all()
    
    hourly_dict = {f"{i:02d}:00": 0 for i in range(24)}
    for p in phrases_today:
        hour_str = p.created_at.strftime("%H:00")
        if hour_str in hourly_dict:
            hourly_dict[hour_str] += 1
            
    # Keep school hours
    hourly_data = [{"time": k, "count": v} for k, v in hourly_dict.items() if 7 <= int(k.split(":")[0]) <= 18]

    return {
        "totalRecognized": total_recognized,
        "totalTimeSeconds": total_time_seconds,
        "fluencyRate": fluency_rate,
        "uniqueWords": unique_words,
        "masteryStats": mastery_stats,
        "wordsToReinforce": words_to_reinforce,
        "consistencyDays": consistency_days,
        "weekData": week_data,
        "trendData": trend_data,
        "hourlyData": hourly_data,
        "chatHistory": chat_history_formatted,
        "participationCount": participation_count,
        "averageFriction": avg_friction,
        "struggledSigns": struggled_signs
    }
