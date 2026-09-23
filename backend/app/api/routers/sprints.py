from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.sprint import Sprint
from app.models.user import User
from app.schemas.schemas import SprintCreate
from datetime import datetime

router = APIRouter()


@router.get("/projects/{project_id}/sprints")
def list_sprints(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sprints = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.id).all()
    return [
        {
            "id": s.id,
            "project_id": s.project_id,
            "name": s.name,
            "start_date": str(s.start_date.date()) if s.start_date else None,
            "end_date": str(s.end_date.date()) if s.end_date else None,
        }
        for s in sprints
    ]


@router.post("/projects/{project_id}/sprints")
def create_sprint(
    project_id: int,
    req: SprintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "PM"):
        raise HTTPException(status_code=403, detail="Không có quyền tạo sprint")
    start = datetime.strptime(req.start_date, "%Y-%m-%d") if req.start_date else None
    end = datetime.strptime(req.end_date, "%Y-%m-%d") if req.end_date else None
    sprint = Sprint(project_id=project_id, name=req.name, start_date=start, end_date=end)
    db.add(sprint)
    db.commit()
    db.refresh(sprint)
    return {"id": sprint.id, "name": sprint.name, "message": "Tạo sprint thành công"}


@router.patch("/sprints/{sprint_id}")
def update_sprint(
    sprint_id: int,
    req: SprintCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint không tồn tại")
    sprint.name = req.name
    sprint.start_date = datetime.strptime(req.start_date, "%Y-%m-%d") if req.start_date else None
    sprint.end_date = datetime.strptime(req.end_date, "%Y-%m-%d") if req.end_date else None
    db.commit()
    return {"id": sprint.id, "name": sprint.name, "message": "Cập nhật sprint thành công"}


@router.delete("/sprints/{sprint_id}")
def delete_sprint(sprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role not in ("ADMIN", "PM"):
        raise HTTPException(status_code=403, detail="Không có quyền")
    sprint = db.query(Sprint).filter(Sprint.id == sprint_id).first()
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint không tồn tại")
    db.delete(sprint)
    db.commit()
    return {"message": "Đã xóa sprint"}
