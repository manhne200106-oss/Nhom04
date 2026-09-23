from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.meeting import MeetingNote
from app.models.user import User
from app.schemas.schemas import MeetingNoteCreate

router = APIRouter()


@router.get("/projects/{project_id}/meeting-notes")
def list_meeting_notes(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    notes = db.query(MeetingNote).filter(MeetingNote.project_id == project_id).order_by(MeetingNote.id.desc()).all()
    return [
        {
            "id": n.id,
            "project_id": n.project_id,
            "raw_content": n.raw_content,
            "generated_minutes": n.generated_minutes or "",
            "created_at": str(n.created_at),
        }
        for n in notes
    ]


@router.post("/projects/{project_id}/meeting-notes")
def create_meeting_note(
    project_id: int,
    req: MeetingNoteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    raw = req.raw_content or req.raw_notes or ""
    gen = req.generated_minutes or req.ai_minutes or ""
    note = MeetingNote(
        project_id=project_id,
        raw_content=raw,
        generated_minutes=gen,
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return {"id": note.id, "message": "Lưu biên bản thành công"}
