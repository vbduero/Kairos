from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.core.database import Base

class RecognizedSign(Base):
    __tablename__ = "recognized_signs"

    id = Column(Integer, primary_key=True, index=True)
    word = Column(String, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class AppUsage(Base):
    __tablename__ = "app_usages"

    id = Column(Integer, primary_key=True, index=True)
    duration_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class ConstructedPhrase(Base):
    __tablename__ = "constructed_phrases"

    id = Column(Integer, primary_key=True, index=True)
    phrase_text = Column(String)
    word_count = Column(Integer, default=1)
    time_taken_seconds = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class TeacherResponse(Base):
    __tablename__ = "teacher_responses"

    id = Column(Integer, primary_key=True, index=True)
    response_text = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

class FailedAttempt(Base):
    __tablename__ = "failed_attempts"

    id = Column(Integer, primary_key=True, index=True)
    intended_sign = Column(String, index=True)
    confidence = Column(Integer) # Store as percentage 0-100
    created_at = Column(DateTime, default=datetime.utcnow)
