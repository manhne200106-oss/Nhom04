from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.task import Task
from app.models.user import User
from app.schemas.schemas import TaskCreate, TaskUpdate, TaskStatusUpdate
from datetime import datetime

router = APIRouter()


def _task_to_dict(task: Task, db: Session) -> dict:
    assignee = db.query(User).filter(User.id == task.assignee_id).first() if task.assignee_id else None
    return {
        "id": task.id,
        "project_id": task.project_id,
        "sprint_id": task.sprint_id,
        "assignee_id": task.assignee_id,
        "assignee_name": assignee.username if assignee else None,
        "title": task.title,
        "description": task.description or "",
        "status": task.status,
        "priority": task.priority,
        "story_points": task.story_points,
        "due_date": str(task.due_date.date()) if task.due_date else None,
        "required_skills": task.required_skills or "",
    }


@router.get("/projects/{project_id}/tasks")
def list_tasks(
    project_id: int,
    status: str = Query(None),
    priority: str = Query(None),
    assignee_id: int = Query(None),
    keyword: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.project_id == project_id)
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if assignee_id:
        query = query.filter(Task.assignee_id == assignee_id)
    if keyword:
        query = query.filter(Task.title.ilike(f"%{keyword}%"))
    tasks = query.order_by(Task.id).all()
    return [_task_to_dict(t, db) for t in tasks]


def _parse_assignee_id(val, db: Session):
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in ("null", "none"):
        return None
    if s.isdigit():
        return int(s)
    u = db.query(User).filter(User.username == s).first()
    if u:
        return u.id
    return None


def _parse_sprint_id(val):
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s.lower() in ("null", "none"):
        return None
    if s.isdigit():
        return int(s)
    return None


def _parse_due_date(val):
    if not val:
        return None
    if isinstance(val, datetime):
        return val
    s = str(val).strip()
    if s == "" or s.lower() in ("null", "none"):
        return None
    date_part = s.split("T")[0].split(" ")[0].strip()
    try:
        return datetime.strptime(date_part, "%Y-%m-%d")
    except Exception:
        try:
            return datetime.fromisoformat(s)
        except Exception:
            return None


@router.post("/projects/{project_id}/tasks")
def create_task(
    project_id: int,
    req: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        if not req.title or not req.title.strip():
            raise HTTPException(status_code=422, detail="Tiêu đề không được để trống")

        assignee_id = _parse_assignee_id(req.assignee_id, db)
        sprint_id = _parse_sprint_id(req.sprint_id)
        due = _parse_due_date(req.due_date)

        task = Task(
            project_id=project_id,
            title=req.title.strip(),
            description=req.description or "",
            priority=req.priority or "MEDIUM",
            assignee_id=assignee_id,
            sprint_id=sprint_id,
            story_points=req.story_points or 0,
            due_date=due,
            required_skills=req.required_skills or "",
        )
        db.add(task)
        db.commit()
        db.refresh(task)
        return _task_to_dict(task, db)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Lỗi tạo task: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi tạo task: {str(e)}")


@router.get("/tasks/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại")
    return _task_to_dict(task, db)


@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: int,
    req: TaskStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task không tồn tại")
        valid = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"]
        if req.status not in valid:
            raise HTTPException(status_code=422, detail=f"Trạng thái không hợp lệ. Cho phép: {valid}")
        task.status = req.status
        db.commit()
        return {"id": task.id, "status": task.status, "message": "Cập nhật trạng thái thành công"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Lỗi cập nhật trạng thái: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật trạng thái: {str(e)}")


@router.patch("/tasks/{task_id}")
def update_task(
    task_id: int,
    req: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task không tồn tại")
        if req.title is not None:
            task.title = req.title.strip()
        if req.description is not None:
            task.description = req.description
        if req.priority is not None:
            task.priority = req.priority
        if req.status is not None:
            task.status = req.status
        if req.assignee_id is not None:
            task.assignee_id = _parse_assignee_id(req.assignee_id, db)
        if req.sprint_id is not None:
            task.sprint_id = _parse_sprint_id(req.sprint_id)
        if req.story_points is not None:
            task.story_points = req.story_points
        if req.due_date is not None:
            task.due_date = _parse_due_date(req.due_date)
        if req.required_skills is not None:
            task.required_skills = req.required_skills
        db.commit()
        db.refresh(task)
        return _task_to_dict(task, db)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Lỗi cập nhật task: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi cập nhật task: {str(e)}")


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task không tồn tại")
    if current_user.role not in ("ADMIN", "PM"):
        raise HTTPException(status_code=403, detail="Không có quyền xóa task")
    db.delete(task)
    db.commit()
    return {"message": "Đã xóa task"}
