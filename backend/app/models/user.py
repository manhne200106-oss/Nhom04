from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    PM = "PM"
    MEMBER = "MEMBER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    skills = Column(String(500), nullable=True)
    role = Column(String(20), default=UserRole.MEMBER)

    projects = relationship("ProjectMember", back_populates="user")
    tasks = relationship("Task", back_populates="assignee")
