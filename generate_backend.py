import os

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')

backend_struct = {
    "backend/requirements.txt": """
fastapi==0.104.0
uvicorn==0.23.2
sqlalchemy==2.0.22
pydantic==2.4.2
pydantic-settings==2.0.3
alembic==1.12.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
google-generativeai==0.2.2
python-dotenv==1.0.0
""",
    "backend/.env.example": """
DATABASE_URL=sqlite:///./sql_app.db
SECRET_KEY=your-secret-key-change-it-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
GEMINI_API_KEY=your-gemini-api-key
""",
    "backend/app/__init__.py": "",
    "backend/app/main.py": """
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import auth, projects, sprints, tasks, ai
from app.core.database import engine, Base

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Project Management AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(projects.router, prefix="/projects", tags=["Projects"])
app.include_router(sprints.router, prefix="/sprints", tags=["Sprints"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(ai.router, prefix="/ai", tags=["AI Engine"])

@app.get("/")
def root():
    return {"message": "Welcome to Project Management AI API"}
""",
    "backend/app/core/config.py": """
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sql_app.db")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secret")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    class Config:
        env_file = ".env"

settings = Settings()
""",
    "backend/app/core/database.py": """
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
    "backend/app/core/security.py": """
from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
""",
    "backend/app/models/user.py": """
from sqlalchemy import Column, Integer, String, Enum
from sqlalchemy.orm import relationship
from app.core.database import Base

class UserRole(str, Enum):
    ADMIN = "ADMIN"
    PM = "PM"
    MEMBER = "MEMBER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    skills = Column(String(500), nullable=True) # JSON string or comma separated
    role = Column(String(20), default=UserRole.MEMBER.value)

    projects = relationship("ProjectMember", back_populates="user")
    tasks = relationship("Task", back_populates="assignee")
""",
    "backend/app/models/project.py": """
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    sprints = relationship("Sprint", back_populates="project", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")

class ProjectMember(Base):
    __tablename__ = "project_members"

    project_id = Column(Integer, ForeignKey("projects.id"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    is_leader = Column(Boolean, default=False)

    project = relationship("Project", back_populates="members")
    user = relationship("User", back_populates="projects")
""",
    "backend/app/models/sprint.py": """
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.core.database import Base

class Sprint(Base):
    __tablename__ = "sprints"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"))
    name = Column(String(255), nullable=False)
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="sprints")
    tasks = relationship("Task", back_populates="sprint")
""",
    "backend/app/models/task.py": """
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
    status = Column(String(30), default="TODO") # TODO, IN_PROGRESS, DONE, OVERDUE
    priority = Column(String(20), default="MEDIUM") # HIGH, MEDIUM, LOW
    due_date = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="tasks")
    sprint = relationship("Sprint", back_populates="tasks")
    assignee = relationship("User", back_populates="tasks")
""",
    "backend/app/models/meeting.py": """
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
""",
    "backend/app/models/__init__.py": """
from app.models.user import User
from app.models.project import Project, ProjectMember
from app.models.sprint import Sprint
from app.models.task import Task
from app.models.meeting import MeetingNote
""",
    "backend/app/services/ai_client.py": """
import google.generativeai as genai
import json
import logging
import time
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class AIClient:
    def __init__(self):
        if settings.GEMINI_API_KEY:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            self.model = genai.GenerativeModel(
                model_name='gemini-1.5-flash',
                generation_config=genai.GenerationConfig(temperature=0.1)
            )
        else:
            self.model = None

    def _call_with_retry(self, prompt: str, retries: int = 3) -> str:
        if not self.model:
            return "Dịch vụ AI chưa được cấu hình. (Thiếu GEMINI_API_KEY)"
        
        for attempt in range(retries):
            try:
                # Assuming timeout is handled via underlying transport or we could implement a manual timeout
                response = self.model.generate_content(prompt, request_options={"timeout": 10.0})
                return response.text
            except Exception as e:
                logger.error(f"AI call failed attempt {attempt + 1}: {str(e)}")
                if attempt == retries - 1:
                    return "Dịch vụ Trợ lý AI đang bận, hệ thống sẽ tự động tính toán thống kê theo công thức mặc định."
                time.sleep(2 ** attempt) # Exponential backoff
        return "Lỗi gọi AI"

    def summarize_progress(self, project_data: dict) -> str:
        prompt = f'''Bạn là trợ lý AI chuyên nghiệp về quản lý dự án nhóm.
Nhiệm vụ của bạn là phân tích dữ liệu tiến độ task, sprint và khối lượng công việc được cung cấp trong biến project_data.

Quy tắc bắt buộc:
- Chỉ nhận xét và lập báo cáo dựa trên chính xác dữ liệu dự án được cung cấp.
- BẤT KỲ THÔNG TIN NÀO KHÔNG CÓ TRONG DỮ LIỆU ĐỀU KHÔNG ĐƯỢC TỰ BỊA ĐẶT HOẶC SUY ĐOÁN SỐ LIỆU.
- Nếu dữ liệu bị thiếu hoặc rỗng, hãy phản hồi rõ: "Dữ liệu dự án chưa đầy đủ để lập báo cáo".

project_data:
{json.dumps(project_data, ensure_ascii=False)}

Hãy xuất ra báo cáo bằng tiếng Việt, dạng Markdown, cấu trúc gồm: Đánh giá chung, Tình hình chi tiết, Gợi ý.
'''
        return self._call_with_retry(prompt)

    def suggest_assignment(self, task_desc: str, req_skills: str, members: list) -> Dict[str, Any]:
        prompt = f'''Bạn là chuyên gia phân bổ nguồn lực. Dựa vào yêu cầu công việc và dữ liệu thành viên được cung cấp dưới dạng JSON, hãy đề xuất 1 người phù hợp nhất. Ưu tiên người có kỹ năng khớp và đang có số lượng Task 'Doing' thấp nhất.

Task cần giao: {task_desc}
Yêu cầu: {req_skills}
Danh sách Member:
{json.dumps(members, ensure_ascii=False)}

Trả về kết quả dưới định dạng JSON (KHÔNG CÓ BACKTICKS HAY TEXT KHÁC) gồm "assignee_id", "assignee_name", và "reason".
'''
        res = self._call_with_retry(prompt)
        try:
            # clean json
            res = res.strip()
            if res.startswith("```json"): res = res[7:]
            if res.startswith("```"): res = res[3:]
            if res.endswith("```"): res = res[:-3]
            return json.loads(res.strip())
        except Exception:
            return {"error": "Không thể parse JSON từ AI", "raw": res}

    def generate_meeting_minutes(self, raw_notes: str) -> str:
        prompt = f'''Bạn là trợ lý AI. Hãy chuyển đổi ghi chú cuộc họp thô sau thành biên bản họp chuẩn cấu trúc (Mục tiêu, Thảo luận, Quyết định, Action Items).
Chỉ dựa trên thông tin được cung cấp, KHÔNG BỊA ĐẶT thêm.

Ghi chú thô:
{raw_notes}
'''
        return self._call_with_retry(prompt)
        
ai_service = AIClient()
""",
    "backend/app/schemas/ai.py": """
from pydantic import BaseModel

class SummaryRequest(BaseModel):
    project_id: int
    sprint_id: int

class AssignmentRequest(BaseModel):
    task_id: int

class MeetingNoteCreate(BaseModel):
    project_id: int
    raw_content: str
""",
    "backend/app/api/routers/ai.py": """
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.ai_client import ai_service
from app.schemas.ai import SummaryRequest, AssignmentRequest, MeetingNoteCreate
from app.models import Task, User, ProjectMember, Sprint, MeetingNote

router = APIRouter()

@router.post("/summarize-progress")
def summarize_progress(req: SummaryRequest, db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.project_id == req.project_id, Task.sprint_id == req.sprint_id).all()
    if not tasks:
        raise HTTPException(status_code=404, detail="No tasks found for this sprint")
    
    project_data = {
        "project_id": req.project_id,
        "sprint_id": req.sprint_id,
        "total_tasks": len(tasks),
        "completed_tasks": sum(1 for t in tasks if t.status == "DONE"),
        "in_progress_tasks": sum(1 for t in tasks if t.status == "IN_PROGRESS"),
        "todo_tasks": sum(1 for t in tasks if t.status == "TODO"),
        "overdue_tasks": sum(1 for t in tasks if t.status == "OVERDUE"),
        "tasks_detail": [{"id": t.id, "title": t.title, "status": t.status, "assignee": t.assignee.username if t.assignee else None} for t in tasks]
    }
    summary = ai_service.summarize_progress(project_data)
    return {"summary": summary}

@router.post("/suggest-assignment")
def suggest_assignment(req: AssignmentRequest, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == req.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    members = db.query(ProjectMember).filter(ProjectMember.project_id == task.project_id).all()
    member_data = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        in_progress = db.query(Task).filter(Task.assignee_id == user.id, Task.status == "IN_PROGRESS").count()
        member_data.append({
            "id": user.id,
            "name": user.username,
            "skills": user.skills,
            "tasks_in_progress": in_progress
        })
        
    suggestion = ai_service.suggest_assignment(task.title + " " + str(task.description), str(task.required_skills), member_data)
    return suggestion

@router.post("/meeting-minutes")
def generate_meeting_minutes(req: MeetingNoteCreate, db: Session = Depends(get_db)):
    minutes = ai_service.generate_meeting_minutes(req.raw_content)
    note = MeetingNote(project_id=req.project_id, raw_content=req.raw_content, generated_minutes=minutes)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note
"""
}

for path, content in backend_struct.items():
    create_file(path, content)

print("Backend scaffolded successfully.")
