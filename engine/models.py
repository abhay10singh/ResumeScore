from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.sql import func
from database import Base

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_hash = Column(String(64), index=True)  # To avoid duplicate analyses
    job_description = Column(Text)
    score = Column(Integer)
    breakdown = Column(JSON)
    strengths = Column(JSON)
    weaknesses = Column(JSON)
    suggested_keywords = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserSession(Base):
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), unique=True, index=True)
    analyses_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_active = Column(DateTime(timezone=True), onupdate=func.now())