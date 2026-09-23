from pydantic import BaseModel
from typing import Optional, Union, Any
from datetime import datetime

class LoginRequest(BaseModel):
    username: str
    password: str

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    
    class Config:
        orm_mode = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: Optional[str] = "MEDIUM"
    assignee_id: Optional[Union[int, str]] = None
    sprint_id: Optional[Union[int, str]] = None
    story_points: Optional[int] = 0
    due_date: Optional[Union[str, datetime]] = None
    required_skills: Optional[str] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    assignee_id: Optional[Union[int, str]] = None
    sprint_id: Optional[Union[int, str]] = None
    story_points: Optional[int] = None
    due_date: Optional[Union[str, datetime]] = None
    required_skills: Optional[str] = None

class TaskStatusUpdate(BaseModel):
    status: str

class SprintCreate(BaseModel):
    name: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

class MemberAdd(BaseModel):
    user_id: int

class MeetingNoteCreate(BaseModel):
    raw_notes: Optional[str] = None
    raw_content: Optional[str] = None
    ai_minutes: Optional[str] = None
    generated_minutes: Optional[str] = None

class AiSummarizeRequest(BaseModel):
    project_id: int

class AiMeetingRequest(BaseModel):
    project_id: int
    raw_notes: Optional[str] = None
    raw_content: Optional[str] = None

class AiSuggestRequest(BaseModel):
    project_id: int
    task_title: str
    required_skills: Optional[str] = None

class AiChatRequest(BaseModel):
    project_id: int
    message: str
