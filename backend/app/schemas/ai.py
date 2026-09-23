from pydantic import BaseModel
from typing import Optional, List

class SummaryRequest(BaseModel):
    project_id: int
    sprint_id: int

class AssignmentRequest(BaseModel):
    task_id: int

class MeetingNoteCreate(BaseModel):
    project_id: int
    raw_content: str
