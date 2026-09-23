from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas.schemas import MemberAdd

router = APIRouter()


@router.get("/projects/{project_id}/members")
def list_members(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        if user:
            result.append({
                "user_id": user.id,
                "username": user.username,
                "role": user.role,
                "skills": user.skills or "",
                "is_leader": m.is_leader,
            })
    return result


@router.post("/projects/{project_id}/members")
def add_member(
    project_id: int,
    req: MemberAdd,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("ADMIN", "PM"):
        raise HTTPException(status_code=403, detail="Không có quyền thêm thành viên")
    existing = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == req.user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Thành viên đã tồn tại trong dự án")
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    db.add(ProjectMember(project_id=project_id, user_id=req.user_id, is_leader=False))
    db.commit()
    return {"message": "Đã thêm thành viên", "user_id": req.user_id, "username": user.username}
