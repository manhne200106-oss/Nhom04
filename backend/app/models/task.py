from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    sprint_id = Column(Integer, ForeignKey("sprints.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    title = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    required_skills = Column(String(255), nullable=True)
    status = Column(String(30), default="TODO")
    priority = Column(String(20), default="MEDIUM")
    story_points = Column(Integer, default=0)
    due_date = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")
