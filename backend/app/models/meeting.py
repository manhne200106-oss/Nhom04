from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.core.database import Base
from datetime import datetime

class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    raw_content = Column(String, nullable=False)
    generated_minutes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class SystemLog(Base):
    __tablename__ = "system_logs"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)
    action = Column(String, nullable=False)
    target_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
